const mongoose = require('mongoose');

const reviewStateSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    lesson_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true,
        index: true
    },
    scheduleVersion: {
        type: String,
        default: 'sr-v1'
    },
    attemptCount: {
        type: Number,
        default: 0,
        min: 0
    },
    avgScore: {
        type: Number,
        default: 0
    },
    avgErrors: {
        type: Number,
        default: 0
    },
    avgHints: {
        type: Number,
        default: 0
    },
    consecutiveCorrect: {
        type: Number,
        default: 0,
        min: 0
    },
    lapses: {
        type: Number,
        default: 0,
        min: 0
    },
    easeFactor: {
        type: Number,
        default: 2.5
    },
    intervalHours: {
        type: Number,
        default: 0,
        min: 0
    },
    dueAt: {
        type: Date,
        required: true
    },
    priority: {
        type: Number,
        default: 0
    },
    reason: {
        type: String,
        default: 'scheduled_review_due'
    },
    lastAttemptedAt: {
        type: Date,
        required: true
    },
    latestAttemptCorrect: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

reviewStateSchema.index({ user_id: 1, lesson_id: 1 }, { unique: true });
reviewStateSchema.index({ user_id: 1, dueAt: 1 });

module.exports = mongoose.model('ReviewState', reviewStateSchema);
