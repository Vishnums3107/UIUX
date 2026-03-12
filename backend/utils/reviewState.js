const LessonAttempt = require('../models/LessonAttempt');
const ReviewState = require('../models/ReviewState');
const { calculateSpacedReviewSchedule } = require('./spacedRepetition');

const REVIEW_BUCKET_PREVIEW_LIMIT = 3;
const REVIEW_TIMELINE_DAYS = 7;

const sortDueFirst = (a, b) => {
    if (b.priority !== a.priority) {
        return b.priority - a.priority;
    }

    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
};

const sortUpcoming = (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();

const isReviewDue = (reviewState, now = new Date()) => !reviewState.latestAttemptCorrect || now >= new Date(reviewState.dueAt);

const normalizeReviewState = (reviewState, now = new Date()) => {
    const dueAt = new Date(reviewState.dueAt);
    const overdueHours = Math.max(0, (now.getTime() - dueAt.getTime()) / (1000 * 60 * 60));
    const isDue = isReviewDue(reviewState, now);

    return {
        lessonId: String(reviewState.lesson_id),
        stats: {
            attemptCount: reviewState.attemptCount,
            avgScore: reviewState.avgScore,
            avgErrors: reviewState.avgErrors,
            avgHints: reviewState.avgHints,
            consecutiveCorrect: reviewState.consecutiveCorrect,
            lapses: reviewState.lapses,
            easeFactor: reviewState.easeFactor,
            intervalHours: reviewState.intervalHours,
            dueAt,
            isDue,
            overdueHours: Number(overdueHours.toFixed(2)),
            priority: reviewState.priority,
            reason: reviewState.reason,
            lastAttemptedAt: reviewState.lastAttemptedAt,
            latestAttemptCorrect: reviewState.latestAttemptCorrect,
            scheduleVersion: reviewState.scheduleVersion
        }
    };
};

const buildBuckets = (schedules, now = new Date()) => {
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfTomorrow = new Date(now);
    startOfTomorrow.setHours(24, 0, 0, 0);

    const endOfTomorrow = new Date(startOfTomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const buckets = {
        dueNow: { count: 0, items: [] },
        laterToday: { count: 0, items: [] },
        tomorrow: { count: 0, items: [] }
    };

    for (const schedule of schedules) {
        const dueAt = new Date(schedule.stats.dueAt);
        let bucketKey = null;

        if (schedule.stats.isDue) {
            bucketKey = 'dueNow';
        } else if (dueAt <= endOfToday) {
            bucketKey = 'laterToday';
        } else if (dueAt >= startOfTomorrow && dueAt <= endOfTomorrow) {
            bucketKey = 'tomorrow';
        }

        if (!bucketKey) {
            continue;
        }

        buckets[bucketKey].count += 1;
        if (buckets[bucketKey].items.length < REVIEW_BUCKET_PREVIEW_LIMIT) {
            buckets[bucketKey].items.push(schedule);
        }
    }

    return buckets;
};

const buildWeeklyTimeline = (reviewStates, now = new Date()) => {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    return Array.from({ length: REVIEW_TIMELINE_DAYS }, (_, index) => {
        const dayStart = new Date(startOfToday);
        dayStart.setDate(dayStart.getDate() + index);

        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const dueCount = reviewStates.filter((reviewState) => {
            const dueAt = new Date(reviewState.dueAt);

            if (index === 0 && dueAt < dayStart) {
                return true;
            }

            return dueAt >= dayStart && dueAt <= dayEnd;
        }).length;

        return {
            date: dayStart.toISOString(),
            label: index === 0
                ? 'Today'
                : dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
            dueCount
        };
    });
};

const upsertReviewState = async ({ userId, lessonId, attempts }) => {
    const lessonAttempts = attempts || await LessonAttempt.find({
        user_id: userId,
        lesson_id: lessonId
    })
        .sort({ createdAt: -1 })
        .lean();

    if (!lessonAttempts.length) {
        return null;
    }

    const schedule = calculateSpacedReviewSchedule(lessonAttempts);
    if (!schedule) {
        return null;
    }

    return ReviewState.findOneAndUpdate(
        { user_id: userId, lesson_id: lessonId },
        {
            user_id: userId,
            lesson_id: lessonId,
            scheduleVersion: 'sr-v1',
            attemptCount: schedule.attemptCount,
            avgScore: schedule.avgScore,
            avgErrors: schedule.avgErrors,
            avgHints: schedule.avgHints,
            consecutiveCorrect: schedule.consecutiveCorrect,
            lapses: schedule.lapses,
            easeFactor: schedule.easeFactor,
            intervalHours: schedule.intervalHours,
            dueAt: schedule.dueAt,
            priority: schedule.priority,
            reason: schedule.reason,
            lastAttemptedAt: schedule.lastAttemptedAt,
            latestAttemptCorrect: schedule.latestAttemptCorrect
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );
};

const backfillMissingReviewStates = async (userId) => {
    const [attempts, existingStates] = await Promise.all([
        LessonAttempt.find({ user_id: userId }).sort({ createdAt: -1 }).lean(),
        ReviewState.find({ user_id: userId }).select('lesson_id').lean()
    ]);

    const existingLessonIds = new Set(existingStates.map((state) => String(state.lesson_id)));
    const attemptsByLesson = new Map();

    for (const attempt of attempts) {
        const lessonId = String(attempt.lesson_id);
        if (existingLessonIds.has(lessonId)) {
            continue;
        }

        const lessonAttempts = attemptsByLesson.get(lessonId) || [];
        lessonAttempts.push(attempt);
        attemptsByLesson.set(lessonId, lessonAttempts);
    }

    if (attemptsByLesson.size === 0) {
        return;
    }

    await Promise.all(Array.from(attemptsByLesson.entries()).map(([lessonId, lessonAttempts]) => upsertReviewState({
        userId,
        lessonId,
        attempts: lessonAttempts
    })));
};

const getReviewQueueSnapshot = async (userId) => {
    await backfillMissingReviewStates(userId);

    const now = new Date();
    const reviewStates = await ReviewState.find({ user_id: userId }).lean();
    const schedules = reviewStates.map((reviewState) => normalizeReviewState(reviewState, now));

    const dueSchedules = schedules
        .filter((item) => item.stats.isDue)
        .sort((a, b) => sortDueFirst(a.stats, b.stats));

    const upcomingSchedules = schedules
        .filter((item) => !item.stats.isDue)
        .sort((a, b) => sortUpcoming(a.stats, b.stats));

    return {
        dueSchedules,
        upcomingSchedules,
        reviewBuckets: buildBuckets([...dueSchedules, ...upcomingSchedules], now),
        weeklyTimeline: buildWeeklyTimeline(reviewStates, now)
    };
};

module.exports = {
    getReviewQueueSnapshot,
    isReviewDue,
    normalizeReviewState,
    upsertReviewState
};
