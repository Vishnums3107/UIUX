const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const { trackAuthFailure } = require('../utils/alerting');

const readPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const buildLimiter = ({ route, windowMinutes, maxRequests, message }) => {
    return rateLimit({
        windowMs: windowMinutes * 60 * 1000,
        max: maxRequests,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger.warn('auth_rate_limit_exceeded', {
                requestId: req.requestId,
                route,
                ip: req.ip
            });

            trackAuthFailure({
                route,
                reason: 'rate_limited'
            });

            res.status(429).json({ error: message });
        }
    });
};

const loginRateLimiter = buildLimiter({
    route: '/api/auth/login',
    windowMinutes: readPositiveInt(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MINUTES, 15),
    maxRequests: readPositiveInt(process.env.AUTH_LOGIN_RATE_LIMIT_MAX, 10),
    message: 'Too many login attempts. Please try again later.'
});

const forgotPasswordRateLimiter = buildLimiter({
    route: '/api/auth/forgotpassword',
    windowMinutes: readPositiveInt(process.env.AUTH_FORGOT_RATE_LIMIT_WINDOW_MINUTES, 15),
    maxRequests: readPositiveInt(process.env.AUTH_FORGOT_RATE_LIMIT_MAX, 6),
    message: 'Too many password reset requests. Please try again later.'
});

const resetPasswordRateLimiter = buildLimiter({
    route: '/api/auth/resetpassword',
    windowMinutes: readPositiveInt(process.env.AUTH_RESET_RATE_LIMIT_WINDOW_MINUTES, 15),
    maxRequests: readPositiveInt(process.env.AUTH_RESET_RATE_LIMIT_MAX, 10),
    message: 'Too many password reset attempts. Please try again later.'
});

module.exports = {
    loginRateLimiter,
    forgotPasswordRateLimiter,
    resetPasswordRateLimiter
};
