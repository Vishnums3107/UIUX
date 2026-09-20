const { buildCategoryRecommendations } = require('./adaptiveProfile');

const CATEGORY_ORDER = ['uyir', 'mei', 'uyir-mei', 'grammar', 'sentences'];
const DIFFICULTY_SCALE = ['Beginner', 'Intermediate', 'Advanced'];
const DIFFICULTY_INDEX = {
    Beginner: 0,
    Intermediate: 1,
    Advanced: 2
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const safeRound = (value) => Math.round(clamp(Number(value) || 0, 0, 100));
const toFiniteNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const toFixedNumber = (value, digits = 2) => Number(toFiniteNumber(value).toFixed(digits));

const shiftDifficulty = (difficulty = 'Intermediate', delta = 0) => {
    const currentIndex = DIFFICULTY_INDEX[difficulty] ?? 1;
    return DIFFICULTY_SCALE[clamp(currentIndex + delta, 0, DIFFICULTY_SCALE.length - 1)];
};

const getStageBaseDifficulty = (stage = 1) => {
    if (stage <= 3) return 'Beginner';
    if (stage <= 7) return 'Intermediate';
    return 'Advanced';
};

const extractCategory = (attempt) => {
    return attempt?.lessonCategory || attempt?.lesson_id?.category || null;
};

const extractStage = (attempt) => {
    return Number(attempt?.lessonStage || attempt?.stage || attempt?.lesson_id?.stage) || null;
};

const extractAttemptDate = (attempt) => {
    const raw = attempt?.createdAt || attempt?.updatedAt;
    if (!raw) return null;

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeStageArray = (value, fallback = []) => {
    if (!Array.isArray(value) || value.length === 0) return [...fallback];
    return [...new Set(value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item >= 1 && item <= 10)
    )].sort((a, b) => a - b);
};

const resolveActiveStage = ({ user = {}, stageProgress = [] } = {}) => {
    if (Array.isArray(stageProgress) && stageProgress.length > 0) {
        const stageFromProgress = stageProgress.find((entry) => entry.unlocked && !entry.masteryPassed)?.stage;
        if (stageFromProgress) return stageFromProgress;
    }

    const unlockedStages = normalizeStageArray(user?.unlockedStages, [1]);
    const masteryPassedStages = new Set(normalizeStageArray(user?.masteryPassedStages, []));
    const pendingStage = unlockedStages.find((stage) => !masteryPassedStages.has(stage));

    if (pendingStage) return pendingStage;
    return unlockedStages[unlockedStages.length - 1] || 1;
};

const buildCategoryGroups = (recentAttempts = []) => {
    const grouped = new Map();

    recentAttempts.forEach((attempt) => {
        const category = extractCategory(attempt);
        if (!CATEGORY_ORDER.includes(category)) return;

        if (!grouped.has(category)) {
            grouped.set(category, []);
        }

        grouped.get(category).push(attempt);
    });

    return grouped;
};

const getBaselineCategoryMap = (user = {}) => {
    const baseDifficulty = user?.level || 'Intermediate';

    return CATEGORY_ORDER.map((category) => ({
        category,
        attemptCount: 0,
        successRate: 0,
        avgErrors: 0,
        avgHints: 0,
        avgRetries: 0,
        avgTimeSpent: 0,
        recencyHours: null,
        recencyPressure: 0,
        masteryScore: 50,
        weaknessPressure: 45,
        confidenceScore: 0,
        recommendedMode: 'balanced',
        recommendedDifficulty: baseDifficulty,
        priorityScore: 45,
        reason: 'No recent attempts in this category yet. Start with a balanced session to collect signal.'
    }));
};

const buildCategoryMasteryMap = ({ user = {}, recentAttempts = [] } = {}) => {
    const grouped = buildCategoryGroups(recentAttempts);
    if (grouped.size === 0) {
        return getBaselineCategoryMap(user);
    }

    const categoryRecommendations = buildCategoryRecommendations({ user, recentAttempts });
    const recommendationMap = new Map(categoryRecommendations.map((item) => [item.category, item]));

    const rows = [...grouped.entries()].map(([category, attempts]) => {
        const recommendation = recommendationMap.get(category);
        const attemptCount = attempts.length;

        const correctCount = attempts.reduce((sum, attempt) => sum + (toFiniteNumber(attempt?.score, 0) >= 1 ? 1 : 0), 0);
        const successRate = recommendation?.successRate ?? safeRound((correctCount / Math.max(attemptCount, 1)) * 100);

        const avgErrors = recommendation?.avgErrors ?? toFixedNumber(
            attempts.reduce((sum, attempt) => sum + Math.max(0, toFiniteNumber(attempt?.errors, 0)), 0) / Math.max(attemptCount, 1)
        );
        const avgHints = recommendation?.avgHints ?? toFixedNumber(
            attempts.reduce((sum, attempt) => sum + Math.max(0, toFiniteNumber(attempt?.hints_used, 0)), 0) / Math.max(attemptCount, 1)
        );
        const avgRetries = recommendation?.avgRetries ?? toFixedNumber(
            attempts.reduce((sum, attempt) => sum + Math.max(0, toFiniteNumber(attempt?.retries, 0)), 0) / Math.max(attemptCount, 1)
        );
        const avgTimeSpent = toFixedNumber(
            attempts.reduce((sum, attempt) => sum + Math.max(0, toFiniteNumber(attempt?.time_spent, 0)), 0) / Math.max(attemptCount, 1)
        );

        const latestAttemptAt = attempts
            .map((attempt) => extractAttemptDate(attempt))
            .filter(Boolean)
            .sort((a, b) => b.getTime() - a.getTime())[0] || null;

        const recencyHours = latestAttemptAt
            ? toFixedNumber((Date.now() - latestAttemptAt.getTime()) / (1000 * 60 * 60))
            : null;
        const recencyPressure = recencyHours === null ? 0 : safeRound((recencyHours / 72) * 100);

        const errorLoad = clamp(avgErrors * 22, 0, 100);
        const hintLoad = clamp(avgHints * 25, 0, 100);
        const retryLoad = clamp(avgRetries * 30, 0, 100);

        const masteryScore = safeRound(
            (successRate * 0.52) +
            ((100 - errorLoad) * 0.18) +
            ((100 - hintLoad) * 0.15) +
            ((100 - retryLoad) * 0.15)
        );

        const confidenceScore = recommendation?.confidenceScore ?? safeRound((attemptCount / 12) * 100);
        const weaknessPressure = safeRound(
            ((100 - masteryScore) * 0.58) +
            ((100 - confidenceScore) * 0.18) +
            (recencyPressure * 0.14) +
            (errorLoad * 0.1)
        );

        const recommendedMode = recommendation?.recommendedMode
            || (weaknessPressure >= 58 ? 'support' : masteryScore >= 74 ? 'challenge' : 'balanced');

        const recommendedDifficulty = recommendation?.recommendedDifficulty
            || (recommendedMode === 'support'
                ? shiftDifficulty(user?.level || 'Intermediate', -1)
                : recommendedMode === 'challenge'
                    ? shiftDifficulty(user?.level || 'Intermediate', 1)
                    : (user?.level || 'Intermediate'));

        const priorityScore = recommendation?.priorityScore ?? weaknessPressure;

        return {
            category,
            attemptCount,
            successRate,
            avgErrors,
            avgHints,
            avgRetries,
            avgTimeSpent,
            recencyHours,
            recencyPressure,
            masteryScore,
            weaknessPressure,
            confidenceScore,
            recommendedMode,
            recommendedDifficulty,
            priorityScore,
            reason: recommendation?.reason || 'Topic metrics derived from recent attempt performance and recency signals.'
        };
    });

    return rows
        .sort((a, b) => {
            if (b.weaknessPressure !== a.weaknessPressure) {
                return b.weaknessPressure - a.weaknessPressure;
            }

            const leftOrder = CATEGORY_ORDER.indexOf(a.category);
            const rightOrder = CATEGORY_ORDER.indexOf(b.category);
            return leftOrder - rightOrder;
        });
};

const buildStageCategoryRecommendations = ({
    categoryMasteryMap = [],
    user = {},
    activeStage = 1
} = {}) => {
    if (!Array.isArray(categoryMasteryMap) || categoryMasteryMap.length === 0) {
        return [];
    }

    const unlockedStages = normalizeStageArray(user?.unlockedStages, [1]);
    const masteryPassedStages = new Set(normalizeStageArray(user?.masteryPassedStages, []));
    const pendingUnlockedStages = unlockedStages.filter((stage) => !masteryPassedStages.has(stage));

    const stageCandidates = [...new Set([
        activeStage,
        pendingUnlockedStages[0],
        pendingUnlockedStages[1]
    ].filter(Boolean))].slice(0, 3);

    const topCategories = [...categoryMasteryMap]
        .sort((a, b) => b.weaknessPressure - a.weaknessPressure)
        .slice(0, 3);

    const recommendations = [];

    stageCandidates.forEach((stage) => {
        const stageBaseDifficulty = getStageBaseDifficulty(stage);

        topCategories.forEach((item) => {
            const recommendedDifficulty = item.recommendedMode === 'support'
                ? shiftDifficulty(stageBaseDifficulty, -1)
                : item.recommendedMode === 'challenge'
                    ? shiftDifficulty(stageBaseDifficulty, 1)
                    : stageBaseDifficulty;

            const stageUrgencyBoost = stage === activeStage ? 8 : 3;
            const priorityScore = safeRound((item.weaknessPressure * 0.7) + stageUrgencyBoost);

            recommendations.push({
                stage,
                category: item.category,
                recommendedMode: item.recommendedMode,
                recommendedDifficulty,
                weaknessPressure: item.weaknessPressure,
                confidenceScore: item.confidenceScore,
                priorityScore,
                reason: `Stage ${stage} should focus ${item.category} with ${item.recommendedMode} guidance due to ${item.weaknessPressure}/100 weakness pressure.`
            });
        });
    });

    return recommendations
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 8);
};

const buildSequencingPlan = ({
    stageCategoryRecommendations = [],
    categoryMasteryMap = [],
    activeStage = 1
} = {}) => {
    if (stageCategoryRecommendations.length === 0 && categoryMasteryMap.length === 0) {
        return [];
    }

    const seeded = stageCategoryRecommendations.length > 0
        ? stageCategoryRecommendations
        : categoryMasteryMap.slice(0, 4).map((item) => ({
            stage: activeStage,
            category: item.category,
            recommendedMode: item.recommendedMode,
            recommendedDifficulty: item.recommendedDifficulty,
            weaknessPressure: item.weaknessPressure,
            confidenceScore: item.confidenceScore,
            priorityScore: item.priorityScore,
            reason: item.reason
        }));

    return seeded
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 5)
        .map((item, index) => ({
            rank: index + 1,
            sessionMode: 'category',
            category: item.category,
            stage: item.stage || activeStage,
            recommendedMode: item.recommendedMode,
            recommendedDifficulty: item.recommendedDifficulty,
            priorityScore: item.priorityScore,
            estimatedMinutes: clamp(Math.round(8 + (item.priorityScore / 12)), 8, 25),
            reason: item.reason
        }));
};

const buildReviewPriorityMap = ({ categoryMasteryMap = [] } = {}) => {
    return categoryMasteryMap.reduce((acc, item) => {
        const modeBoost = item.recommendedMode === 'support'
            ? 14
            : item.recommendedMode === 'challenge'
                ? -4
                : 3;

        const weaknessBoost = Math.round((item.weaknessPressure - 50) * 0.5);
        const confidencePenalty = Math.round((100 - item.confidenceScore) * 0.06);
        const recencyBoost = Math.round((item.recencyPressure || 0) * 0.08);

        acc[item.category] = clamp(
            weaknessBoost + modeBoost + confidencePenalty + recencyBoost,
            -10,
            28
        );

        return acc;
    }, {});
};

function buildTopicIntelligence({ user = {}, recentAttempts = [], stageProgress = [] } = {}) {
    const activeStage = resolveActiveStage({ user, stageProgress });
    const pendingMasteryStages = normalizeStageArray(user?.unlockedStages, [1])
        .filter((stage) => !new Set(normalizeStageArray(user?.masteryPassedStages, [])).has(stage));

    const categoryMasteryMap = buildCategoryMasteryMap({ user, recentAttempts });
    const stageCategoryRecommendations = buildStageCategoryRecommendations({
        categoryMasteryMap,
        user,
        activeStage
    });
    const sequencingPlan = buildSequencingPlan({
        stageCategoryRecommendations,
        categoryMasteryMap,
        activeStage
    });

    return {
        activeStage,
        pendingMasteryStages,
        categoryMasteryMap,
        stageCategoryRecommendations,
        sequencingPlan,
        generatedAt: new Date().toISOString(),
        attemptWindowSize: Array.isArray(recentAttempts) ? recentAttempts.length : 0
    };
}

module.exports = {
    buildTopicIntelligence,
    buildCategoryMasteryMap,
    buildStageCategoryRecommendations,
    buildSequencingPlan,
    buildReviewPriorityMap,
    resolveActiveStage
};
