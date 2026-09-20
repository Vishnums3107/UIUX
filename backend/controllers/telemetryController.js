const logger = require('../utils/logger');
const { trackFrontendRuntimeError, hashIdentifier } = require('../utils/alerting');

const VALID_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

const normalizeSeverity = (severity) => {
    const normalized = String(severity || 'medium').trim().toLowerCase();
    return VALID_SEVERITIES.has(normalized) ? normalized : 'medium';
};

const trimString = (value, maxLength) => {
    if (typeof value !== 'string') return undefined;
    return value.trim().slice(0, maxLength);
};

const sanitizeContext = (context = {}) => {
    if (!context || typeof context !== 'object' || Array.isArray(context)) {
        return {};
    }

    return {
        route: trimString(context.route, 300),
        component: trimString(context.component, 200),
        release: trimString(context.release, 120),
        href: trimString(context.href, 500),
        userAgent: trimString(context.userAgent, 400)
    };
};

const logFrontendRuntimeError = (severity, meta) => {
    if (severity === 'critical') {
        logger.alert('frontend_runtime_error', meta);
        return;
    }

    if (severity === 'high') {
        logger.error('frontend_runtime_error', meta);
        return;
    }

    if (severity === 'medium') {
        logger.warn('frontend_runtime_error', meta);
        return;
    }

    logger.info('frontend_runtime_error', meta);
};

/**
 * POST /api/telemetry/frontend-error
 * Capture frontend runtime error telemetry for observability.
 */
const reportFrontendError = async (req, res) => {
    const severity = normalizeSeverity(req.body.severity);
    const source = trimString(req.body.source, 120) || 'runtime';
    const message = trimString(req.body.message, 1000) || 'Unknown frontend runtime error';
    const stack = trimString(req.body.stack, 8000);
    const context = sanitizeContext(req.body.context);

    const eventMeta = {
        requestId: req.requestId,
        severity,
        source,
        message,
        fingerprint: hashIdentifier(`${source}:${message}`),
        context,
        stack
    };

    logFrontendRuntimeError(severity, eventMeta);

    trackFrontendRuntimeError({
        severity,
        route: context.route,
        source
    });

    return res.status(202).json({ accepted: true });
};

module.exports = {
    reportFrontendError,
    normalizeSeverity,
    sanitizeContext
};