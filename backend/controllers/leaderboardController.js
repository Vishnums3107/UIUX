const User = require('../models/User');

/**
 * GET /api/leaderboard
 * Get top users sorted by skill_score (desc) and current_streak (desc)
 */
const getLeaderboard = async (req, res) => {
    try {
        // Fetch top 50 users based on score, then streak
        const topUsers = await User.find({})
            .select('name skill_score level current_streak badges') // Only send necessary public info
            .sort({ skill_score: -1, current_streak: -1 }) // Highest score first, then highest streak
            .limit(50);

        res.json(topUsers);
    } catch (err) {
        console.error('Leaderboard fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch leaderboard.' });
    }
};

module.exports = {
    getLeaderboard
};
