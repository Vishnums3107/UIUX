const Lesson = require('../models/Lesson');

/**
 * GET /api/lessons
 * Get lessons filtered by difficulty and/or category
 */
const getLessons = async (req, res) => {
    try {
        const { difficulty, category } = req.query;
        const filter = {};

        if (difficulty) filter.difficulty = difficulty;
        if (category) filter.category = category;

        const lessons = await Lesson.find(filter).sort({ category: 1, order: 1 });
        res.json(lessons);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lessons.' });
    }
};

/**
 * GET /api/lessons/:id
 * Get a single lesson
 */
const getLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found.' });
        }
        res.json(lesson);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lesson.' });
    }
};

/**
 * GET /api/lessons/categories/summary
 * Get summary of available categories and counts
 */
const getCategorySummary = async (req, res) => {
    try {
        const summary = await Lesson.aggregate([
            {
                $group: {
                    _id: { category: '$category', difficulty: '$difficulty' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.category': 1, '_id.difficulty': 1 } }
        ]);
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch summary.' });
    }
};

/**
 * POST /api/lessons
 * Create a new lesson (Admin only)
 */
const createLesson = async (req, res) => {
    try {
        const lesson = new Lesson(req.body);
        const savedLesson = await lesson.save();
        res.status(201).json(savedLesson);
    } catch (err) {
        res.status(400).json({ error: err.message || 'Failed to create lesson.' });
    }
};

/**
 * PUT /api/lessons/:id
 * Update an existing lesson (Admin only)
 */
const updateLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found.' });
        }
        res.json(lesson);
    } catch (err) {
        res.status(400).json({ error: err.message || 'Failed to update lesson.' });
    }
};

/**
 * DELETE /api/lessons/:id
 * Delete a lesson (Admin only)
 */
const deleteLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findByIdAndDelete(req.params.id);
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found.' });
        }
        res.json({ message: 'Lesson deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete lesson.' });
    }
};

module.exports = {
    getLessons,
    getLesson,
    getCategorySummary,
    createLesson,
    updateLesson,
    deleteLesson
};
