const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const asPercent = (value) => Math.round(clamp(value, 0, 100));

const buildConfidence = ({
    base = 50,
    volume = 0,
    volumeCap = 20,
    bonus = 0,
    penalty = 0
} = {}) => {
    const normalizedVolume = clamp(volume, 0, volumeCap) / Math.max(volumeCap, 1);
    return asPercent(base + (normalizedVolume * 30) + bonus - penalty);
};

const recommendation = ({
    id,
    title,
    summary,
    actionPath,
    actionLabel,
    reasons,
    priorityWeight,
    confidenceScore
}) => ({
    id,
    title,
    summary,
    actionPath,
    actionLabel,
    reasons: Array.isArray(reasons) ? reasons : [],
    priorityWeight: asPercent(priorityWeight),
    confidenceScore: asPercent(confidenceScore)
});

export function buildDashboardCopilotRecommendations(context = {}) {
    const {
        reviewQueueTotal = 0,
        weakCategoryInsights = [],
        activeStage = 1,
        continuePath = '/learn',
        focusScore = 70,
        trajectoryWeekly = 0,
        remainingMasteryStages = 0,
        masteryEtaDays = 7,
        recentAccuracy = 0,
        streak = 0
    } = context;

    const recs = [];

    if (reviewQueueTotal > 0) {
        recs.push(recommendation({
            id: 'review_debt_clear',
            title: 'Clear review debt before new content',
            summary: `${reviewQueueTotal} review lesson${reviewQueueTotal === 1 ? '' : 's'} are currently due and carry the highest forgetting risk.`,
            actionPath: '/learn?mode=review',
            actionLabel: 'Start Review Queue',
            reasons: [
                `${reviewQueueTotal} items are already due in the spaced repetition schedule.`,
                'Due reviews have higher memory decay impact than unseen lessons.',
                'Completing due items first improves retention stability for later stages.'
            ],
            priorityWeight: 44 + (reviewQueueTotal * 7),
            confidenceScore: buildConfidence({
                base: 62,
                volume: reviewQueueTotal,
                volumeCap: 12,
                bonus: reviewQueueTotal > 5 ? 8 : 0
            })
        }));
    }

    if (weakCategoryInsights.length > 0) {
        const weakest = weakCategoryInsights[0];
        const weakLabel = weakest.label || weakest.category || 'current weak skill';

        recs.push(recommendation({
            id: 'weak_skill_drill',
            title: `Targeted drill: ${weakLabel}`,
            summary: `Error concentration is highest in ${weakLabel}. A short focused drill can reduce repeat misses.`,
            actionPath: continuePath,
            actionLabel: 'Run Focus Drill',
            reasons: [
                `${weakLabel} currently shows a ${weakest.failRate || 0}% miss rate.`,
                `${weakest.incorrect || 0} incorrect attempts were recorded in this area recently.`,
                'Focused repetition on one weak skill usually yields the fastest short-term gain.'
            ],
            priorityWeight: 34 + ((weakest.failRate || 0) * 0.7) + ((weakest.incorrect || 0) * 3),
            confidenceScore: buildConfidence({
                base: 52,
                volume: weakest.total || 0,
                volumeCap: 10,
                bonus: (weakest.failRate || 0) > 50 ? 10 : 0
            })
        }));
    }

    recs.push(recommendation({
        id: 'stage_progress_push',
        title: `Push Stage ${activeStage} progression`,
        summary: `${remainingMasteryStages} mastery checkpoint${remainingMasteryStages === 1 ? '' : 's'} remain. Pacing this stage keeps overall ETA near ${masteryEtaDays} days.`,
        actionPath: continuePath,
        actionLabel: 'Continue Stage Path',
        reasons: [
            `${remainingMasteryStages} stages still require mastery completion.`,
            `Current roadmap projects around ${masteryEtaDays} days to completion.`,
            trajectoryWeekly >= 0
                ? `Trajectory is trending up by ${trajectoryWeekly}% recently, so momentum is favorable.`
                : `Trajectory is down ${Math.abs(trajectoryWeekly)}%, so consistent stage progress is needed.`
        ],
        priorityWeight: 31 + (remainingMasteryStages * 3) + (trajectoryWeekly >= 0 ? 8 : 0),
        confidenceScore: buildConfidence({
            base: 56,
            volume: remainingMasteryStages,
            volumeCap: 10,
            bonus: recentAccuracy >= 70 ? 9 : 0,
            penalty: trajectoryWeekly < 0 ? 8 : 0
        })
    }));

    if (focusScore < 72 || streak < 3) {
        recs.push(recommendation({
            id: 'focus_stability',
            title: 'Stabilize focus and consistency',
            summary: 'A short calibration block can improve answer quality before long sessions.',
            actionPath: continuePath,
            actionLabel: 'Start Calibration Block',
            reasons: [
                `Current focus score is ${focusScore}/100.`,
                `Learning streak is ${streak} day${streak === 1 ? '' : 's'}.`,
                'Consistency and attentional quality strongly affect retention over time.'
            ],
            priorityWeight: 28 + ((72 - focusScore) * 1.2) + (streak < 3 ? 8 : 0),
            confidenceScore: buildConfidence({
                base: 49,
                volume: 10,
                volumeCap: 10,
                bonus: focusScore < 60 ? 12 : 0
            })
        }));
    }

    if (recs.length === 0) {
        recs.push(recommendation({
            id: 'steady_progress',
            title: 'Continue steady stage practice',
            summary: 'No urgent risks detected. Continue with your active stage plan.',
            actionPath: continuePath,
            actionLabel: 'Continue Learning',
            reasons: [
                'No high-priority risk signal was detected in reviews or focus.',
                'Steady progression remains the most efficient next move.'
            ],
            priorityWeight: 40,
            confidenceScore: 65
        }));
    }

    return recs.sort((a, b) => b.priorityWeight - a.priorityWeight);
}

export function buildLearnCopilotRecommendations(context = {}) {
    const {
        sessionMode = 'category',
        selectedStage = null,
        reviewQueueTotal = 0,
        remainingQuestions = 0,
        sessionAccuracy = 0,
        focusScore = 70,
        idleGapSeconds = 0,
        averageTimePerAnswer = 50,
        uxTelemetry = {},
        fluencyTrajectory = 50,
        sessionMasteryEtaMinutes = 5
    } = context;

    const hints = uxTelemetry.hints || 0;
    const errors = uxTelemetry.errors || 0;
    const retries = uxTelemetry.retries || 0;
    const interactions = uxTelemetry.interactions || 0;

    const recs = [];

    if (remainingQuestions > 0) {
        recs.push(recommendation({
            id: 'finish_session_block',
            title: `Finish current block (${remainingQuestions} left)`,
            summary: `Closing this block now keeps session rhythm and avoids context switching losses.`,
            actionPath: null,
            actionLabel: 'Stay In Flow',
            reasons: [
                `${remainingQuestions} question${remainingQuestions === 1 ? '' : 's'} remain in this sequence.`,
                `Current estimated completion is about ${sessionMasteryEtaMinutes} minute${sessionMasteryEtaMinutes === 1 ? '' : 's'}.`,
                `Average answer time is ${averageTimePerAnswer}s, which supports finishing in one pass.`
            ],
            priorityWeight: 38 + (remainingQuestions * 4),
            confidenceScore: buildConfidence({
                base: 58,
                volume: interactions,
                volumeCap: 30
            })
        }));
    }

    if (sessionMode === 'review' && reviewQueueTotal > 0) {
        recs.push(recommendation({
            id: 'review_priority',
            title: 'Prioritize due review lessons first',
            summary: 'In review mode, due items should be cleared before exploratory practice.',
            actionPath: '/learn?mode=review',
            actionLabel: 'Keep Reviewing',
            reasons: [
                `${reviewQueueTotal} due review lesson${reviewQueueTotal === 1 ? '' : 's'} are in queue context.`,
                'Due reviews are time-sensitive and have the highest memory retention value.',
                'Clearing them reduces long-term relearning cost.'
            ],
            priorityWeight: 42 + (reviewQueueTotal * 6),
            confidenceScore: buildConfidence({
                base: 66,
                volume: reviewQueueTotal,
                volumeCap: 12
            })
        }));
    }

    if (hints >= 2) {
        recs.push(recommendation({
            id: 'hint_control',
            title: 'Run a low-hint challenge (next 3 questions)',
            summary: 'Reducing hints briefly improves active recall and confidence transfer.',
            actionPath: null,
            actionLabel: 'Apply Challenge',
            reasons: [
                `${hints} hint request${hints === 1 ? '' : 's'} occurred this session.`,
                'High hint dependence can mask recall gaps.',
                'Short controlled no-hint windows improve retrieval strength.'
            ],
            priorityWeight: 30 + (hints * 7),
            confidenceScore: buildConfidence({
                base: 54,
                volume: hints,
                volumeCap: 8
            })
        }));
    }

    if (errors >= 2 || retries >= 2) {
        recs.push(recommendation({
            id: 'error_recovery',
            title: 'Switch to precision mode for the next attempts',
            summary: 'Use a slower verify-before-submit rhythm to lower repeated mistakes.',
            actionPath: null,
            actionLabel: 'Enter Precision Mode',
            reasons: [
                `${errors} error${errors === 1 ? '' : 's'} and ${retries} retr${retries === 1 ? 'y' : 'ies'} were logged.`,
                'High retry and error loops indicate pace is ahead of comprehension.',
                'A brief precision block usually stabilizes accuracy quickly.'
            ],
            priorityWeight: 33 + (errors * 7) + (retries * 5),
            confidenceScore: buildConfidence({
                base: 57,
                volume: errors + retries,
                volumeCap: 12
            })
        }));
    }

    if (idleGapSeconds >= 20 || focusScore < 65) {
        recs.push(recommendation({
            id: 'focus_recovery',
            title: 'Recover focus before the next answer',
            summary: 'Reset attention with a short pause, then resume with one deliberate attempt.',
            actionPath: null,
            actionLabel: 'Recover Focus',
            reasons: [
                `Idle gap is ${idleGapSeconds}s and focus score is ${focusScore}/100.`,
                'Attention drift increases avoidable errors and hint usage.',
                'A short reset restores quality without stopping the full session.'
            ],
            priorityWeight: 28 + ((65 - focusScore) * 1.4) + (idleGapSeconds * 0.4),
            confidenceScore: buildConfidence({
                base: 51,
                volume: idleGapSeconds,
                volumeCap: 60,
                bonus: focusScore < 55 ? 10 : 0
            })
        }));
    }

    if (sessionMode === 'stage' && selectedStage) {
        recs.push(recommendation({
            id: 'stage_mastery_alignment',
            title: `Align with Stage ${selectedStage} mastery target`,
            summary: 'Maintain stage consistency to maximize unlock probability for the next stage.',
            actionPath: `/learn?stage=${selectedStage}`,
            actionLabel: 'Continue Stage Track',
            reasons: [
                `You are currently on Stage ${selectedStage}.`,
                `Session accuracy is ${sessionAccuracy}% and fluency trajectory is ${fluencyTrajectory}.`,
                'Stage-consistent practice improves mastery checkpoint readiness.'
            ],
            priorityWeight: 29 + (sessionAccuracy * 0.25) + (remainingQuestions * 2),
            confidenceScore: buildConfidence({
                base: 55,
                volume: remainingQuestions,
                volumeCap: 15,
                bonus: sessionAccuracy >= 70 ? 10 : 0
            })
        }));
    }

    if (recs.length === 0) {
        recs.push(recommendation({
            id: 'maintain_rhythm',
            title: 'Maintain current learning rhythm',
            summary: 'No risk spike detected. Continue with the current pace and structure.',
            actionPath: null,
            actionLabel: 'Continue',
            reasons: [
                'Signals are balanced across focus, hint use, and error pressure.',
                'Current pacing appears stable for this session mode.'
            ],
            priorityWeight: 40,
            confidenceScore: 64
        }));
    }

    return recs.sort((a, b) => b.priorityWeight - a.priorityWeight).slice(0, 4);
}
