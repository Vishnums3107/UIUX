const crypto = require('crypto');
const logger = require('../utils/logger');
const { trackAuthFailure, trackServerError } = require('../utils/alerting');

const REQUEST_ID_HEADER = 'x-request-id';

const getOrCreateRequestId = (req) => {
    const existing = req.headers[REQUEST_ID_HEADER];
    if (typeof existing === 'string' && existing.trim()) {
        return existing.trim();
    }
    return crypto.randomUUID();
};

const requestLogging = (req, res, next) => {
    const start = process.hrtime.bigint();
    req.requestId = getOrCreateRequestId(req);
    res.setHeader('X-Request-Id', req.requestId);

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        const path = req.originalUrl || req.url;
        const baseMeta = {
            requestId: req.requestId,
            method: req.method,
            path,
            statusCode: res.statusCode,
            durationMs: Number(durationMs.toFixed(2)),
            ip: req.ip,
            userId: req.user?._id?.toString()
        };

        if (res.statusCode >= 500) {
            logger.error('http_request_failed', baseMeta);
            trackServerError({ route: path, statusCode: res.statusCode });
            return;
        }

        if (res.statusCode >= 400) {
            logger.warn('http_request_client_error', baseMeta);
        } else {
            logger.info('http_request', baseMeta);
        }

        if (path.startsWith('/api/auth/login') && (res.statusCode === 401 || res.statusCode === 429)) {
            trackAuthFailure({
                route: '/api/auth/login',
                reason: res.statusCode === 429 ? 'login_throttled' : 'invalid_credentials'
            });
        }
    });

    next();
};

module.exports = {
    requestLogging
};
