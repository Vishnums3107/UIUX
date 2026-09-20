const { resolveActiveStage } = require('./topicIntelligence');

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const safeRound = (value) => Math.round(clamp(Number(value) || 0, 0, 100));
const toFiniteNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const toFixedNumber = (value, digits = 2) => Number(toFiniteNumber(value).toFixed(digits));

const CONFIDENCE_BANDS = [
    { key: 'fragile', max: 39 },
    { key: 'developing', max: 59 },
    { key: 'stable', max: 78 },
    { key: 'surging', max: 100 }
];

const normalizeStageArray = (value, fallback = []) => {
    if (!Array.isArray(value) || value.length === 0) return [...fallback];
    return [...new Set(value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item >= 1 && item <= 10)
    )].sort((a, b) => a - b);
};

const extractStage = (attempt = {}) => {
    return Number(attempt?.lessonStage || attempt?.stage || attempt?.lesson_id?.stage) || null;
};

const getConfidenceBandLabel = (score = 0) => {
    const normalized = safeRound(score);
    return CONFIDENCE_BANDS.find((band) => normalized <= band.max)?.key || 'stable';
};

const buildLearnPath = ({ sessionMode = 'category', stage = null, category = null } = {}) => {
    if (sessionMode === 'review') return '/learn?mode=review';
    if (sessionMode === 'stage') return `/learn?stage=${Math.max(1, Number(stage) || 1)}`;
    if (sessionMode === 'category' && category) return `/learn?category=${encodeURIComponent(category)}`;
    return '/learn';
};

const summarizeObjective = ({ recommendedMode = 'balanced', category = 'topic', stage = 1 } = {}) => {
    if (recommendedMode === 'support') {
        return `Stabilize accuracy in ${category} for Stage ${stage} with guided repetition.`;
    }

    if (recommendedMode === 'challenge') {
        return `Stretch recall depth in ${category} for Stage ${stage} under tighter support.`;
    }

    return `Maintain steady progression in ${category} for Stage ${stage}.`;
};

const buildStageConfidenceBands = ({ recentAttempts = [], stageProgress = [], user = {} } = {}) => {
    const grouped = new Map();

    recentAttempts.forEach((attempt) => {
        const stage = extractStage(attempt);
        if (!stage) return;

        if (!grouped.has(stage)) {
            grouped.set(stage, []);
        }

        grouped.get(stage).push(attempt);
    });

    const unlockedStages = normalizeStageArray(user?.unlockedStages, [1]);
    const stageSet = new Set([
        ...unlockedStages,
        ...normalizeStageArray(stageProgress.map((item) => item.stage)),
        ...grouped.keys()
    ]);

    if (stageSet.size === 0) {
        stageSet.add(resolveActiveStage({ user, stageProgress }));
    }

    return [...stageSet]
        .sort((a, b) => a - b)
        .map((stage) => {
            const attempts = grouped.get(stage) || [];
            const attemptCount = attempts.length;
            const correctCount = attempts.reduce((sum, attempt) => sum + (toFiniteNumber(attempt?.score, 0) >= 1 ? 1 : 0), 0);
            const accuracy = attemptCount > 0 ? safeRound((correctCount / attemptCount) * 100) : 0;
            const avgErrors = attemptCount > 0
                ? toFixedNumber(attempts.reduce((sum, attempt) => sum + Math.max(0, toFiniteNumber(attempt?.errors, 0)), 0) / attemptCount)
                : 0;
            const avgHints = attemptCount > 0
                ? toFixedNumber(attempts.reduce((sum, attempt) => sum + Math.max(0, toFiniteNumber(attempt?.hints_used, 0)), 0) / attemptCount)
                : 0;
            const avgRetries = attemptCount > 0
                ? toFixedNumber(attempts.reduce((sum, attempt) => sum + Math.max(0, toFiniteNumber(attempt?.retries, 0)), 0) / attemptCount)
                : 0;

            const errorLoad = clamp(avgErrors * 24, 0, 100);
            const hintLoad = clamp(avgHints * 26, 0, 100);
            const retryLoad = clamp(avgRetries * 28, 0, 100);
            const sampleStrength = safeRound((attemptCount / 10) * 100);

            const confidenceScore = safeRound(
                (accuracy * 0.46) +
                ((100 - errorLoad) * 0.2) +
                ((100 - hintLoad) * 0.14) +
                ((100 - retryLoad) * 0.1) +
                (sampleStrength * 0.1)
            );

            const readinessScore = safeRound(
                (accuracy * 0.5) +
                (sampleStrength * 0.2) +
                ((100 - hintLoad) * 0.15) +
                ((100 - errorLoad) * 0.15)
            );

            const confidenceBand = getConfidenceBandLabel(confidenceScore);
            const recommendedMode = confidenceBand === 'fragile' || confidenceBand === 'developing'
                ? 'support'
                : confidenceBand === 'surging'
                    ? 'challenge'
                    : 'balanced';

            return {
                stage,
                attemptCount,
                accuracy,
                avgErrors,
                avgHints,
                avgRetries,
                confidenceScore,
                readinessScore,
                confidenceBand,
                recommendedMode
            };
        });
};

const buildRecoveryPlan = ({ recentAttempts = [], topicIntelligence = {}, activeStage = 1 } = {}) => {
    const recentWindow = recentAttempts.slice(0, 8);
    const incorrectCount = recentWindow.filter((attempt) => toFiniteNumber(attempt?.score, 0) < 1).length;
    const hintHeavyCount = recentWindow.filter((attempt) => toFiniteNumber(attempt?.hints_used, 0) >= 1).length;
    const retryHeavyCount = recentWindow.filter((attempt) => toFiniteNumber(attempt?.retries, 0) >= 1).length;
    const highFrictionCount = recentWindow.filter((attempt) => (
        toFiniteNumber(attempt?.errors, 0) >= 2 || toFiniteNumber(attempt?.time_spent, 0) >= 45
    )).length;

    const required = recentWindow.length >= 5 && (
        incorrectCount >= 4 ||
        hintHeavyCount >= 5 ||
        retryHeavyCount >= 4 ||
        highFrictionCount >= 5
    );

    const focusAreas = (topicIntelligence?.categoryMasteryMap || [])
        .filter((item) => toFiniteNumber(item?.weaknessPressure, 0) >= 60)
        .sort((a, b) => toFiniteNumber(b?.weaknessPressure, 0) - toFiniteNumber(a?.weaknessPressure, 0))
        .slice(0, 3)
        .map((item) => ({
            category: item.category,
            weaknessPressure: safeRound(item.weaknessPressure),
            recommendedMode: item.recommendedMode || 'support',
            reason: item.reason
        }));

    const plan = required
        ? [
            {
                order: 1,
                title: 'Reset with guided accuracy blocks',
                action: 'Run two short support-mode sessions focused on weak categories before any stretch work.',
                successMetric: 'Reach at least 72% accuracy for two consecutive sessions.'
            },
            {
                order: 2,
                title: 'Lower cognitive noise',
                action: `Prioritize Stage ${activeStage} prompts with pronunciation cues and hints enabled by default.`,
                successMetric: 'Keep average hints under 1.2 and retries under 1.0.'
            },
            {
                order: 3,
                title: 'Reintroduce challenge gradually',
                action: 'After recovery targets are met, run one balanced session before returning to challenge mode.',
                successMetric: 'Maintain stable accuracy without spike in error load.'
            }
        ]
        : [
            {
                order: 1,
                title: 'Maintain consistency',
                action: 'Keep daily sessions compact and preserve the current adaptive mode.',
                successMetric: 'Sustain current confidence band over the next 3 days.'
            }
        ];

    const triggerReason = required
        ? `Recovery triggered by ${incorrectCount} incorrect attempts, ${hintHeavyCount} hint-heavy attempts, and ${retryHeavyCount} retry-heavy attempts in the last ${recentWindow.length} attempts.`
        : 'No acute struggle signature detected in the recent attempt window.';

    return {
        required,
        triggerReason,
        focusAreas,
        plan,
        signalSummary: {
            windowSize: recentWindow.length,
            incorrectCount,
            hintHeavyCount,
            retryHeavyCount,
            highFrictionCount
        },
        targetOutcomes: required
            ? {
                accuracyTarget: 72,
                maxAvgHints: 1.2,
                maxAvgRetries: 1.0
            }
            : {
                accuracyTarget: 78,
                maxAvgHints: 0.8,
                maxAvgRetries: 0.7
            },
        horizonDays: required ? 7 : 3
    };
};

const buildWorkloadPlan = ({ user = {}, stageConfidenceBands = [], recoveryPlan = {} } = {}) => {
    const activeBands = stageConfidenceBands.filter((item) => item.attemptCount > 0);
    const averageConfidence = activeBands.length > 0
        ? safeRound(activeBands.reduce((sum, item) => sum + toFiniteNumber(item.confidenceScore, 0), 0) / activeBands.length)
        : 52;

    const streak = Math.max(0, toFiniteNumber(user?.current_streak, 0));
    const recommendedSessionsPerDay = recoveryPlan.required
        ? 1
        : averageConfidence >= 75
            ? 3
            : averageConfidence >= 55
                ? 2
                : 1;
    const sessionMinutesRange = recoveryPlan.required
        ? { min: 10, max: 18 }
        : averageConfidence >= 75
            ? { min: 18, max: 28 }
            : { min: 14, max: 22 };

    const restDaySuggested = streak >= 14 && recoveryPlan.required;
    const streakWeight = safeRound((Math.min(streak * 5, 100) * 0.6) + (averageConfidence * 0.4));

    const reason = recoveryPlan.required
        ? 'Workload reduced to protect confidence while recovery plan runs.'
        : streak >= 10
            ? 'Workload tuned to leverage strong streak momentum.'
            : 'Workload tuned to build routine without overload.';

    return {
        recommendedSessionsPerDay,
        sessionMinutesRange,
        restDaySuggested,
        streakWeight,
        reason
    };
};

const buildMasteryForecast = ({
    activeStage = 1,
    stageConfidenceBands = [],
    recoveryPlan = {},
    workloadPlan = {}
} = {}) => {
    const activeBand = stageConfidenceBands.find((item) => item.stage === activeStage) || stageConfidenceBands[0] || {
        confidenceBand: 'developing',
        confidenceScore: 45,
        readinessScore: 45,
        accuracy: 0,
        avgErrors: 0,
        avgHints: 0,
        attemptCount: 0
    };

    const readinessPercent = safeRound(
        toFiniteNumber(activeBand.readinessScore, 45) - (recoveryPlan.required ? 8 : 0)
    );
    const sessionsPerDay = Math.max(1, toFiniteNumber(workloadPlan.recommendedSessionsPerDay, 1));
    const masteryLikelyInDays = clamp(
        Math.round(((100 - readinessPercent) / 12) / sessionsPerDay) + 1,
        1,
        21
    );

    const blockingFactors = [];
    if (recoveryPlan.required) blockingFactors.push('Recovery plan is active due to recent struggle signatures.');
    if (toFiniteNumber(activeBand.avgHints, 0) >= 1.2) blockingFactors.push('Hint dependency remains high for the active stage.');
    if (toFiniteNumber(activeBand.avgErrors, 0) >= 1.5) blockingFactors.push('Error load is still above mastery-safe threshold.');
    if (toFiniteNumber(activeBand.attemptCount, 0) < 6) blockingFactors.push('More attempts are needed for high-confidence mastery forecasting.');

    const greenFlags = [];
    if (toFiniteNumber(activeBand.accuracy, 0) >= 80) greenFlags.push('Accuracy is in a strong mastery zone.');
    if (toFiniteNumber(activeBand.confidenceScore, 0) >= 70) greenFlags.push('Confidence profile is stable for this stage.');
    if (!recoveryPlan.required) greenFlags.push('No acute recovery blockers detected.');

    return {
        stage: activeStage,
        confidenceBand: activeBand.confidenceBand,
        readinessPercent,
        masteryLikelyInDays,
        isReadyForMasteryTest: readinessPercent >= 76 && !recoveryPlan.required,
        blockingFactors,
        greenFlags
    };
};

const buildNextBestSessions = ({
    topicIntelligence = {},
    stageConfidenceBands = [],
    activeStage = 1
} = {}) => {
    const seededPlan = Array.isArray(topicIntelligence?.sequencingPlan)
        ? topicIntelligence.sequencingPlan
        : [];

    if (seededPlan.length > 0) {
        return seededPlan.slice(0, 5).map((step, index) => ({
            rank: index + 1,
            sessionMode: step.sessionMode || 'category',
            stage: Number(step.stage) || activeStage,
            category: step.category || null,
            recommendedMode: step.recommendedMode || 'balanced',
            recommendedDifficulty: step.recommendedDifficulty || 'Intermediate',
            estimatedMinutes: clamp(Math.round(toFiniteNumber(step.estimatedMinutes, 14)), 8, 30),
            priorityScore: safeRound(step.priorityScore || (70 - (index * 7))),
            objective: summarizeObjective({
                recommendedMode: step.recommendedMode,
                category: step.category || 'core skills',
                stage: Number(step.stage) || activeStage
            }),
            reason: step.reason || 'Derived from topic weakness pressure and confidence signals.',
            actionPath: buildLearnPath({
                sessionMode: step.sessionMode || 'category',
                stage: Number(step.stage) || activeStage,
                category: step.category || null
            })
        }));
    }

    return [...stageConfidenceBands]
        .sort((a, b) => toFiniteNumber(a.confidenceScore, 0) - toFiniteNumber(b.confidenceScore, 0))
        .slice(0, 3)
        .map((band, index) => ({
            rank: index + 1,
            sessionMode: 'stage',
            stage: band.stage,
            category: null,
            recommendedMode: band.recommendedMode || 'support',
            recommendedDifficulty: band.recommendedMode === 'challenge' ? 'Advanced' : 'Intermediate',
            estimatedMinutes: band.recommendedMode === 'support' ? 12 : 16,
            priorityScore: safeRound(100 - toFiniteNumber(band.confidenceScore, 0)),
            objective: `Raise Stage ${band.stage} confidence from ${band.confidenceBand} toward stable.`,
            reason: `Stage ${band.stage} confidence is ${band.confidenceScore}/100 with ${band.attemptCount} recent attempts.`,
            actionPath: buildLearnPath({ sessionMode: 'stage', stage: band.stage })
        }));
};

const buildLearningArc = ({
    user = {},
    activeStage = 1,
    masteryForecast = {},
    stageConfidenceBands = [],
    nextBestSessions = []
} = {}) => {
    const level = user?.level || 'Intermediate';
    const arcName = level === 'Beginner'
        ? 'Foundations To Flow Arc'
        : level === 'Advanced'
            ? 'Precision Fluency Arc'
            : 'Flow To Fluency Arc';

    const currentPhase = activeStage <= 3
        ? 'Letter Foundations'
        : activeStage <= 6
            ? 'Pattern Consolidation'
            : activeStage <= 9
                ? 'Applied Expression'
                : 'Fluency Polishing';

    const nextMilestone = masteryForecast?.isReadyForMasteryTest
        ? `Attempt Stage ${activeStage} mastery test`
        : `Raise Stage ${activeStage} readiness to 76+`;

    const confidenceAverage = stageConfidenceBands.length > 0
        ? safeRound(stageConfidenceBands.reduce((sum, item) => sum + toFiniteNumber(item.confidenceScore, 0), 0) / stageConfidenceBands.length)
        : 52;

    const milestones = [
        {
            order: 1,
            label: 'Stabilize Active Stage',
            targetStage: activeStage,
            successSignal: `Confidence band reaches at least stable for Stage ${activeStage}.`
        },
        {
            order: 2,
            label: 'Bridge Into Next Stage',
            targetStage: Math.min(10, activeStage + 1),
            successSignal: 'Complete two directed sessions from next-best plan with clean recall.'
        },
        {
            order: 3,
            label: 'Fluency Consolidation',
            targetStage: Math.min(10, activeStage + 2),
            successSignal: 'Maintain confidence average above 70 with controlled hint usage.'
        }
    ];

    return {
        arcName,
        currentPhase,
        nextMilestone,
        milestones,
        fluencyOutcome: masteryForecast?.isReadyForMasteryTest
            ? 'Learner is approaching mastery-test readiness for immediate progression.'
            : 'Learner is building toward reliable stage mastery with structured confidence growth.',
        narrative: `${user?.name || 'Learner'} is currently in ${currentPhase}. Focus now is ${nextMilestone.toLowerCase()}, supported by ${nextBestSessions.length} directed session recommendations and a ${confidenceAverage}/100 confidence baseline.`
    };
};

function buildLearningDirector({
    user = {},
    recentAttempts = [],
    stageProgress = [],
    topicIntelligence = {}
} = {}) {
    const activeStage = resolveActiveStage({ user, stageProgress });
    const stageConfidenceBands = buildStageConfidenceBands({ recentAttempts, stageProgress, user });
    const nextBestSessions = buildNextBestSessions({
        topicIntelligence,
        stageConfidenceBands,
        activeStage
    });
    const recoveryPlan = buildRecoveryPlan({
        recentAttempts,
        topicIntelligence,
        activeStage
    });
    const workloadPlan = buildWorkloadPlan({
        user,
        stageConfidenceBands,
        recoveryPlan
    });
    const masteryForecast = buildMasteryForecast({
        activeStage,
        stageConfidenceBands,
        recoveryPlan,
        workloadPlan
    });
    const learningArc = buildLearningArc({
        user,
        activeStage,
        masteryForecast,
        stageConfidenceBands,
        nextBestSessions
    });

    return {
        activeStage,
        stageConfidenceBands,
        nextBestSessions,
        recoveryPlan,
        workloadPlan,
        masteryForecast,
        learningArc,
        generatedAt: new Date().toISOString(),
        attemptWindowSize: Array.isArray(recentAttempts) ? recentAttempts.length : 0
    };
}

module.exports = {
    buildLearningDirector,
    buildStageConfidenceBands,
    buildRecoveryPlan,
    buildWorkloadPlan,
    buildMasteryForecast,
    buildNextBestSessions,
    buildLearningArc
};
