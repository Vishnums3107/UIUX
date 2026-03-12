const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { submitAttempt, getHistory, getStats, getReviewQueue } = require('../controllers/attemptController');
const { auth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const submitAttemptValidation = [
    body('lesson_id').isMongoId().withMessage('lesson_id must be a valid ObjectId'),
    body('time_spent')
        .isFloat({ min: 0, max: 3600 })
        .withMessage('time_spent must be between 0 and 3600 seconds')
        .toFloat(),
    body('errors')
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage('errors must be between 0 and 100')
        .toInt(),
    body('hints_used')
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage('hints_used must be between 0 and 100')
        .toInt(),
    body('retries')
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage('retries must be between 0 and 100')
        .toInt(),
    body('idle_time')
        .optional()
        .isFloat({ min: 0, max: 3600 })
        .withMessage('idle_time must be between 0 and 3600 seconds')
        .toFloat(),
    body('score')
        .isInt({ min: 0, max: 1 })
        .withMessage('score must be 0 or 1')
        .toInt(),
    body('answer_given')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('answer_given must be at most 500 characters')
        .trim(),
    handleValidationErrors
];

const historyQueryValidation = [
    query('page')
        .optional()
        .isInt({ min: 1, max: 100000 })
        .withMessage('page must be a positive integer')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('limit must be between 1 and 100')
        .toInt(),
    handleValidationErrors
];

const reviewQueueQueryValidation = [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 25 })
        .withMessage('limit must be between 1 and 25')
        .toInt(),
    handleValidationErrors
];

router.post('/', auth, submitAttemptValidation, submitAttempt);
router.get('/history', auth, historyQueryValidation, getHistory);
router.get('/stats', auth, getStats);
router.get('/review-queue', auth, reviewQueueQueryValidation, getReviewQueue);

module.exports = router;
