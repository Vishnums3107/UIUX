const User = require('../models/User');
const LessonAttempt = require('../models/LessonAttempt');

/**
 * GET /api/admin/users
 * List all users with basic stats
 */
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({})
            .select('-__v')
            .sort({ createdAt: -1 });

        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
};

/**
 * GET /api/admin/analytics
 * Get platform-wide analytics
 */
const getAnalytics = async (req, res) => {
    try {
        const [userCount, levelDist, avgScores, recentActivity] = await Promise.all([
            User.countDocuments(),
            User.aggregate([
                { $group: { _id: '$level', count: { $sum: 1 } } }
            ]),
            User.aggregate([
                { $group: { _id: null, avgSkill: { $avg: '$skill_score' }, avgLessons: { $avg: '$lessons_completed' } } }
            ]),
            LessonAttempt.aggregate([
                { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        attempts: { $sum: 1 },
                        avgScore: { $avg: '$score' }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        res.json({
            totalUsers: userCount,
            levelDistribution: levelDist,
            averages: avgScores[0] || { _id: null, avgSkill: 0, avgLessons: 0 },
            recentActivity
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch analytics.' });
    }
};

/**
 * GET /api/admin/users/:id/progress
 * Get detailed progress for a specific user
 */
const getUserProgress = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-__v');
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const attempts = await LessonAttempt.find({ user_id: req.params.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('lesson_id', 'category difficulty question');

        res.json({ user, attempts });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user progress.' });
    }
};

module.exports = { getAllUsers, getAnalytics, getUserProgress };
