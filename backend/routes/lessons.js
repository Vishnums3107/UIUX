const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
    getLessons,
    getLesson,
    getCategorySummary,
    getLessonsByStage,
    getStageProgress,
    getNextLessonByStage,
    createLesson,
    updateLesson,
    deleteLesson
} = require('../controllers/lessonController');
const { auth, adminOnly } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const LESSON_CATEGORIES = ['uyir', 'mei', 'uyir-mei', 'grammar', 'sentences'];
const LESSON_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced', 'beginner', 'intermediate', 'advanced'];
const LESSON_TYPES = ['mcq', 'text'];
const EXERCISE_TYPES = [
    'audio_mcq',
    'image_mcq',
    'text_mcq',
    'trace_type',
    'flashcard',
    'fill_blank',
    'drag_match',
    'sentence_builder',
    'tense_transform',
    'error_spot',
    'dialogue_sequence',
    'role_play_mcq',
    'comprehension_mcq',
    'true_false',
    'translation_input',
    'free_write',
    'speed_round',
    'sequence_order',
    'mastery_test'
];

const validateQuestionsArray = (value) => {
    if (!Array.isArray(value)) {
        throw new Error('questions must be an array');
    }

    value.forEach((question, index) => {
        if (!question || typeof question !== 'object') {
            throw new Error(`questions[${index}] must be an object`);
        }

        if (!String(question.question || '').trim()) {
            throw new Error(`questions[${index}].question is required`);
        }

        if (!Array.isArray(question.options) || question.options.length < 4) {
            throw new Error(`questions[${index}].options must have at least 4 choices`);
        }

        const options = question.options.map((option) => String(option).trim());
        if (options.some((option) => !option)) {
            throw new Error(`questions[${index}].options must contain non-empty strings`);
        }

        const correctAnswer = String(question.correctAnswer || '').trim();
        if (!correctAnswer) {
            throw new Error(`questions[${index}].correctAnswer is required`);
        }

        if (!options.includes(correctAnswer)) {
            throw new Error(`questions[${index}].correctAnswer must match one option`);
        }
    });

    return true;
};

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

const stageNumberValidation = [
    param('stageNumber')
        .isInt({ min: 1, max: 10 })
        .withMessage('stageNumber must be between 1 and 10')
        .toInt(),
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
    body('transliteration').optional().isString().trim(),
    body('tamilScript').optional().isString().trim(),
    body('phonetic').optional().isString().trim(),
    body('audio_url').optional().isString().trim(),
    body('audioKey').optional().isString().trim(),
    body('imageAlt').optional().isString().trim(),
    body('questionType').optional().isString().trim(),
    body('exerciseType')
        .optional()
        .isIn(EXERCISE_TYPES)
        .withMessage(`exerciseType must be one of: ${EXERCISE_TYPES.join(', ')}`),
    body('stage').optional().isInt({ min: 1, max: 10 }).withMessage('stage must be between 1 and 10'),
    body('stageOrder').optional().isInt({ min: 0 }).withMessage('stageOrder must be 0 or higher'),
    body('order').optional().isInt({ min: 0 }).withMessage('order must be 0 or higher'),
    body('dragItems').optional().isArray().withMessage('dragItems must be an array'),
    body('dragTargets').optional().isArray().withMessage('dragTargets must be an array'),
    body('sentenceParts').optional().isArray().withMessage('sentenceParts must be an array'),
    body('correctOrder').optional().isArray().withMessage('correctOrder must be an array'),
    body('passage').optional().isString(),
    body('passageTitle').optional().isString(),
    body('writingPrompt').optional().isString(),
    body('modelAnswer').optional().isString(),
    body('acceptedAnswers').optional().isArray().withMessage('acceptedAnswers must be an array'),
    body('questions').optional().custom(validateQuestionsArray),
    body('isMasteryTest').optional().isBoolean(),
    body('unlocksStage').optional().isInt({ min: 1, max: 10 }),
    body('culturalNote').optional().isString(),
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
    body('transliteration').optional().isString().trim(),
    body('tamilScript').optional().isString().trim(),
    body('phonetic').optional().isString().trim(),
    body('audio_url').optional().isString().trim(),
    body('audioKey').optional().isString().trim(),
    body('imageAlt').optional().isString().trim(),
    body('questionType').optional().isString().trim(),
    body('exerciseType')
        .optional()
        .isIn(EXERCISE_TYPES)
        .withMessage(`exerciseType must be one of: ${EXERCISE_TYPES.join(', ')}`),
    body('stage').optional().isInt({ min: 1, max: 10 }).withMessage('stage must be between 1 and 10'),
    body('stageOrder').optional().isInt({ min: 0 }).withMessage('stageOrder must be 0 or higher'),
    body('order').optional().isInt({ min: 0 }).withMessage('order must be 0 or higher'),
    body('dragItems').optional().isArray().withMessage('dragItems must be an array'),
    body('dragTargets').optional().isArray().withMessage('dragTargets must be an array'),
    body('sentenceParts').optional().isArray().withMessage('sentenceParts must be an array'),
    body('correctOrder').optional().isArray().withMessage('correctOrder must be an array'),
    body('passage').optional().isString(),
    body('passageTitle').optional().isString(),
    body('writingPrompt').optional().isString(),
    body('modelAnswer').optional().isString(),
    body('acceptedAnswers').optional().isArray().withMessage('acceptedAnswers must be an array'),
    body('questions').optional().custom(validateQuestionsArray),
    body('isMasteryTest').optional().isBoolean(),
    body('unlocksStage').optional().isInt({ min: 1, max: 10 }),
    body('culturalNote').optional().isString(),
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
router.get('/stages/progress', auth, getStageProgress);
router.get('/stage/:stageNumber/next', auth, stageNumberValidation, getNextLessonByStage);
router.get('/stage/:stageNumber', auth, stageNumberValidation, getLessonsByStage);
router.get('/:id', auth, lessonIdValidation, getLesson);

// Admin CMS routes
router.post('/', auth, adminOnly, createLessonValidation, createLesson);
router.put('/:id', auth, adminOnly, lessonIdValidation, updateLessonValidation, updateLesson);
router.delete('/:id', auth, adminOnly, lessonIdValidation, deleteLesson);

module.exports = router;
