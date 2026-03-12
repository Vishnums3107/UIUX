const mongoose = require('mongoose');

const reviewCompletionSchema = new mongoose.Schema({
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
    attempt_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LessonAttempt',
        required: true,
        unique: true
    },
    clearedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    scheduledDueAt: {
        type: Date,
        required: true
    },
    wasOverdue: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

reviewCompletionSchema.index({ user_id: 1, clearedAt: -1 });

module.exports = mongoose.model('ReviewCompletion', reviewCompletionSchema);
