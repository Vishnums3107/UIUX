const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { getAllUsers, getAnalytics, getUserProgress } = require('../controllers/adminController');
const { auth, adminOnly } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const userIdValidation = [
    param('id').isMongoId().withMessage('Invalid user id'),
    handleValidationErrors
];

router.get('/users', auth, adminOnly, getAllUsers);
router.get('/analytics', auth, adminOnly, getAnalytics);
router.get('/users/:id/progress', auth, adminOnly, userIdValidation, getUserProgress);

module.exports = router;
