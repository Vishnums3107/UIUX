const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const lessonRoutes = require('./routes/lessons');
const attemptRoutes = require('./routes/attempts');
const adminRoutes = require('./routes/admin');
const leaderboardRoutes = require('./routes/leaderboard');
const telemetryRoutes = require('./routes/telemetry');
const ttsRoutes = require('./routes/tts');
const logger = require('./utils/logger');
const { requestLogging } = require('./middleware/requestLogging');
const { getReadinessReport: defaultGetReadinessReport } = require('./utils/readiness');

const parseTrustProxyValue = (value) => {
    if (value === undefined || value === null) {
        return null;
    }

    const normalized = String(value).trim();
    if (!normalized) {
        return null;
    }

    const lower = normalized.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;

    const numeric = Number.parseInt(normalized, 10);
    if (Number.isFinite(numeric) && String(numeric) === normalized) {
        return numeric;
    }

    return normalized;
};

const parseAllowedOrigins = () => {
    const raw = (process.env.FRONTEND_URL || '*')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);

    if (raw.length === 0) return ['*'];
    return raw;
};

const buildCorsOptions = () => {
    const allowedOrigins = parseAllowedOrigins();
    const isProduction = process.env.NODE_ENV === 'production';
    const allowAnyOrigin = allowedOrigins.includes('*');

    if (!isProduction && allowAnyOrigin) {
        return { origin: true, credentials: true };
    }

    return {
        origin: (origin, callback) => {
            // Allow non-browser clients (no Origin header) such as curl/health checks.
            if (!origin) return callback(null, true);

            if (allowAnyOrigin && !isProduction) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error('CORS origin denied'));
        },
        credentials: true
    };
};

function createApp({ getReadinessReport = defaultGetReadinessReport } = {}) {
    const app = express();
    const allowedOrigins = parseAllowedOrigins();
    const trustProxy = parseTrustProxyValue(process.env.TRUST_PROXY);

    if (trustProxy !== null) {
        app.set('trust proxy', trustProxy);
    }

    if (process.env.NODE_ENV === 'production' && allowedOrigins.includes('*')) {
        logger.warn('cors_wildcard_configured_in_production', {
            message: 'Wildcard FRONTEND_URL is blocked in production. Configure exact origins.'
        });
    }

    logger.info('runtime_network_config', {
        environment: process.env.NODE_ENV || 'development',
        corsAllowedOrigins: allowedOrigins,
        trustProxy: trustProxy !== null ? trustProxy : false
    });

    app.disable('x-powered-by');
    app.use(helmet());
    app.use(requestLogging);
    app.use(cors(buildCorsOptions()));
    app.use(express.json({ limit: '10mb' }));

    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 200,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests, please try again later.' }
    });
    app.use('/api/', limiter);

    app.use('/api/auth', authRoutes);
    app.use('/api/lessons', lessonRoutes);
    app.use('/api/attempts', attemptRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/leaderboard', leaderboardRoutes);
    app.use('/api/telemetry', telemetryRoutes);
    app.use('/api/tts', ttsRoutes);

    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.round(process.uptime())
        });
    });

    app.get('/api/readiness', async (req, res) => {
        try {
            const report = await getReadinessReport();
            const statusCode = report.status === 'ready' ? 200 : 503;
            res.status(statusCode).json(report);
        } catch (err) {
            logger.error('readiness_check_failed', {
                requestId: req.requestId,
                error: err.message
            });

            res.status(503).json({
                status: 'not_ready',
                timestamp: new Date().toISOString(),
                checks: {
                    database: { ready: false, state: 'unknown' },
                    email: { ready: false, required: process.env.NODE_ENV === 'production', reason: 'check_failed' }
                }
            });
        }
    });

    app.use((err, req, res, next) => {
        logger.error('unhandled_server_error', {
            requestId: req.requestId,
            path: req.originalUrl || req.url,
            method: req.method,
            error: err.message
        });
        res.status(500).json({ error: 'Internal server error' });
    });

    return app;
}

module.exports = createApp;
