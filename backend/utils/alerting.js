const crypto = require('crypto');
const logger = require('./logger');

const readPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseCsvSet = (value, fallback = []) => {
    const normalized = String(value || '')
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);

    if (normalized.length > 0) {
        return new Set(normalized);
    }

    return new Set(fallback.map((entry) => entry.toLowerCase()));
};

const nowMs = () => Date.now();

const state = {
    serverErrorEvents: [],
    authFailureEvents: [],
    frontendRuntimeErrorEvents: [],
    lastAlertAt: {}
};

const getConfig = () => ({
    fiveXxThreshold: readPositiveInt(process.env.ALERT_5XX_THRESHOLD, 20),
    fiveXxWindowMs: readPositiveInt(process.env.ALERT_5XX_WINDOW_SECONDS, 300) * 1000,
    authFailureThreshold: readPositiveInt(process.env.ALERT_AUTH_FAILURE_THRESHOLD, 25),
    authFailureWindowMs: readPositiveInt(process.env.ALERT_AUTH_FAILURE_WINDOW_SECONDS, 600) * 1000,
    frontendErrorThreshold: readPositiveInt(process.env.ALERT_FRONTEND_ERROR_THRESHOLD, 10),
    frontendErrorWindowMs: readPositiveInt(process.env.ALERT_FRONTEND_ERROR_WINDOW_SECONDS, 300) * 1000,
    frontendErrorTrackedSeverities: parseCsvSet(process.env.ALERT_FRONTEND_ERROR_SEVERITIES, ['high', 'critical']),
    cooldownMs: readPositiveInt(process.env.ALERT_COOLDOWN_SECONDS, 300) * 1000,
    webhookUrl: (process.env.ALERT_WEBHOOK_URL || '').trim(),
    routingPrimary: (process.env.ALERT_ROUTING_PRIMARY || '').trim(),
    routingSecondary: (process.env.ALERT_ROUTING_SECONDARY || '').trim(),
    routingEscalation: (process.env.ALERT_ROUTING_ESCALATION || '').trim()
});

const pruneEvents = (events, windowMs, now = nowMs()) => {
    while (events.length > 0 && (now - events[0]) > windowMs) {
        events.shift();
    }
};

const canTriggerAlert = (key, threshold, count, cooldownMs, now = nowMs()) => {
    if (count < threshold) return false;
    const last = state.lastAlertAt[key] || 0;
    if ((now - last) < cooldownMs) return false;
    state.lastAlertAt[key] = now;
    return true;
};

const sendWebhookAlert = async (payload) => {
    const { webhookUrl } = getConfig();
    if (!webhookUrl) return;

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        logger.error('alert_webhook_failed', { error: err.message });
    }
};

const deriveAlertSeverity = (type, payload = {}) => {
    if (type === 'server_5xx_rate') {
        return payload.count >= (payload.threshold * 2) ? 'critical' : 'high';
    }

    if (type === 'auth_failure_rate') {
        return payload.count >= (payload.threshold * 2) ? 'high' : 'medium';
    }

    if (type === 'frontend_runtime_error_rate') {
        if (payload.errorSeverity === 'critical') {
            return 'critical';
        }

        return payload.count >= (payload.threshold * 2) ? 'critical' : 'high';
    }

    return 'medium';
};

const emitAlert = (type, payload) => {
    const config = getConfig();

    const alertPayload = {
        alertType: type,
        severity: deriveAlertSeverity(type, payload),
        routing: {
            primary: config.routingPrimary || 'unassigned',
            secondary: config.routingSecondary || undefined,
            escalationPolicy: config.routingEscalation || undefined,
            destination: config.webhookUrl ? 'webhook' : 'logs_only'
        },
        ...payload
    };

    logger.alert('threshold_alert_triggered', alertPayload);
    void sendWebhookAlert(alertPayload);
};

const hashIdentifier = (value) => {
    if (!value) return undefined;
    return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 12);
};

const trackServerError = (details = {}) => {
    const config = getConfig();
    const now = nowMs();
    state.serverErrorEvents.push(now);
    pruneEvents(state.serverErrorEvents, config.fiveXxWindowMs, now);

    const count = state.serverErrorEvents.length;
    if (canTriggerAlert('server_5xx', config.fiveXxThreshold, count, config.cooldownMs, now)) {
        emitAlert('server_5xx_rate', {
            count,
            threshold: config.fiveXxThreshold,
            windowSeconds: Math.round(config.fiveXxWindowMs / 1000),
            route: details.route,
            statusCode: details.statusCode
        });
    }
};

const trackAuthFailure = (details = {}) => {
    const config = getConfig();
    const now = nowMs();
    state.authFailureEvents.push(now);
    pruneEvents(state.authFailureEvents, config.authFailureWindowMs, now);

    const count = state.authFailureEvents.length;
    if (canTriggerAlert('auth_failures', config.authFailureThreshold, count, config.cooldownMs, now)) {
        emitAlert('auth_failure_rate', {
            count,
            threshold: config.authFailureThreshold,
            windowSeconds: Math.round(config.authFailureWindowMs / 1000),
            route: details.route,
            reason: details.reason
        });
    }
};

const trackFrontendRuntimeError = (details = {}) => {
    const config = getConfig();
    const now = nowMs();
    const errorSeverity = String(details.severity || 'medium').toLowerCase();

    if (!config.frontendErrorTrackedSeverities.has(errorSeverity)) {
        return;
    }

    state.frontendRuntimeErrorEvents.push(now);
    pruneEvents(state.frontendRuntimeErrorEvents, config.frontendErrorWindowMs, now);

    const count = state.frontendRuntimeErrorEvents.length;
    if (canTriggerAlert('frontend_runtime_error', config.frontendErrorThreshold, count, config.cooldownMs, now)) {
        emitAlert('frontend_runtime_error_rate', {
            count,
            threshold: config.frontendErrorThreshold,
            windowSeconds: Math.round(config.frontendErrorWindowMs / 1000),
            errorSeverity,
            route: details.route,
            source: details.source
        });
    }
};

const getAlertingConfigSnapshot = () => {
    const config = getConfig();

    return {
        thresholds: {
            fiveXxThreshold: config.fiveXxThreshold,
            fiveXxWindowMs: config.fiveXxWindowMs,
            authFailureThreshold: config.authFailureThreshold,
            authFailureWindowMs: config.authFailureWindowMs,
            frontendErrorThreshold: config.frontendErrorThreshold,
            frontendErrorWindowMs: config.frontendErrorWindowMs,
            cooldownMs: config.cooldownMs
        },
        frontendErrorTrackedSeverities: Array.from(config.frontendErrorTrackedSeverities),
        routing: {
            primary: config.routingPrimary || null,
            secondary: config.routingSecondary || null,
            escalation: config.routingEscalation || null,
            destination: config.webhookUrl ? 'webhook' : 'logs_only'
        }
    };
};

module.exports = {
    trackServerError,
    trackAuthFailure,
    trackFrontendRuntimeError,
    hashIdentifier,
    getAlertingConfigSnapshot
};
