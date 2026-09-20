const jwt = require('jsonwebtoken');
const { validationResult, body } = require('express-validator');
const crypto = require('crypto');
const User = require('../models/User');
const LessonAttempt = require('../models/LessonAttempt');
const { hasEmailConfig, buildPasswordResetUrl, sendPasswordResetEmail } = require('../utils/email');
const logger = require('../utils/logger');
const { trackAuthFailure, hashIdentifier } = require('../utils/alerting');
const { getJwtSigningSecret } = require('../utils/jwtSecrets');
const {
    buildAdaptiveProfile,
    buildCategoryRecommendations,
    normalizeAdaptivePreferences,
    normalizeAdaptiveProfile
} = require('../utils/adaptiveProfile');
const { buildTopicIntelligence } = require('../utils/topicIntelligence');
const { buildLearningDirector } = require('../utils/learningDirector');

const NON_MASTERY_FILTER = {
    $or: [
        { isMasteryTest: { $exists: false } },
        { isMasteryTest: false }
    ]
};

const ADAPTIVE_ATTEMPT_WINDOW = 60;

const buildStageProgressSnapshot = (user = {}) => {
    const unlockedStages = Array.isArray(user.unlockedStages) && user.unlockedStages.length > 0
        ? [...new Set(user.unlockedStages)]
        : [1];
    const masteryPassedStages = new Set(Array.isArray(user.masteryPassedStages) ? user.masteryPassedStages : []);

    return unlockedStages
        .sort((a, b) => a - b)
        .map((stage) => ({
            stage,
            unlocked: true,
            masteryPassed: masteryPassedStages.has(stage)
        }));
};

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, getJwtSigningSecret(), {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};

const serializeUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    skill_score: user.skill_score,
    level: user.level,
    lessons_completed: user.lessons_completed,
    unlockedStages: user.unlockedStages || [1],
    masteryPassedStages: user.masteryPassedStages || [],
    xp: user.xp || 0,
    totalXP: user.totalXP || 0,
    current_streak: user.current_streak,
    longest_streak: user.longest_streak,
    badges: user.badges,
    avatarId: user.avatarId,
    adaptivePreferences: normalizeAdaptivePreferences(user.adaptivePreferences),
    adaptiveProfile: normalizeAdaptiveProfile(user.adaptiveProfile, user),
    role: user.role,
    createdAt: user.createdAt
});

const BCRYPT_HASH_PATTERN = /^\$2[abxy]?\$\d{2}\$[./A-Za-z0-9]{53}$/;

const hasValidPasswordHash = (hash) => {
    return typeof hash === 'string' && BCRYPT_HASH_PATTERN.test(hash);
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
            user: serializeUser(user)
        });
    } catch (err) {
        if (err?.message === 'JWT_SIGNING_SECRET_MISSING') {
            logger.error('jwt_signing_secret_missing', { requestId: req.requestId });
            return res.status(500).json({ error: 'Authentication is temporarily unavailable.' });
        }

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

        if (!hasValidPasswordHash(user.password)) {
            logger.error('auth_user_password_hash_invalid', {
                requestId: req.requestId,
                userId: user._id,
                emailHash: hashIdentifier(email)
            });
            trackAuthFailure({
                route: '/api/auth/login',
                reason: 'credentials_record_invalid',
                identifierHash: hashIdentifier(email)
            });
            return res.status(401).json({ error: 'Invalid email or password.' });
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
            user: serializeUser(user)
        });
    } catch (err) {
        if (err?.message === 'JWT_SIGNING_SECRET_MISSING') {
            logger.error('jwt_signing_secret_missing', { requestId: req.requestId });
            return res.status(500).json({ error: 'Authentication is temporarily unavailable.' });
        }

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
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json(serializeUser(user));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch profile.' });
    }
};

/**
 * GET /api/auth/adaptive-profile
 * Returns adaptive profile plus category-level recommendations from recent attempts.
 */
const getAdaptiveProfileInsights = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const recentAttempts = await LessonAttempt.find({
            user_id: user._id,
            ...NON_MASTERY_FILTER
        })
            .sort({ createdAt: -1 })
            .limit(ADAPTIVE_ATTEMPT_WINDOW)
            .populate('lesson_id', 'category')
            .lean();

        const adaptiveProfile = normalizeAdaptiveProfile(
            buildAdaptiveProfile({ user, recentAttempts }),
            user
        );

        const categoryRecommendations = buildCategoryRecommendations({
            user,
            recentAttempts
        });

        return res.status(200).json({
            adaptivePreferences: normalizeAdaptivePreferences(user.adaptivePreferences),
            adaptiveProfile,
            categoryRecommendations,
            generatedAt: new Date().toISOString(),
            attemptWindowSize: recentAttempts.length
        });
    } catch (err) {
        logger.error('adaptive_profile_insights_error', {
            requestId: req.requestId,
            error: err.message
        });
        return res.status(500).json({ error: 'Failed to load adaptive profile insights.' });
    }
};

/**
 * GET /api/auth/topic-intelligence
 * Returns topic-level mastery map, stage/category recommendations, and sequencing guidance.
 */
const getTopicIntelligenceInsights = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const recentAttempts = await LessonAttempt.find({
            user_id: user._id,
            ...NON_MASTERY_FILTER
        })
            .sort({ createdAt: -1 })
            .limit(ADAPTIVE_ATTEMPT_WINDOW)
            .populate('lesson_id', 'category stage difficulty')
            .lean();

        const stageProgress = buildStageProgressSnapshot(user);
        const intelligence = buildTopicIntelligence({
            user,
            recentAttempts,
            stageProgress
        });

        return res.status(200).json(intelligence);
    } catch (err) {
        logger.error('topic_intelligence_insights_error', {
            requestId: req.requestId,
            error: err.message
        });
        return res.status(500).json({ error: 'Failed to load topic intelligence insights.' });
    }
};

/**
 * GET /api/auth/learning-director
 * Returns directed session planning and confidence/recovery forecasting.
 */
const getLearningDirectorInsights = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const recentAttempts = await LessonAttempt.find({
            user_id: user._id,
            ...NON_MASTERY_FILTER
        })
            .sort({ createdAt: -1 })
            .limit(ADAPTIVE_ATTEMPT_WINDOW)
            .populate('lesson_id', 'category stage difficulty')
            .lean();

        const stageProgress = buildStageProgressSnapshot(user);
        const topicIntelligence = buildTopicIntelligence({
            user,
            recentAttempts,
            stageProgress
        });

        const learningDirector = buildLearningDirector({
            user,
            recentAttempts,
            stageProgress,
            topicIntelligence
        });

        return res.status(200).json(learningDirector);
    } catch (err) {
        logger.error('learning_director_insights_error', {
            requestId: req.requestId,
            error: err.message
        });
        return res.status(500).json({ error: 'Failed to load learning director insights.' });
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
    body('avatarId').optional().trim().isString(),
    body('adaptivePreferences').optional().isObject().withMessage('adaptivePreferences must be an object'),
    body('adaptivePreferences.modePreference')
        .optional()
        .isIn(['auto', 'support', 'balanced', 'challenge'])
        .withMessage('adaptivePreferences.modePreference must be auto, support, balanced, or challenge'),
    body('adaptivePreferences.immersiveModeDefault')
        .optional()
        .isBoolean()
        .withMessage('adaptivePreferences.immersiveModeDefault must be boolean')
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

        const { name, avatarId, adaptivePreferences } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (name) user.name = name;
        if (avatarId) user.avatarId = avatarId;
        if (adaptivePreferences) {
            user.adaptivePreferences = normalizeAdaptivePreferences({
                ...(user.adaptivePreferences?.toObject?.() || user.adaptivePreferences || {}),
                ...adaptivePreferences
            });
        }

        await user.save();

        res.json(serializeUser(user));
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
            user: serializeUser(user)
        });
    } catch (err) {
        logger.error('reset_password_error', { requestId: req.requestId, error: err.message });
        res.status(500).json({ error: 'Could not reset password' });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    getAdaptiveProfileInsights,
    getTopicIntelligenceInsights,
    getLearningDirectorInsights,
    updateProfile,
    forgotPassword,
    resetPassword,
    registerValidation, loginValidation, updateProfileValidation,
    forgotPasswordValidation, resetPasswordValidation
};
