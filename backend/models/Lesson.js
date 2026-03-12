const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        enum: ['uyir', 'mei', 'uyir-mei', 'grammar', 'sentences']
    },
    difficulty: {
        type: String,
        required: true,
        enum: ['Beginner', 'Intermediate', 'Advanced']
    },
    type: {
        type: String,
        required: true,
        enum: ['mcq', 'text']
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
    order: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

lessonSchema.index({ category: 1, difficulty: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
