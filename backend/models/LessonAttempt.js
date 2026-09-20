const mongoose = require('mongoose');

const lessonAttemptSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    lesson_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true
    },
    time_spent: {
        type: Number, // seconds
        required: true,
        min: 0
    },
    errors: {
        type: Number,
        default: 0,
        min: 0
    },
    hints_used: {
        type: Number,
        default: 0,
        min: 0
    },
    retries: {
        type: Number,
        default: 0,
        min: 0
    },
    idle_time: {
        type: Number, // seconds of idle time (30s threshold)
        default: 0,
        min: 0
    },
    score: {
        type: Number, // 0 or 1 (correct or not)
        required: true,
        min: 0,
        max: 1
    },
    answer_given: {
        type: String,
        default: ''
    },
    isMasteryTest: {
        type: Boolean,
        default: false
    },
    stage: {
        type: Number,
        min: 1,
        max: 10
    },
    masteryScore: {
        type: Number,
        min: 0,
        max: 100
    },
    masteryCorrectCount: {
        type: Number,
        min: 0
    },
    masteryQuestionCount: {
        type: Number,
        min: 0
    }
}, { timestamps: true, suppressReservedKeysWarning: true });

// Index for efficient queries
lessonAttemptSchema.index({ user_id: 1, createdAt: -1 });
lessonAttemptSchema.index({ user_id: 1, stage: 1, isMasteryTest: 1, createdAt: -1 });

module.exports = mongoose.model('LessonAttempt', lessonAttemptSchema);
