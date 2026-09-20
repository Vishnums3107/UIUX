const LessonAttempt = require('../models/LessonAttempt');
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const ReviewState = require('../models/ReviewState');
const { calculateSkillScore } = require('../utils/skillEngine');
const { buildAdaptiveProfile } = require('../utils/adaptiveProfile');
const { buildCategoryMasteryMap, buildReviewPriorityMap } = require('../utils/topicIntelligence');
const { getReviewQueueSnapshot, isReviewDue, upsertReviewState } = require('../utils/reviewState');
const { getReviewCompletionStats, recordReviewCompletion } = require('../utils/reviewCompletion');

const ROLLING_WINDOW = 20;
const DEFAULT_REVIEW_LIMIT = 10;
const MAX_REVIEW_LIMIT = 25;

const STREAK_BADGES = [
    { days: 7, id: 'streak_7', name: '7-Day Streak', icon: '🔥' },
    { days: 30, id: 'streak_30', name: '30-Day Streak', icon: '🏅' },
    { days: 100, id: 'streak_100', name: '100-Day Streak', icon: '👑' }
];

const ADAPTIVE_ATTEMPT_WINDOW = 60;

const isNonMasteryFilter = {
    $or: [
        { isMasteryTest: { $exists: false } },
        { isMasteryTest: false }
    ]
};

const addBadge = (user, earnedBadges, id, name, icon) => {
    if (!user.badges.some((badge) => badge.id === id)) {
        user.badges.push({ id, name, icon });
        earnedBadges.push({ id, name, icon });
        return true;
    }
    return false;
};

const awardXP = (user, amount) => {
    if (!amount || amount <= 0) return 0;
    user.xp = (user.xp || 0) + amount;
    user.totalXP = (user.totalXP || 0) + amount;
    return amount;
};

const normalizeDay = (date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
};

const updateStreak = (user) => {
    const today = normalizeDay(new Date());

    if (!user.last_activity_date) {
        user.current_streak = 1;
        user.longest_streak = Math.max(user.longest_streak || 0, 1);
        user.last_activity_date = new Date();
        return;
    }

    const lastActivity = normalizeDay(user.last_activity_date);
    const diffMs = today.getTime() - lastActivity.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        user.current_streak += 1;
    } else if (diffDays > 1) {
        user.current_streak = 1;
    }

    if (user.current_streak > user.longest_streak) {
        user.longest_streak = user.current_streak;
    }

    user.last_activity_date = new Date();
};

const awardStageCompletion = async ({ user, lesson, userId, earnedBadges }) => {
    if (!lesson?.stage || lesson.isMasteryTest) return 0;

    const stageLessons = await Lesson.find({
        stage: lesson.stage,
        ...isNonMasteryFilter
    }).select('_id');

    if (stageLessons.length === 0) return 0;

    const stageLessonIds = stageLessons.map((item) => item._id);
    const passedLessonIds = await LessonAttempt.distinct('lesson_id', {
        user_id: userId,
        score: 1,
        ...isNonMasteryFilter,
        lesson_id: { $in: stageLessonIds }
    });

    if (passedLessonIds.length !== stageLessons.length) return 0;

    const badgeId = `stage_complete_${lesson.stage}`;
    const awarded = addBadge(
        user,
        earnedBadges,
        badgeId,
        `Stage ${lesson.stage} Complete`,
        '🏆'
    );

    if (!awarded) return 0;
    return awardXP(user, 50);
};

/**
 * POST /api/attempts
 * Submit a lesson attempt, recalculate skill score, update XP/badges.
 */
const submitAttempt = async (req, res) => {
    try {
        const {
            lesson_id,
            time_spent,
            errors,
            hints_used,
            retries,
            idle_time,
            score,
            answer_given
        } = req.body;

        if (!lesson_id || time_spent === undefined || score === undefined) {
            return res.status(400).json({ error: 'lesson_id, time_spent, and score are required.' });
        }

        const lesson = await Lesson.findById(lesson_id);
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found.' });
        }

        let previousReviewState = await ReviewState.findOne({
            user_id: req.user._id,
            lesson_id
        }).lean();

        if (!previousReviewState) {
            await upsertReviewState({ userId: req.user._id, lessonId: lesson_id });
            previousReviewState = await ReviewState.findOne({
                user_id: req.user._id,
                lesson_id
            }).lean();
        }

        const normalizedScore = score >= 1 ? 1 : 0;
        const wasAlreadyPassed = normalizedScore === 1
            ? await LessonAttempt.exists({
                user_id: req.user._id,
                lesson_id,
                score: 1,
                ...isNonMasteryFilter
            })
            : true;
        const isFirstPass = normalizedScore === 1 && !wasAlreadyPassed;

        const attempt = await LessonAttempt.create({
            user_id: req.user._id,
            lesson_id,
            time_spent: Math.max(0, time_spent),
            errors: Math.max(0, errors || 0),
            hints_used: Math.max(0, hints_used || 0),
            retries: Math.max(0, retries || 0),
            idle_time: Math.max(0, idle_time || 0),
            score: normalizedScore,
            answer_given: answer_given || '',
            isMasteryTest: false,
            stage: lesson.stage
        });

        if (normalizedScore === 1 && previousReviewState && isReviewDue(previousReviewState)) {
            await recordReviewCompletion({
                userId: req.user._id,
                lessonId: lesson_id,
                attemptId: attempt._id,
                reviewState: previousReviewState
            });
        }

        await upsertReviewState({ userId: req.user._id, lessonId: lesson_id });

        const recentAttempts = await LessonAttempt.find({
            user_id: req.user._id,
            ...isNonMasteryFilter
        })
            .sort({ createdAt: -1 })
            .limit(ROLLING_WINDOW);

        const user = await User.findById(req.user._id);
        const previousScore = user.skill_score;
        const previousLevel = user.level;
        const { skillScore, details } = calculateSkillScore(recentAttempts, previousScore);

        user.skill_score = skillScore;
        user.updateLevel();
        user.adaptiveProfile = buildAdaptiveProfile({
            user,
            skillDetails: details,
            recentAttempts
        });

        const earnedBadges = [];
        let xpEarned = 0;

        if (isFirstPass) {
            user.lessons_completed += 1;
            xpEarned += awardXP(user, 10);

            if (user.lessons_completed === 1) {
                addBadge(user, earnedBadges, 'first_step', 'First Step', '🌱');
            }
            if (user.lessons_completed === 10) {
                addBadge(user, earnedBadges, 'novice', 'Novice Learner', '📘');
            }

            xpEarned += await awardStageCompletion({
                user,
                lesson,
                userId: req.user._id,
                earnedBadges
            });
        }

        updateStreak(user);

        STREAK_BADGES.forEach(({ days, id, name, icon }) => {
            if (user.current_streak >= days) {
                addBadge(user, earnedBadges, id, name, icon);
            }
        });

        if (user.level === 'Advanced') {
            addBadge(user, earnedBadges, 'advanced', 'Tamil Scholar', '🎓');
        }

        await user.save();
        const reviewProgress = await getReviewCompletionStats(req.user._id);

        const levelChanged = previousLevel !== user.level;
        const adaptationDirection = levelChanged
            ? (skillScore < previousScore ? 'downgrade' : 'upgrade')
            : 'none';

        return res.status(201).json({
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
                longest_streak: user.longest_streak,
                xp: user.xp || 0,
                totalXP: user.totalXP || 0,
                xpEarned,
                unlockedStages: user.unlockedStages || [1],
                masteryPassedStages: user.masteryPassedStages || [],
                new_badges: earnedBadges,
                adaptiveProfile: user.adaptiveProfile,
                details,
                levelChanged,
                previousLevel,
                adaptationDirection
            },
            reviewProgress
        });
    } catch (err) {
        console.error('Submit attempt error:', err.message);
        return res.status(500).json({ error: 'Failed to submit attempt.' });
    }
};

/**
 * POST /api/attempts/mastery
 * Submit stage mastery result and unlock next stage on pass.
 */
const submitMastery = async (req, res) => {
    try {
        const {
            stageNumber,
            scorePercent,
            correctCount,
            totalQuestions,
            timeSpent,
            errors,
            hintsUsed,
            questions
        } = req.body;

        const user = await User.findById(req.user._id);
        const passed = scorePercent >= 70;

        if (stageNumber > 1 && !(user.masteryPassedStages || []).includes(stageNumber - 1)) {
            return res.status(403).json({
                error: `Stage ${stageNumber} mastery is locked.`,
                requiredMasteryStage: stageNumber - 1
            });
        }

        let masteryLesson = await Lesson.findOne({
            isMasteryTest: true,
            unlocksStage: stageNumber + 1
        }).sort({ stageOrder: 1, order: 1 });

        if (!masteryLesson) {
            masteryLesson = await Lesson.findOne({ stage: stageNumber }).sort({ stageOrder: 1, order: 1 });
        }

        if (!masteryLesson) {
            return res.status(400).json({ error: 'No lesson available to record mastery attempt.' });
        }

        const attempt = await LessonAttempt.create({
            user_id: user._id,
            lesson_id: masteryLesson._id,
            time_spent: Math.max(0, timeSpent || 0),
            errors: Math.max(0, errors || 0),
            hints_used: Math.max(0, hintsUsed || 0),
            retries: 0,
            idle_time: 0,
            score: passed ? 1 : 0,
            answer_given: `mastery:${scorePercent}`,
            isMasteryTest: true,
            stage: stageNumber,
            masteryScore: scorePercent,
            masteryCorrectCount: correctCount,
            masteryQuestionCount: totalQuestions
        });

        const earnedBadges = [];
        let unlockedStage = null;
        let xpEarned = 0;

        if (passed) {
            const alreadyPassed = (user.masteryPassedStages || []).includes(stageNumber);
            if (!alreadyPassed) {
                user.masteryPassedStages.push(stageNumber);
                xpEarned += awardXP(user, 200);
                addBadge(
                    user,
                    earnedBadges,
                    `mastery_stage_${stageNumber}`,
                    `Mastery Stage ${stageNumber}`,
                    '🏅'
                );
            }

            if (stageNumber < 10) {
                unlockedStage = stageNumber + 1;
                user.unlockedStages = Array.isArray(user.unlockedStages) ? user.unlockedStages : [1];
                if (!user.unlockedStages.includes(unlockedStage)) {
                    user.unlockedStages.push(unlockedStage);
                }
            }

            if (stageNumber === 10) {
                addBadge(user, earnedBadges, 'fluency_certificate', 'Tamil Fluency Certificate', '📜');
            }
        }

        await user.save();

        return res.status(201).json({
            passed,
            score: scorePercent,
            unlockedStage,
            attemptId: attempt._id,
            mastery: {
                stageNumber,
                correctCount,
                totalQuestions,
                questions: Array.isArray(questions) ? questions : []
            },
            user: {
                xp: user.xp || 0,
                totalXP: user.totalXP || 0,
                xpEarned,
                unlockedStages: user.unlockedStages || [1],
                masteryPassedStages: user.masteryPassedStages || []
            },
            newBadges: earnedBadges
        });
    } catch (err) {
        console.error('Submit mastery error:', err.message);
        return res.status(500).json({ error: 'Failed to submit mastery test.' });
    }
};
/**
 * GET /api/attempts/history
 * Get user's attempt history with pagination
 */
const getHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const skip = (page - 1) * limit;

        const [attempts, total] = await Promise.all([
            LessonAttempt.find({ user_id: req.user._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('lesson_id', 'category difficulty question stage stageOrder exerciseType isMasteryTest'),
            LessonAttempt.countDocuments({ user_id: req.user._id })
        ]);

        return res.json({
            attempts,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch history.' });
    }
};

/**
 * GET /api/attempts/stats
 * Get aggregated stats for the dashboard.
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
            LessonAttempt.aggregate([
                { $match: { user_id: userId, createdAt: { $gte: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)) } } },
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

        return res.json({
            totalAttempts,
            summary: stats[0] || { _id: null, avgScore: 0, avgTime: 0, avgErrors: 0, avgHints: 0, totalCorrect: 0 },
            recentTrend
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch stats.' });
    }
};

/**
 * GET /api/attempts/review-queue
 * Get due lessons using spaced-repetition scheduling.
 */
const getReviewQueue = async (req, res) => {
    try {
        const requestedLimit = Number.parseInt(req.query.limit, 10);
        const limit = Number.isFinite(requestedLimit)
            ? Math.min(Math.max(requestedLimit, 1), MAX_REVIEW_LIMIT)
            : DEFAULT_REVIEW_LIMIT;

        const [reviewSnapshot, completionStats, recentAttempts] = await Promise.all([
            getReviewQueueSnapshot(req.user._id),
            getReviewCompletionStats(req.user._id),
            LessonAttempt.find({
                user_id: req.user._id,
                ...isNonMasteryFilter
            })
                .sort({ createdAt: -1 })
                .limit(ADAPTIVE_ATTEMPT_WINDOW)
                .populate('lesson_id', 'category')
                .lean()
        ]);
        const { dueSchedules, upcomingSchedules, reviewBuckets, weeklyTimeline } = reviewSnapshot;

        const categoryMasteryMap = buildCategoryMasteryMap({
            user: req.user,
            recentAttempts
        });
        const reviewPriorityByCategory = buildReviewPriorityMap({ categoryMasteryMap });

        const bucketSchedules = Object.values(reviewBuckets).flatMap((bucket) => bucket.items);
        const relevantLessonIds = Array.from(new Set([
            ...dueSchedules.map((item) => item.lessonId),
            ...bucketSchedules.map((item) => item.lessonId)
        ]));

        const lessons = await Lesson.find({
            _id: { $in: relevantLessonIds }
        });

        const lessonMap = new Map(lessons.map((lesson) => [String(lesson._id), lesson]));
        const prioritizedDueSchedules = dueSchedules
            .map((item) => {
                const lesson = lessonMap.get(item.lessonId);
                const topicBoost = lesson ? (reviewPriorityByCategory[lesson.category] || 0) : 0;
                const queuePriority = item.stats.priority + topicBoost;

                return {
                    ...item,
                    stats: {
                        ...item.stats,
                        topicBoost,
                        queuePriority
                    }
                };
            })
            .sort((left, right) => {
                if (right.stats.queuePriority !== left.stats.queuePriority) {
                    return right.stats.queuePriority - left.stats.queuePriority;
                }

                return new Date(left.stats.dueAt).getTime() - new Date(right.stats.dueAt).getTime();
            });

        const prioritizedDueScheduleMap = new Map(
            prioritizedDueSchedules.map((item) => [item.lessonId, item])
        );
        const queuedSchedules = prioritizedDueSchedules.slice(0, limit);

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

                        const prioritizedSchedule = prioritizedDueScheduleMap.get(item.lessonId);

                        return {
                            lesson,
                            stats: prioritizedSchedule?.stats || item.stats
                        };
                    })
                    .filter(Boolean)
                    .sort((left, right) => {
                        if (bucketKey !== 'dueNow') {
                            return new Date(left.stats.dueAt).getTime() - new Date(right.stats.dueAt).getTime();
                        }

                        const leftPriority = Number(left.stats.queuePriority ?? left.stats.priority ?? 0);
                        const rightPriority = Number(right.stats.queuePriority ?? right.stats.priority ?? 0);
                        if (rightPriority !== leftPriority) {
                            return rightPriority - leftPriority;
                        }

                        return new Date(left.stats.dueAt).getTime() - new Date(right.stats.dueAt).getTime();
                    })
            }
        ])));

        return res.json({
            total: dueSchedules.length,
            items,
            upcomingCount: upcomingSchedules.length,
            nextDueAt: upcomingSchedules[0]?.stats.dueAt || null,
            reviewBuckets: hydratedBuckets,
            weeklyTimeline,
            completionStats
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch review queue.' });
    }
};

module.exports = {
    submitAttempt,
    submitMastery,
    getHistory,
    getStats,
    getReviewQueue
};
