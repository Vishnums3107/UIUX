const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TELEMETRY_ENDPOINT = `${API_BASE}/telemetry/frontend-error`;

let globalHandlersInstalled = false;

const LOW_SEVERITY_PATTERNS = [
    'resizeobserver loop limit exceeded'
];

const HIGH_SEVERITY_PATTERNS = [
    'chunkloaderror',
    'loading chunk',
    'script error',
    'failed to fetch dynamically imported module',
    'unhandled promise rejection'
];

const CRITICAL_SEVERITY_PATTERNS = [
    'out of memory',
    'maximum call stack size exceeded'
];

const trimString = (value, maxLength) => {
    if (typeof value !== 'string') return undefined;
    return value.trim().slice(0, maxLength);
};

const toMessage = (errorLike) => {
    if (typeof errorLike === 'string') {
        return errorLike;
    }

    if (errorLike instanceof Error) {
        return errorLike.message || errorLike.name || 'Unknown error';
    }

    if (errorLike && typeof errorLike === 'object') {
        if (typeof errorLike.message === 'string') return errorLike.message;
        if (typeof errorLike.reason === 'string') return errorLike.reason;
    }

    return 'Unknown frontend runtime error';
};

export const mapRuntimeErrorSeverity = (message, source = '') => {
    const normalized = `${message || ''} ${source || ''}`.toLowerCase();

    if (CRITICAL_SEVERITY_PATTERNS.some((pattern) => normalized.includes(pattern))) {
        return 'critical';
    }

    if (HIGH_SEVERITY_PATTERNS.some((pattern) => normalized.includes(pattern))) {
        return 'high';
    }

    if (LOW_SEVERITY_PATTERNS.some((pattern) => normalized.includes(pattern))) {
        return 'low';
    }

    return 'medium';
};

export const buildRuntimeErrorPayload = (errorLike, options = {}) => {
    const source = trimString(options.source || 'runtime', 120) || 'runtime';
    const message = trimString(options.message || toMessage(errorLike), 1000);
    if (!message) return null;

    if (message.includes('/telemetry/frontend-error')) {
        return null;
    }

    const stack = trimString(
        options.stack || (errorLike instanceof Error ? errorLike.stack : undefined),
        8000
    );

    const severity = ['low', 'medium', 'high', 'critical'].includes(options.severity)
        ? options.severity
        : mapRuntimeErrorSeverity(message, source);

    return {
        message,
        source,
        severity,
        stack,
        context: {
            route: trimString(options.route || window.location.pathname, 300),
            href: trimString(options.href || window.location.href, 500),
            component: trimString(options.component, 200),
            release: trimString(options.release || import.meta.env.VITE_APP_RELEASE, 120),
            userAgent: trimString(navigator.userAgent, 400)
        }
    };
};

const sendViaBeacon = (payload) => {
    if (typeof navigator.sendBeacon !== 'function' || typeof window.Blob === 'undefined') {
        return false;
    }

    try {
        const blob = new window.Blob([JSON.stringify(payload)], { type: 'application/json' });
        return navigator.sendBeacon(TELEMETRY_ENDPOINT, blob);
    } catch {
        return false;
    }
};

const sendViaFetch = async (payload) => {
    await window.fetch(TELEMETRY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
    });
};

export const captureRuntimeError = (errorLike, options = {}) => {
    const payload = buildRuntimeErrorPayload(errorLike, options);
    if (!payload) return;

    if (sendViaBeacon(payload)) {
        return;
    }

    void sendViaFetch(payload).catch(() => {
        // Never throw from telemetry path.
    });
};

export const installGlobalErrorTracking = () => {
    if (typeof window === 'undefined' || globalHandlersInstalled) {
        return () => {};
    }

    const onWindowError = (event) => {
        captureRuntimeError(event.error || event.message || 'window.error', {
            source: 'window.error'
        });
    };

    const onUnhandledRejection = (event) => {
        const reason = event.reason instanceof Error
            ? event.reason
            : new Error(typeof event.reason === 'string' ? event.reason : 'Unhandled promise rejection');

        captureRuntimeError(reason, {
            source: 'window.unhandledrejection',
            severity: 'high'
        });
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    globalHandlersInstalled = true;

    return () => {
        window.removeEventListener('error', onWindowError);
        window.removeEventListener('unhandledrejection', onUnhandledRejection);
        globalHandlersInstalled = false;
    };
};