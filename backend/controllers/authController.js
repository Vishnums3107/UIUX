const jwt = require('jsonwebtoken');
const { validationResult, body } = require('express-validator');
const crypto = require('crypto');
const User = require('../models/User');
const { hasEmailConfig, buildPasswordResetUrl, sendPasswordResetEmail } = require('../utils/email');
const logger = require('../utils/logger');
const { trackAuthFailure, hashIdentifier } = require('../utils/alerting');

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};

const readPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isLockoutEnabled = () => {
    if (process.env.AUTH_LOCKOUT_ENABLED === undefined) return true;
    return String(process.env.AUTH_LOCKOUT_ENABLED).toLowerCase() === 'true';
};

const getLockoutMaxAttempts = () => readPositiveInt(process.env.AUTH_LOCKOUT_MAX_ATTEMPTS, 5);
const getLockoutDurationMs = () => readPositiveInt(process.env.AUTH_LOCKOUT_MINUTES, 15) * 60 * 1000;

const isAccountLocked = (user) => {
    if (!user?.lock_until) return false;
    return user.lock_until.getTime() > Date.now();
};

const clearLoginLockState = async (user) => {
    if (!user) return;
    if (!user.failed_login_attempts && !user.lock_until) return;

    user.failed_login_attempts = 0;
    user.lock_until = undefined;
    await user.save({ validateBeforeSave: false });
};

const registerFailedLogin = async (user) => {
    if (!user || !isLockoutEnabled()) return false;

    user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
    const maxAttempts = getLockoutMaxAttempts();

    if (user.failed_login_attempts >= maxAttempts) {
        user.failed_login_attempts = 0;
        user.lock_until = new Date(Date.now() + getLockoutDurationMs());
        await user.save({ validateBeforeSave: false });
        return true;
    }

    await user.save({ validateBeforeSave: false });
    return false;
};

/**
 * POST /api/auth/register
 * Register a new user
 */
const register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered.' });
        }

        // Create user
        const user = await User.create({ name, email, password });

        const token = generateToken(user._id);

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                skill_score: user.skill_score,
                level: user.level,
                lessons_completed: user.lessons_completed,
                current_streak: user.current_streak,
                longest_streak: user.longest_streak,
                badges: user.badges,
                avatarId: user.avatarId,
                role: user.role
            }
        });
    } catch (err) {
        logger.error('register_error', { requestId: req.requestId, error: err.message });
        res.status(500).json({ error: 'Registration failed.' });
    }
};

/**
 * POST /api/auth/login
 * Login and return JWT
 */
const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password +failed_login_attempts +lock_until');
        if (!user) {
            trackAuthFailure({
                route: '/api/auth/login',
                reason: 'invalid_credentials',
                identifierHash: hashIdentifier(email)
            });
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (isAccountLocked(user)) {
            trackAuthFailure({
                route: '/api/auth/login',
                reason: 'account_locked',
                identifierHash: hashIdentifier(email)
            });
            return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            const lockTriggered = await registerFailedLogin(user);

            trackAuthFailure({
                route: '/api/auth/login',
                reason: lockTriggered ? 'lockout_triggered' : 'invalid_credentials',
                identifierHash: hashIdentifier(email)
            });

            if (lockTriggered) {
                return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
            }

            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        await clearLoginLockState(user);
        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                skill_score: user.skill_score,
                level: user.level,
                lessons_completed: user.lessons_completed,
                current_streak: user.current_streak,
                longest_streak: user.longest_streak,
                badges: user.badges,
                avatarId: user.avatarId,
                role: user.role
            }
        });
    } catch (err) {
        logger.error('login_error', { requestId: req.requestId, error: err.message });
        res.status(500).json({ error: 'Login failed.' });
    }
};

/**
 * GET /api/auth/profile
 * Get current user profile
 */
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            skill_score: user.skill_score,
            level: user.level,
            lessons_completed: user.lessons_completed,
            current_streak: user.current_streak,
            longest_streak: user.longest_streak,
            badges: user.badges,
            avatarId: user.avatarId,
            role: user.role,
            createdAt: user.createdAt
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch profile.' });
    }
};

// Validation rules
const registerValidation = [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
];

const updateProfileValidation = [
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('avatarId').optional().trim().isString()
];

const forgotPasswordValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required')
];

const resetPasswordValidation = [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

/**
 * PUT /api/auth/profile
 * Update current user profile
 */
const updateProfile = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, avatarId } = req.body;
        const updates = {};
        if (name) updates.name = name;
        if (avatarId) updates.avatarId = avatarId;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            skill_score: user.skill_score,
            level: user.level,
            lessons_completed: user.lessons_completed,
            current_streak: user.current_streak,
            longest_streak: user.longest_streak,
            badges: user.badges,
            avatarId: user.avatarId,
            role: user.role,
            createdAt: user.createdAt
        });
    } catch (err) {
        logger.error('update_profile_error', { requestId: req.requestId, error: err.message });
        res.status(500).json({ error: 'Failed to update profile.' });
    }
};

/**
 * POST /api/auth/forgotpassword
 * Generate reset token and return it.
 */
const forgotPassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction && !hasEmailConfig()) {
            // Fail closed consistently in production when email transport is unavailable.
            return res.status(500).json({ error: 'Password reset is temporarily unavailable.' });
        }

        const { email } = req.body;
        const user = await User.findOne({ email });
        const genericMessage = 'If an account with that email exists, a reset link has been sent.';

        // Do not reveal whether an account exists for this email.
        if (!user) {
            return res.status(200).json({
                success: true,
                message: genericMessage
            });
        }

        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });
        const resetUrl = buildPasswordResetUrl(resetToken);

        const responsePayload = {
            success: true,
            message: genericMessage
        };

        const emailResult = await sendPasswordResetEmail({
            to: user.email,
            name: user.name,
            resetUrl
        });

        if (!emailResult.sent) {
            // Dev-only helper when no email transport is configured.
            responsePayload.resetToken = resetToken;
        }

        res.status(200).json(responsePayload);
    } catch (err) {
        logger.error('forgot_password_error', { requestId: req.requestId, error: err.message });
        res.status(500).json({ error: 'Unable to process password reset request.' });
    }
};

/**
 * PUT /api/auth/resetpassword/:resettoken
 * Reset password using the token
 */
const resetPassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resettoken)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatarId: user.avatarId,
                role: user.role
            }
        });
    } catch (err) {
        logger.error('reset_password_error', { requestId: req.requestId, error: err.message });
        res.status(500).json({ error: 'Could not reset password' });
    }
};

module.exports = {
    register, login, getProfile, updateProfile, forgotPassword, resetPassword,
    registerValidation, loginValidation, updateProfileValidation,
    forgotPasswordValidation, resetPasswordValidation
};
