const ReviewCompletion = require('../models/ReviewCompletion');

const toDayKey = (date) => {
    const normalized = new Date(date);
    const year = normalized.getFullYear();
    const month = String(normalized.getMonth() + 1).padStart(2, '0');
    const day = String(normalized.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const recordReviewCompletion = async ({ userId, lessonId, attemptId, reviewState, clearedAt = new Date() }) => {
    const dueAt = new Date(reviewState.dueAt);

    return ReviewCompletion.findOneAndUpdate(
        { attempt_id: attemptId },
        {
            user_id: userId,
            lesson_id: lessonId,
            attempt_id: attemptId,
            clearedAt,
            scheduledDueAt: dueAt,
            wasOverdue: clearedAt > dueAt
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );
};

const calculateCurrentStreak = (sortedDayKeys, todayKey) => {
    if (!sortedDayKeys.length || sortedDayKeys[0] !== todayKey) {
        return 0;
    }

    let streak = 1;
    let previousDate = new Date(`${sortedDayKeys[0]}T00:00:00`);

    for (let index = 1; index < sortedDayKeys.length; index += 1) {
        const currentDate = new Date(`${sortedDayKeys[index]}T00:00:00`);
        const diffDays = Math.round((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays !== 1) {
            break;
        }

        streak += 1;
        previousDate = currentDate;
    }

    return streak;
};

const calculateLongestStreak = (sortedDayKeys) => {
    if (!sortedDayKeys.length) {
        return 0;
    }

    let longest = 1;
    let current = 1;

    for (let index = 1; index < sortedDayKeys.length; index += 1) {
        const previousDate = new Date(`${sortedDayKeys[index - 1]}T00:00:00`);
        const currentDate = new Date(`${sortedDayKeys[index]}T00:00:00`);
        const diffDays = Math.round((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            current += 1;
            longest = Math.max(longest, current);
        } else {
            current = 1;
        }
    }

    return longest;
};

const getReviewCompletionStats = async (userId, now = new Date()) => {
    const completions = await ReviewCompletion.find({ user_id: userId })
        .sort({ clearedAt: -1 })
        .lean();

    const todayKey = toDayKey(now);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const clearedToday = completions.filter((completion) => new Date(completion.clearedAt) >= todayStart).length;
    const uniqueDayKeys = Array.from(new Set(completions.map((completion) => toDayKey(completion.clearedAt))));

    return {
        clearedToday,
        currentStreak: calculateCurrentStreak(uniqueDayKeys, todayKey),
        longestStreak: calculateLongestStreak(uniqueDayKeys),
        lastClearedAt: completions[0]?.clearedAt || null
    };
};

module.exports = {
    getReviewCompletionStats,
    recordReviewCompletion
};
