const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
    getLessons,
    getLesson,
    getCategorySummary,
    createLesson,
    updateLesson,
    deleteLesson
} = require('../controllers/lessonController');
const { auth, adminOnly } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const LESSON_CATEGORIES = ['uyir', 'mei', 'uyir-mei', 'grammar', 'sentences'];
const LESSON_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
const LESSON_TYPES = ['mcq', 'text'];

const lessonQueryValidation = [
    query('difficulty')
        .optional()
        .isIn(LESSON_DIFFICULTIES)
        .withMessage(`difficulty must be one of: ${LESSON_DIFFICULTIES.join(', ')}`),
    query('category')
        .optional()
        .isIn(LESSON_CATEGORIES)
        .withMessage(`category must be one of: ${LESSON_CATEGORIES.join(', ')}`),
    handleValidationErrors
];

const lessonIdValidation = [
    param('id').isMongoId().withMessage('Invalid lesson id'),
    handleValidationErrors
];

const createLessonValidation = [
    body('category')
        .trim()
        .isIn(LESSON_CATEGORIES)
        .withMessage(`category must be one of: ${LESSON_CATEGORIES.join(', ')}`),
    body('difficulty')
        .trim()
        .isIn(LESSON_DIFFICULTIES)
        .withMessage(`difficulty must be one of: ${LESSON_DIFFICULTIES.join(', ')}`),
    body('type')
        .trim()
        .isIn(LESSON_TYPES)
        .withMessage(`type must be one of: ${LESSON_TYPES.join(', ')}`),
    body('question').trim().notEmpty().withMessage('question is required'),
    body('question_tamil').optional().isString().trim(),
    body('correct_answer').trim().notEmpty().withMessage('correct_answer is required'),
    body('hint').optional().isString().trim(),
    body('explanation').optional().isString().trim(),
    body('audio_url').optional().isString().trim(),
    body('order').optional().isInt({ min: 0 }).withMessage('order must be 0 or higher'),
    body('options').custom((value, { req }) => {
        if (req.body.type !== 'mcq') return true;
        if (!Array.isArray(value) || value.length < 2) {
            throw new Error('options must have at least 2 values for mcq lessons');
        }

        const cleaned = value.map(option => (typeof option === 'string' ? option.trim() : ''));
        if (cleaned.some(option => !option)) {
            throw new Error('options must contain non-empty strings');
        }

        if (!cleaned.includes((req.body.correct_answer || '').trim())) {
            throw new Error('correct_answer must match one of the options for mcq lessons');
        }

        return true;
    }),
    handleValidationErrors
];

const updateLessonValidation = [
    body().custom(value => {
        if (!value || Object.keys(value).length === 0) {
            throw new Error('At least one field is required for update');
        }
        return true;
    }),
    body('category')
        .optional()
        .trim()
        .isIn(LESSON_CATEGORIES)
        .withMessage(`category must be one of: ${LESSON_CATEGORIES.join(', ')}`),
    body('difficulty')
        .optional()
        .trim()
        .isIn(LESSON_DIFFICULTIES)
        .withMessage(`difficulty must be one of: ${LESSON_DIFFICULTIES.join(', ')}`),
    body('type')
        .optional()
        .trim()
        .isIn(LESSON_TYPES)
        .withMessage(`type must be one of: ${LESSON_TYPES.join(', ')}`),
    body('question').optional().trim().notEmpty().withMessage('question cannot be empty'),
    body('question_tamil').optional().isString().trim(),
    body('correct_answer').optional().trim().notEmpty().withMessage('correct_answer cannot be empty'),
    body('hint').optional().isString().trim(),
    body('explanation').optional().isString().trim(),
    body('audio_url').optional().isString().trim(),
    body('order').optional().isInt({ min: 0 }).withMessage('order must be 0 or higher'),
    body('options').optional().custom(value => {
        if (!Array.isArray(value) || value.length < 2) {
            throw new Error('options must have at least 2 values');
        }

        const cleaned = value.map(option => (typeof option === 'string' ? option.trim() : ''));
        if (cleaned.some(option => !option)) {
            throw new Error('options must contain non-empty strings');
        }

        return true;
    }),
    body('correct_answer').optional().custom((value, { req }) => {
        if (Array.isArray(req.body.options)) {
            const cleaned = req.body.options.map(option => (typeof option === 'string' ? option.trim() : ''));
            if (!cleaned.includes(value.trim())) {
                throw new Error('correct_answer must match one of the provided options');
            }
        }
        return true;
    }),
    handleValidationErrors
];

// Public/User routes
router.get('/', auth, lessonQueryValidation, getLessons);
router.get('/categories', auth, getCategorySummary);
router.get('/:id', auth, lessonIdValidation, getLesson);

// Admin CMS routes
router.post('/', auth, adminOnly, createLessonValidation, createLesson);
router.put('/:id', auth, adminOnly, lessonIdValidation, updateLessonValidation, updateLesson);
router.delete('/:id', auth, adminOnly, lessonIdValidation, deleteLesson);

module.exports = router;
