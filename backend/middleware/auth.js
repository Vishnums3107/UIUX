const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { getJwtVerificationSecrets } = require('../utils/jwtSecrets');

const verifyTokenWithRotation = (token) => {
    const verificationSecrets = getJwtVerificationSecrets();
    let lastError = null;

    for (const secret of verificationSecrets) {
        try {
            return jwt.verify(token, secret);
        } catch (err) {
            lastError = err;
            if (err?.name === 'TokenExpiredError') {
                throw err;
            }
        }
    }

    throw lastError || new Error('TOKEN_VERIFICATION_FAILED');
};

/**
 * JWT Authentication Middleware
 * Verifies token and attaches user to request
 */
const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyTokenWithRotation(token);

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found.' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err?.message === 'JWT_SIGNING_SECRET_MISSING') {
            logger.error('jwt_signing_secret_missing', { requestId: req.requestId });
            return res.status(500).json({ error: 'Authentication configuration error.' });
        }

        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired.' });
        }
        return res.status(401).json({ error: 'Invalid token.' });
    }
};

/**
 * Admin role check middleware
 */
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
};

module.exports = { auth, adminOnly };
