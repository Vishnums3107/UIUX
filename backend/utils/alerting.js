const crypto = require('crypto');
const logger = require('./logger');

const readPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const nowMs = () => Date.now();

const state = {
    serverErrorEvents: [],
    authFailureEvents: [],
    lastAlertAt: {}
};

const getConfig = () => ({
    fiveXxThreshold: readPositiveInt(process.env.ALERT_5XX_THRESHOLD, 20),
    fiveXxWindowMs: readPositiveInt(process.env.ALERT_5XX_WINDOW_SECONDS, 300) * 1000,
    authFailureThreshold: readPositiveInt(process.env.ALERT_AUTH_FAILURE_THRESHOLD, 25),
    authFailureWindowMs: readPositiveInt(process.env.ALERT_AUTH_FAILURE_WINDOW_SECONDS, 600) * 1000,
    cooldownMs: readPositiveInt(process.env.ALERT_COOLDOWN_SECONDS, 300) * 1000,
    webhookUrl: (process.env.ALERT_WEBHOOK_URL || '').trim()
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

const emitAlert = (type, payload) => {
    const alertPayload = {
        alertType: type,
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

module.exports = {
    trackServerError,
    trackAuthFailure,
    hashIdentifier
};
