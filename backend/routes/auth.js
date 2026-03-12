const express = require('express');
const router = express.Router();
const {
    register, login, getProfile, updateProfile, forgotPassword, resetPassword,
    registerValidation, loginValidation, updateProfileValidation, forgotPasswordValidation, resetPasswordValidation
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const {
    loginRateLimiter,
    forgotPasswordRateLimiter,
    resetPasswordRateLimiter
} = require('../middleware/rateLimiters');

router.post('/register', registerValidation, register);
router.post('/login', loginRateLimiter, loginValidation, login);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfileValidation, updateProfile);
router.post('/forgotpassword', forgotPasswordRateLimiter, forgotPasswordValidation, forgotPassword);
router.put('/resetpassword/:resettoken', resetPasswordRateLimiter, resetPasswordValidation, resetPassword);

module.exports = router;
