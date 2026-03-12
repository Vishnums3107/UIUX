const HOUR_MS = 60 * 60 * 1000;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const average = (values) => {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const calculateLatestQuality = (attempt) => {
    if (!attempt) return 0;
    if (attempt.score < 1) return 1;

    let quality = 5;
    if ((attempt.time_spent || 0) > 45) quality -= 1;
    if ((attempt.errors || 0) > 0) quality -= 1;
    if ((attempt.hints_used || 0) > 0) quality -= 1;

    return clamp(quality, 2, 5);
};

const getConsecutiveCorrect = (attempts) => {
    let streak = 0;
    for (const attempt of attempts) {
        if (attempt.score < 1) break;
        streak += 1;
    }
    return streak;
};

const calculateIntervalHours = ({ latestAttempt, consecutiveCorrect, easeFactor, avgErrors, avgHints, lapses }) => {
    if (!latestAttempt || latestAttempt.score < 1) {
        return 0;
    }

    if (consecutiveCorrect <= 1) {
        return clamp(8 * easeFactor, 4, 24);
    }

    if (consecutiveCorrect === 2) {
        return clamp(24 * easeFactor, 12, 72);
    }

    if (consecutiveCorrect === 3) {
        return clamp(72 * easeFactor, 24, 168);
    }

    const maturityGrowth = Math.pow(easeFactor, consecutiveCorrect - 3);
    const baseIntervalHours = 168 * maturityGrowth;
    const penaltyMultiplier = clamp(1 - (avgErrors * 0.08) - (avgHints * 0.1) - (lapses * 0.04), 0.35, 1);

    return clamp(baseIntervalHours * penaltyMultiplier, 24, 24 * 45);
};

const calculateSpacedReviewSchedule = (attempts, now = new Date()) => {
    if (!attempts.length) {
        return null;
    }

    const sortedAttempts = [...attempts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latestAttempt = sortedAttempts[0];
    const lapses = sortedAttempts.filter((attempt) => attempt.score < 1).length;
    const consecutiveCorrect = getConsecutiveCorrect(sortedAttempts);
    const avgErrors = average(sortedAttempts.map((attempt) => attempt.errors || 0));
    const avgHints = average(sortedAttempts.map((attempt) => attempt.hints_used || 0));
    const avgScore = average(sortedAttempts.map((attempt) => attempt.score || 0));
    const latestQuality = calculateLatestQuality(latestAttempt);
    const easeFactor = clamp(
        2.5 + ((latestQuality - 3) * 0.15) - (lapses * 0.08) - (avgHints * 0.05) - (avgErrors * 0.04),
        1.3,
        2.8
    );
    const intervalHours = calculateIntervalHours({
        latestAttempt,
        consecutiveCorrect,
        easeFactor,
        avgErrors,
        avgHints,
        lapses
    });
    const dueAt = intervalHours === 0
        ? new Date(latestAttempt.createdAt)
        : new Date(new Date(latestAttempt.createdAt).getTime() + (intervalHours * HOUR_MS));
    const overdueHours = Math.max(0, (now.getTime() - dueAt.getTime()) / HOUR_MS);
    const isDue = latestAttempt.score < 1 || now >= dueAt;

    const reason = latestAttempt.score < 1
        ? 'last_attempt_incorrect'
        : avgHints >= 1
            ? 'hint_heavy_lesson'
            : avgErrors >= 1
                ? 'error_prone_lesson'
                : 'scheduled_review_due';

    const priority = latestAttempt.score < 1
        ? 100 + (lapses * 3) + avgErrors + avgHints
        : (overdueHours * 2) + (lapses * 2) + ((1 - avgScore) * 10);

    return {
        attemptCount: sortedAttempts.length,
        avgScore: Number(avgScore.toFixed(2)),
        avgErrors: Number(avgErrors.toFixed(2)),
        avgHints: Number(avgHints.toFixed(2)),
        consecutiveCorrect,
        lapses,
        easeFactor: Number(easeFactor.toFixed(2)),
        intervalHours: Number(intervalHours.toFixed(2)),
        dueAt,
        isDue,
        overdueHours: Number(overdueHours.toFixed(2)),
        priority: Number(priority.toFixed(2)),
        reason,
        lastAttemptedAt: latestAttempt.createdAt,
        latestAttemptCorrect: latestAttempt.score >= 1
    };
};

module.exports = {
    calculateSpacedReviewSchedule
};
