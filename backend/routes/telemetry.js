const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { reportFrontendError } = require('../controllers/telemetryController');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

const readPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const telemetryRateLimiter = rateLimit({
    windowMs: readPositiveInt(process.env.FRONTEND_TELEMETRY_RATE_LIMIT_WINDOW_MINUTES, 5) * 60 * 1000,
    max: readPositiveInt(process.env.FRONTEND_TELEMETRY_RATE_LIMIT_MAX, 60),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many telemetry events. Please retry later.' }
});

const frontendErrorValidation = [
    body('message')
        .isString()
        .isLength({ min: 1, max: 1000 })
        .withMessage('message must be between 1 and 1000 characters')
        .trim(),
    body('severity')
        .optional()
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('severity must be one of low, medium, high, critical'),
    body('source')
        .optional()
        .isString()
        .isLength({ max: 120 })
        .withMessage('source must be at most 120 characters')
        .trim(),
    body('stack')
        .optional()
        .isString()
        .isLength({ max: 8000 })
        .withMessage('stack must be at most 8000 characters'),
    body('context')
        .optional()
        .isObject()
        .withMessage('context must be an object'),
    body('context.route')
        .optional()
        .isString()
        .isLength({ max: 300 })
        .withMessage('context.route must be at most 300 characters')
        .trim(),
    body('context.component')
        .optional()
        .isString()
        .isLength({ max: 200 })
        .withMessage('context.component must be at most 200 characters')
        .trim(),
    body('context.release')
        .optional()
        .isString()
        .isLength({ max: 120 })
        .withMessage('context.release must be at most 120 characters')
        .trim(),
    body('context.href')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('context.href must be at most 500 characters')
        .trim(),
    body('context.userAgent')
        .optional()
        .isString()
        .isLength({ max: 400 })
        .withMessage('context.userAgent must be at most 400 characters')
        .trim(),
    handleValidationErrors
];

router.post('/frontend-error', telemetryRateLimiter, frontendErrorValidation, reportFrontendError);

module.exports = router;