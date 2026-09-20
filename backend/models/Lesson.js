const mongoose = require('mongoose');

const LESSON_CATEGORIES = ['uyir', 'mei', 'uyir-mei', 'grammar', 'sentences'];
const LEGACY_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
const DIFFICULTY_NORMALIZATION = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced'
};
const LEGACY_TYPES = ['mcq', 'text'];
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

const normalizeDifficulty = (value) => {
    if (!value) return value;
    const normalized = DIFFICULTY_NORMALIZATION[String(value).trim().toLowerCase()];
    return normalized || value;
};

const normalizeLegacyType = (questionType = '') => {
    const mcqTypes = new Set([
        'audio_mcq',
        'image_mcq',
        'text_mcq',
        'role_play_mcq',
        'comprehension_mcq',
        'true_false'
    ]);
    return mcqTypes.has(questionType) ? 'mcq' : 'text';
};

const lessonSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        enum: LESSON_CATEGORIES
    },
    difficulty: {
        type: String,
        required: true,
        enum: LEGACY_DIFFICULTIES
    },
    type: {
        type: String,
        required: true,
        enum: LEGACY_TYPES
    },
    questionType: {
        type: String,
        default: ''
    },
    question: {
        type: String,
        required: true
    },
    question_tamil: {
        type: String,
        default: ''
    },
    options: [{
        type: String
    }],
    audio_url: {
        type: String, // Path to pronunciation audio file
    },
    correct_answer: {
        type: String,
        required: true
    },
    hint: {
        type: String,
        default: ''
    },
    explanation: {
        type: String,
        default: ''
    },
    transliteration: {
        type: String,
        default: ''
    },
    tamilScript: {
        type: String,
        default: ''
    },
    phonetic: {
        type: String,
        default: ''
    },
    correctAnswer: {
        type: String,
        default: ''
    },
    stage: {
        type: Number,
        min: 1,
        max: 10
    },
    stageOrder: {
        type: Number,
        default: 0,
        min: 0
    },
    exerciseType: {
        type: String,
        enum: EXERCISE_TYPES,
        default: 'text_mcq'
    },
    audioKey: {
        type: String,
        default: ''
    },
    imageAlt: {
        type: String,
        default: ''
    },
    dragItems: [{
        type: String
    }],
    dragTargets: [{
        type: String
    }],
    sentenceParts: [{
        type: String
    }],
    correctOrder: [{
        type: Number
    }],
    passage: {
        type: String,
        default: ''
    },
    passageTitle: {
        type: String,
        default: ''
    },
    writingPrompt: {
        type: String,
        default: ''
    },
    modelAnswer: {
        type: String,
        default: ''
    },
    acceptedAnswers: [{
        type: String
    }],
    questions: [{
        question: {
            type: String,
            default: ''
        },
        questionTamil: {
            type: String,
            default: ''
        },
        options: [{
            type: String
        }],
        correctAnswer: {
            type: String,
            default: ''
        },
        exerciseType: {
            type: String,
            default: 'text_mcq'
        },
        transliteration: {
            type: String,
            default: ''
        }
    }],
    isMasteryTest: {
        type: Boolean,
        default: false
    },
    unlocksStage: {
        type: Number,
        min: 1,
        max: 10
    },
    culturalNote: {
        type: String,
        default: ''
    },
    order: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

lessonSchema.pre('validate', function normalizeCompatFields(next) {
    this.difficulty = normalizeDifficulty(this.difficulty);

    if (this.correctAnswer && !this.correct_answer) {
        this.correct_answer = this.correctAnswer;
    }
    if (this.correct_answer && !this.correctAnswer) {
        this.correctAnswer = this.correct_answer;
    }

    if (this.modelAnswer) {
        if (!this.correctAnswer) this.correctAnswer = this.modelAnswer;
        if (!this.correct_answer) this.correct_answer = this.modelAnswer;
    }

    if (this.audioKey && !this.audio_url) {
        this.audio_url = this.audioKey;
    }
    if (this.audio_url && !this.audioKey) {
        this.audioKey = this.audio_url;
    }

    if (!this.type && this.questionType) {
        this.type = normalizeLegacyType(this.questionType);
    }
    if (!this.questionType && this.type) {
        this.questionType = this.type === 'mcq' ? 'text_mcq' : 'translation_input';
    }

    if (this.stageOrder === undefined || this.stageOrder === null) {
        this.stageOrder = this.order || 0;
    }
    if (this.order === undefined || this.order === null) {
        this.order = this.stageOrder || 0;
    }

    this.dragItems = Array.isArray(this.dragItems) ? this.dragItems : [];
    this.dragTargets = Array.isArray(this.dragTargets) ? this.dragTargets : [];
    this.sentenceParts = Array.isArray(this.sentenceParts) ? this.sentenceParts : [];
    this.correctOrder = Array.isArray(this.correctOrder) ? this.correctOrder : [];
    this.acceptedAnswers = Array.isArray(this.acceptedAnswers) ? this.acceptedAnswers : [];
    this.questions = Array.isArray(this.questions) ? this.questions : [];
    this.questions = this.questions.map((question) => ({
        question: String(question?.question || ''),
        questionTamil: String(question?.questionTamil || ''),
        options: Array.isArray(question?.options) ? question.options.map((option) => String(option)) : [],
        correctAnswer: String(question?.correctAnswer || ''),
        exerciseType: String(question?.exerciseType || 'text_mcq'),
        transliteration: String(question?.transliteration || '')
    }));

    next();
});

lessonSchema.index({ category: 1, difficulty: 1, order: 1 });
lessonSchema.index({ stage: 1, stageOrder: 1 });
lessonSchema.index({ stage: 1, isMasteryTest: 1, unlocksStage: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
