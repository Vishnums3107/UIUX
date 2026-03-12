const LessonAttempt = require('../models/LessonAttempt');
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const ReviewState = require('../models/ReviewState');
const { calculateSkillScore } = require('../utils/skillEngine');
const { getReviewQueueSnapshot, isReviewDue, upsertReviewState } = require('../utils/reviewState');
const { getReviewCompletionStats, recordReviewCompletion } = require('../utils/reviewCompletion');

const ROLLING_WINDOW = 20; // Number of recent attempts to consider for skill calculation
const DEFAULT_REVIEW_LIMIT = 10;
const MAX_REVIEW_LIMIT = 25;

/**
 * POST /api/attempts
 * Submit a lesson attempt, recalculate skill score
 */
const submitAttempt = async (req, res) => {
    try {
        const { lesson_id, time_spent, errors, hints_used, retries, idle_time, score, answer_given } = req.body;
        let previousReviewState = await ReviewState.findOne({ user_id: req.user._id, lesson_id }).lean();

        if (!previousReviewState) {
            await upsertReviewState({ userId: req.user._id, lessonId: lesson_id });
            previousReviewState = await ReviewState.findOne({ user_id: req.user._id, lesson_id }).lean();
        }

        // Validate required fields
        if (!lesson_id || time_spent === undefined || score === undefined) {
            return res.status(400).json({ error: 'lesson_id, time_spent, and score are required.' });
        }

        // Save the attempt
        const attempt = await LessonAttempt.create({
            user_id: req.user._id,
            lesson_id,
            time_spent: Math.max(0, time_spent),
            errors: Math.max(0, errors || 0),
            hints_used: Math.max(0, hints_used || 0),
            retries: Math.max(0, retries || 0),
            idle_time: Math.max(0, idle_time || 0),
            score: score >= 1 ? 1 : 0,
            answer_given: answer_given || ''
        });

        if (score >= 1 && previousReviewState && isReviewDue(previousReviewState)) {
            await recordReviewCompletion({
                userId: req.user._id,
                lessonId: lesson_id,
                attemptId: attempt._id,
                reviewState: previousReviewState
            });
        }

        await upsertReviewState({ userId: req.user._id, lessonId: lesson_id });

        // Fetch recent attempts for skill recalculation
        const recentAttempts = await LessonAttempt.find({ user_id: req.user._id })
            .sort({ createdAt: -1 })
            .limit(ROLLING_WINDOW);

        // Recalculate skill score
        const user = await User.findById(req.user._id);
        const previousScore = user.skill_score;
        const previousLevel = user.level;
        const { skillScore, level, details } = calculateSkillScore(recentAttempts, previousScore);

        // Update user with new skill data
        user.skill_score = skillScore;
        user.updateLevel();
        user.lessons_completed += 1;

        // Streak calculation
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        if (!user.last_activity_date) {
            // First time activity
            user.current_streak = 1;
            user.longest_streak = 1;
        } else {
            const lastActivity = new Date(user.last_activity_date);
            lastActivity.setHours(0, 0, 0, 0);

            const diffTime = Math.abs(today - lastActivity);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Consecutive day
                user.current_streak += 1;
            } else if (diffDays > 1) {
                // Streak broken
                user.current_streak = 1;
            }
            // diffDays === 0 means already active today, streak remains same

            if (user.current_streak > user.longest_streak) {
                user.longest_streak = user.current_streak;
            }
        }

        user.last_activity_date = new Date();

        // Badge Logic (simplified for demonstration)
        const earnedBadges = [];
        const giveBadge = (id, name, icon) => {
            if (!user.badges.some(b => b.id === id)) {
                user.badges.push({ id, name, icon });
                earnedBadges.push({ name, icon });
            }
        };

        if (user.lessons_completed === 1) giveBadge('first_step', 'First Step', '🌱');
        if (user.lessons_completed === 10) giveBadge('novice', 'Novice Learner', '📘');
        if (user.current_streak === 3) giveBadge('streak_3', '3-Day Streak', '🔥');
        if (user.current_streak === 7) giveBadge('streak_7', 'Week Warrior', '⚔️');
        if (user.level === 'Advanced') giveBadge('advanced', 'Tamil Scholar', '🎓');

        await user.save();
        const reviewProgress = await getReviewCompletionStats(req.user._id);

        // Detect level change for reversible adaptation notification
        const levelChanged = previousLevel !== user.level;
        const adaptationDirection = levelChanged
            ? (skillScore < previousScore ? 'downgrade' : 'upgrade')
            : 'none';

        res.status(201).json({
            attempt: {
                id: attempt._id,
                score: attempt.score,
                time_spent: attempt.time_spent
            },
            skillUpdate: {
                skill_score: user.skill_score,
                level: user.level,
                lessons_completed: user.lessons_completed,
                current_streak: user.current_streak,
                new_badges: earnedBadges,
                details,
                levelChanged,
                previousLevel,
                adaptationDirection
            },
            reviewProgress
        });
    } catch (err) {
        console.error('Submit attempt error:', err.message);
        res.status(500).json({ error: 'Failed to submit attempt.' });
    }
};

/**
 * GET /api/attempts/history
 * Get user's attempt history with pagination
 */
const getHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [attempts, total] = await Promise.all([
            LessonAttempt.find({ user_id: req.user._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('lesson_id', 'category difficulty question'),
            LessonAttempt.countDocuments({ user_id: req.user._id })
        ]);

        res.json({
            attempts,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history.' });
    }
};

/**
 * GET /api/attempts/stats
 * Get aggregated stats for the dashboard
 */
const getStats = async (req, res) => {
    try {
        const userId = req.user._id;

        const [totalAttempts, stats, recentTrend] = await Promise.all([
            LessonAttempt.countDocuments({ user_id: userId }),
            LessonAttempt.aggregate([
                { $match: { user_id: userId } },
                {
                    $group: {
                        _id: null,
                        avgScore: { $avg: '$score' },
                        avgTime: { $avg: '$time_spent' },
                        avgErrors: { $avg: '$errors' },
                        avgHints: { $avg: '$hints_used' },
                        totalCorrect: { $sum: '$score' }
                    }
                }
            ]),
            // Get daily performance for last 30 days
            LessonAttempt.aggregate([
                { $match: { user_id: userId, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        avgScore: { $avg: '$score' },
                        count: { $sum: 1 },
                        avgErrors: { $avg: '$errors' }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        res.json({
            totalAttempts,
            summary: stats[0] || { avgScore: 0, avgTime: 0, avgErrors: 0, avgHints: 0, totalCorrect: 0 },
            recentTrend
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
};

/**
 * GET /api/attempts/review-queue
 * Get due lessons using spaced-repetition scheduling
 */
const getReviewQueue = async (req, res) => {
    try {
        const requestedLimit = Number.parseInt(req.query.limit, 10);
        const limit = Number.isFinite(requestedLimit)
            ? Math.min(Math.max(requestedLimit, 1), MAX_REVIEW_LIMIT)
            : DEFAULT_REVIEW_LIMIT;

        const [reviewSnapshot, completionStats] = await Promise.all([
            getReviewQueueSnapshot(req.user._id),
            getReviewCompletionStats(req.user._id)
        ]);
        const { dueSchedules, upcomingSchedules, reviewBuckets, weeklyTimeline } = reviewSnapshot;

        const queuedSchedules = dueSchedules.slice(0, limit);
        const bucketSchedules = Object.values(reviewBuckets)
            .flatMap((bucket) => bucket.items);
        const relevantLessonIds = Array.from(new Set([
            ...queuedSchedules.map((item) => item.lessonId),
            ...bucketSchedules.map((item) => item.lessonId)
        ]));

        const lessons = await Lesson.find({
            _id: { $in: relevantLessonIds }
        });

        const lessonMap = new Map(lessons.map((lesson) => [String(lesson._id), lesson]));
        const items = queuedSchedules
            .map((item) => {
                const lesson = lessonMap.get(item.lessonId);
                if (!lesson) return null;

                return {
                    lesson,
                    stats: item.stats
                };
            })
            .filter(Boolean);

        const hydratedBuckets = Object.fromEntries(Object.entries(reviewBuckets).map(([bucketKey, bucket]) => ([
            bucketKey,
            {
                count: bucket.count,
                items: bucket.items
                    .map((item) => {
                        const lesson = lessonMap.get(item.lessonId);
                        if (!lesson) return null;

                        return {
                            lesson,
                            stats: item.stats
                        };
                    })
                    .filter(Boolean)
            }
        ])));

        res.json({
            total: dueSchedules.length,
            items,
            upcomingCount: upcomingSchedules.length,
            nextDueAt: upcomingSchedules[0]?.stats.dueAt || null,
            reviewBuckets: hydratedBuckets,
            weeklyTimeline,
            completionStats
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch review queue.' });
    }
};

module.exports = { submitAttempt, getHistory, getStats, getReviewQueue };
