const MAX_SAMPLE_SIZE = 20;
const CATEGORY_RECOMMENDATION_LIMIT = 5;
const CATEGORY_ORDER = ['uyir', 'mei', 'uyir-mei', 'grammar', 'sentences'];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const difficultyScale = ['Beginner', 'Intermediate', 'Advanced'];
const difficultyIndexMap = {
    Beginner: 0,
    Intermediate: 1,
    Advanced: 2
};

const shiftDifficulty = (difficulty = 'Intermediate', delta = 0) => {
    const currentIndex = difficultyIndexMap[difficulty] ?? 1;
    return difficultyScale[clamp(currentIndex + delta, 0, difficultyScale.length - 1)];
};

const safeRound = (value) => Math.round(clamp(Number(value) || 0, 0, 100));

const toFiniteNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const toFixedNumber = (value, digits = 2) => Number(toFiniteNumber(value).toFixed(digits));

const getBaselineMode = ({ level = 'Intermediate', skillScore = 50 } = {}) => {
    if (level === 'Beginner' || skillScore <= 35) return 'support';
    if (level === 'Advanced' || skillScore >= 78) return 'challenge';
    return 'balanced';
};

function getDefaultAdaptivePreferences(overrides = {}) {
    return {
        modePreference: 'auto',
        immersiveModeDefault: false,
        ...overrides
    };
}

function getDefaultAdaptiveProfile(user = {}, overrides = {}) {
    const skillScore = Number(user?.skill_score) || 50;
    const level = user?.level || (skillScore <= 30 ? 'Beginner' : skillScore <= 70 ? 'Intermediate' : 'Advanced');
    const recommendedMode = getBaselineMode({ level, skillScore });

    return {
        recommendedMode,
        recommendedDifficulty: level,
        supportNeed: recommendedMode === 'support' ? 62 : 36,
        challengeReadiness: recommendedMode === 'challenge' ? 74 : 44,
        stabilityScore: 55,
        confidenceScore: 0,
        lastUpdatedAt: null,
        ...overrides
    };
}

function normalizeAdaptivePreferences(preferences = {}) {
    const allowedModes = ['auto', 'support', 'balanced', 'challenge'];
    const modePreference = allowedModes.includes(preferences?.modePreference)
        ? preferences.modePreference
        : 'auto';

    return getDefaultAdaptivePreferences({
        modePreference,
        immersiveModeDefault: Boolean(preferences?.immersiveModeDefault)
    });
}

function normalizeAdaptiveProfile(profile = {}, user = {}) {
    const defaults = getDefaultAdaptiveProfile(user);
    const allowedModes = ['support', 'balanced', 'challenge'];
    const allowedDifficulties = ['Beginner', 'Intermediate', 'Advanced'];

    return {
        recommendedMode: allowedModes.includes(profile?.recommendedMode)
            ? profile.recommendedMode
            : defaults.recommendedMode,
        recommendedDifficulty: allowedDifficulties.includes(profile?.recommendedDifficulty)
            ? profile.recommendedDifficulty
            : defaults.recommendedDifficulty,
        supportNeed: safeRound(profile?.supportNeed ?? defaults.supportNeed),
        challengeReadiness: safeRound(profile?.challengeReadiness ?? defaults.challengeReadiness),
        stabilityScore: safeRound(profile?.stabilityScore ?? defaults.stabilityScore),
        confidenceScore: safeRound(profile?.confidenceScore ?? defaults.confidenceScore),
        lastUpdatedAt: profile?.lastUpdatedAt || defaults.lastUpdatedAt
    };
}

function buildAdaptiveProfile({ user = {}, skillDetails = {}, recentAttempts = [] } = {}) {
    if (!Array.isArray(recentAttempts) || recentAttempts.length === 0) {
        return normalizeAdaptiveProfile(
            getDefaultAdaptiveProfile(user, { lastUpdatedAt: new Date() }),
            user
        );
    }

    const skillScore = Number(user?.skill_score) || 50;
    const level = user?.level || 'Intermediate';
    const confidenceScore = safeRound(
        skillDetails?.confidence ?? ((recentAttempts.length / MAX_SAMPLE_SIZE) * 100)
    );

    const successRate = safeRound(
        skillDetails?.successRate ?? (recentAttempts.reduce((sum, attempt) => sum + ((Number(attempt?.score) || 0) * 100), 0) / recentAttempts.length)
    );
    const timeEfficiency = safeRound(skillDetails?.timeEfficiency ?? 60);
    const errorRate = safeRound(skillDetails?.errorRate ?? 30);
    const hintDependency = safeRound(skillDetails?.hintDependency ?? 25);
    const retryDependency = safeRound(skillDetails?.retryDependency ?? 20);
    const idlePenalty = safeRound(skillDetails?.idlePenalty ?? 20);

    const supportNeed = safeRound(
        ((100 - successRate) * 0.38) +
        (errorRate * 0.22) +
        (hintDependency * 0.17) +
        (retryDependency * 0.11) +
        (idlePenalty * 0.12)
    );

    const challengeReadiness = safeRound(
        (skillScore * 0.34) +
        (successRate * 0.22) +
        (timeEfficiency * 0.12) +
        (confidenceScore * 0.2) +
        ((100 - hintDependency) * 0.06) +
        ((100 - errorRate) * 0.06)
    );

    const stabilityScore = safeRound(
        (successRate * 0.34) +
        ((100 - errorRate) * 0.24) +
        ((100 - idlePenalty) * 0.18) +
        ((100 - retryDependency) * 0.08) +
        (confidenceScore * 0.16)
    );

    let recommendedMode = 'balanced';
    if (supportNeed >= 58) {
        recommendedMode = 'support';
    } else if (challengeReadiness >= 68 && successRate >= 72 && confidenceScore >= 30) {
        recommendedMode = 'challenge';
    } else {
        recommendedMode = getBaselineMode({ level, skillScore });
        if (recommendedMode !== 'support' && recommendedMode !== 'challenge') {
            recommendedMode = 'balanced';
        }
    }

    const recommendedDifficulty = recommendedMode === 'support'
        ? shiftDifficulty(level, -1)
        : recommendedMode === 'challenge'
            ? shiftDifficulty(level, 1)
            : level;

    return normalizeAdaptiveProfile({
        recommendedMode,
        recommendedDifficulty,
        supportNeed,
        challengeReadiness,
        stabilityScore,
        confidenceScore,
        lastUpdatedAt: new Date()
    }, user);
}

function buildCategoryRecommendations({ user = {}, recentAttempts = [] } = {}) {
    if (!Array.isArray(recentAttempts) || recentAttempts.length === 0) {
        return [];
    }

    const grouped = new Map();

    recentAttempts.forEach((attempt) => {
        const category = attempt?.lessonCategory || attempt?.lesson_id?.category;
        if (!CATEGORY_ORDER.includes(category)) return;

        if (!grouped.has(category)) {
            grouped.set(category, {
                category,
                total: 0,
                correct: 0,
                errors: 0,
                hints: 0,
                retries: 0
            });
        }

        const bucket = grouped.get(category);
        bucket.total += 1;
        bucket.correct += toFiniteNumber(attempt?.score, 0) >= 1 ? 1 : 0;
        bucket.errors += Math.max(0, toFiniteNumber(attempt?.errors, 0));
        bucket.hints += Math.max(0, toFiniteNumber(attempt?.hints_used, 0));
        bucket.retries += Math.max(0, toFiniteNumber(attempt?.retries, 0));
    });

    const baseLevel = user?.level || 'Intermediate';
    const recommendations = [...grouped.values()].map((bucket) => {
        const attemptCount = bucket.total;
        const successRate = safeRound((bucket.correct / Math.max(attemptCount, 1)) * 100);

        const avgErrors = toFixedNumber(bucket.errors / Math.max(attemptCount, 1));
        const avgHints = toFixedNumber(bucket.hints / Math.max(attemptCount, 1));
        const avgRetries = toFixedNumber(bucket.retries / Math.max(attemptCount, 1));

        const errorLoad = clamp(avgErrors * 22, 0, 100);
        const hintLoad = clamp(avgHints * 25, 0, 100);
        const retryLoad = clamp(avgRetries * 30, 0, 100);

        const supportNeed = safeRound(
            ((100 - successRate) * 0.54) +
            (errorLoad * 0.24) +
            (hintLoad * 0.12) +
            (retryLoad * 0.1)
        );

        const challengeReadiness = safeRound(
            (successRate * 0.52) +
            ((100 - errorLoad) * 0.2) +
            ((100 - hintLoad) * 0.14) +
            ((100 - retryLoad) * 0.14)
        );

        const confidenceScore = safeRound((attemptCount / 12) * 100);

        let recommendedMode = 'balanced';
        if (supportNeed >= 58) {
            recommendedMode = 'support';
        } else if (challengeReadiness >= 68 && successRate >= 74 && confidenceScore >= 25) {
            recommendedMode = 'challenge';
        }

        const recommendedDifficulty = recommendedMode === 'support'
            ? shiftDifficulty(baseLevel, -1)
            : recommendedMode === 'challenge'
                ? shiftDifficulty(baseLevel, 1)
                : baseLevel;

        const priorityScore = safeRound(
            recommendedMode === 'support'
                ? supportNeed
                : recommendedMode === 'challenge'
                    ? challengeReadiness
                    : 40 + Math.abs(challengeReadiness - supportNeed)
        );

        const reason = recommendedMode === 'support'
            ? `Needs support: ${successRate}% accuracy with ${avgErrors} avg errors and ${avgHints} avg hints.`
            : recommendedMode === 'challenge'
                ? `Ready to stretch: ${successRate}% accuracy with low friction in this category.`
                : `Stable signals: ${successRate}% accuracy suggests balanced progression is appropriate.`;

        return {
            category: bucket.category,
            recommendedMode,
            recommendedDifficulty,
            supportNeed,
            challengeReadiness,
            confidenceScore,
            attemptCount,
            successRate,
            avgErrors,
            avgHints,
            avgRetries,
            priorityScore,
            reason
        };
    });

    return recommendations
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, CATEGORY_RECOMMENDATION_LIMIT);
}

module.exports = {
    buildAdaptiveProfile,
    buildCategoryRecommendations,
    getDefaultAdaptivePreferences,
    getDefaultAdaptiveProfile,
    normalizeAdaptivePreferences,
    normalizeAdaptiveProfile
};
