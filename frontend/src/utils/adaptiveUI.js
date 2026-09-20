const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const ADAPTIVE_MODE_OPTIONS = [
    {
        id: 'auto',
        label: 'Auto',
        shortLabel: 'Auto',
        description: 'Let the system tune support and challenge in real time.'
    },
    {
        id: 'support',
        label: 'Support',
        shortLabel: 'Support',
        description: 'More guidance, more breathing room, and stronger clarity.'
    },
    {
        id: 'balanced',
        label: 'Flow',
        shortLabel: 'Flow',
        description: 'Stable pacing for clean repetition without overload.'
    },
    {
        id: 'challenge',
        label: 'Challenge',
        shortLabel: 'Challenge',
        description: 'Higher density and stretch when performance is strong.'
    }
];

const difficultyIndexMap = {
    Beginner: 0,
    Intermediate: 1,
    Advanced: 2
};

const difficultyScale = ['Beginner', 'Intermediate', 'Advanced'];

const shiftDifficulty = (difficulty = 'Intermediate', delta = 0) => {
    const currentIndex = difficultyIndexMap[difficulty] ?? 1;
    return difficultyScale[clamp(currentIndex + delta, 0, difficultyScale.length - 1)];
};

const roundSignal = (value) => Math.round(clamp(value, 0, 100));

const getDefaultModeFromProfile = ({ userLevel = 'Intermediate', userSkillScore = 50 }) => {
    if (userLevel === 'Beginner' || userSkillScore <= 35) return 'support';
    if (userLevel === 'Advanced' || userSkillScore >= 78) return 'challenge';
    return 'balanced';
};

const resolveAutoMode = ({
    userLevel = 'Intermediate',
    userSkillScore = 50,
    sessionAccuracy = 0,
    answeredCount = 0,
    focusScore = 70,
    idleGapSeconds = 0,
    averageTimePerAnswer = 50,
    uxTelemetry = {}
}) => {
    if (!answeredCount) {
        return getDefaultModeFromProfile({ userLevel, userSkillScore });
    }

    const errors = uxTelemetry.errors || 0;
    const hints = uxTelemetry.hints || 0;
    const retries = uxTelemetry.retries || 0;

    const supportPressure = clamp(
        ((100 - sessionAccuracy) * 0.45) +
        (errors * 9) +
        (hints * 7) +
        (retries * 6) +
        (Math.max(0, averageTimePerAnswer - 45) * 0.55) +
        (Math.max(0, idleGapSeconds - 12) * 0.85) +
        (Math.max(0, 65 - focusScore) * 0.75),
        0,
        100
    );

    const challengeReadiness = clamp(
        ((userSkillScore - 45) * 1.1) +
        (sessionAccuracy * 0.45) +
        (Math.max(0, 45 - averageTimePerAnswer) * 0.65) +
        (Math.max(0, focusScore - 70) * 0.8) -
        (hints * 8) -
        (errors * 10) -
        (retries * 6),
        0,
        100
    );

    if (supportPressure >= 58) {
        return 'support';
    }

    if (challengeReadiness >= 68 && sessionAccuracy >= 72 && focusScore >= 68) {
        return 'challenge';
    }

    return 'balanced';
};

const resolveDifficulty = ({
    userLevel = 'Intermediate',
    userSkillScore = 50,
    mode = 'balanced',
    answeredCount = 0,
    sessionAccuracy = 0,
    focusScore = 70
}) => {
    if (mode === 'support') {
        if (!answeredCount) {
            return userSkillScore <= 45 ? shiftDifficulty(userLevel, -1) : userLevel;
        }

        return sessionAccuracy < 70 || focusScore < 68
            ? shiftDifficulty(userLevel, -1)
            : userLevel;
    }

    if (mode === 'challenge') {
        if (!answeredCount) {
            return userSkillScore >= 82 ? shiftDifficulty(userLevel, 1) : userLevel;
        }

        return userSkillScore >= 60 && sessionAccuracy >= 80 && focusScore >= 72
            ? shiftDifficulty(userLevel, 1)
            : userLevel;
    }

    return userLevel;
};

const buildCoachCopy = ({
    mode,
    focusScore,
    sessionAccuracy,
    averageTimePerAnswer,
    recommendedDifficulty,
    remainingQuestions,
    selectedStage,
    sessionMode
}) => {
    if (mode === 'support') {
        return {
            eyebrow: 'Adaptive Support',
            headline: 'The interface is lowering friction so you can recover accuracy with confidence.',
            summary: `Targeting ${recommendedDifficulty} difficulty with calmer pacing, clearer structure, and guided hint access.`,
            microcopy: focusScore < 65
                ? 'You are not behind. Take one deliberate answer at a time and let clean recall lead this block.'
                : 'You are close to a stable rhythm. Use the extra guidance now, then step back up when answers feel lighter.',
            pacingLabel: averageTimePerAnswer > 60 ? 'Slow And Steady' : 'Guided Recovery',
            densityLabel: 'Relaxed Layout'
        };
    }

    if (mode === 'challenge') {
        return {
            eyebrow: 'Adaptive Challenge',
            headline: 'Performance is strong, so the interface is increasing precision pressure.',
            summary: `Targeting ${recommendedDifficulty} difficulty with tighter density and fewer safety rails.`,
            microcopy: sessionMode === 'stage' && selectedStage
                ? `You are in range to push Stage ${selectedStage} with high-confidence precision.`
                : 'Stay crisp and intentional. Cleaner submissions now will compound into durable mastery.',
            pacingLabel: averageTimePerAnswer <= 35 ? 'Fast Precision' : 'High Focus',
            densityLabel: 'Compact Layout'
        };
    }

    return {
        eyebrow: 'Adaptive Flow',
        headline: 'The interface is keeping you in the productive middle lane.',
        summary: `Targeting ${recommendedDifficulty} difficulty with balanced guidance and stable rhythm.`,
        microcopy: remainingQuestions > 0
            ? `Keep this block intact. ${remainingQuestions} question${remainingQuestions === 1 ? '' : 's'} remain in the current sequence.`
            : 'Signals are stable. Keep the same rhythm and let repetition do the work.',
        pacingLabel: sessionAccuracy >= 70 ? 'Stable Momentum' : 'Calibration Pass',
        densityLabel: 'Balanced Layout'
    };
};

const resolveConfidenceBand = ({
    mode,
    supportIntensity,
    challengeIntensity,
    sessionAccuracy,
    focusScore
}) => {
    if (
        mode === 'support' ||
        supportIntensity >= 64 ||
        sessionAccuracy < 62 ||
        focusScore < 60
    ) {
        return 'recovering';
    }

    if (
        mode === 'challenge' &&
        challengeIntensity >= 72 &&
        sessionAccuracy >= 78 &&
        focusScore >= 72
    ) {
        return 'momentum';
    }

    return 'steady';
};

const resolveAudioPrompt = ({
    mode,
    focusScore = 70,
    sessionAccuracy = 0
}) => {
    if (mode === 'support') {
        return {
            speakRate: focusScore < 60 ? 0.84 : 0.9,
            pitch: 0.98,
            pronunciationNudge: 'Run the pronunciation cue, then repeat once out loud before submitting.'
        };
    }

    if (mode === 'challenge') {
        return {
            speakRate: sessionAccuracy >= 85 ? 1.02 : 0.98,
            pitch: 1.04,
            pronunciationNudge: 'Use audio for a quick precision check, then answer from recall.'
        };
    }

    return {
        speakRate: 0.95,
        pitch: 1,
        pronunciationNudge: 'Tap audio to calibrate pronunciation before you lock your answer.'
    };
};

const resolveAdaptiveUx = ({
    mode,
    focusScore,
    sessionAccuracy,
    supportIntensity,
    challengeIntensity,
    immersiveMode
}) => {
    const confidenceBand = resolveConfidenceBand({
        mode,
        supportIntensity,
        challengeIntensity,
        sessionAccuracy,
        focusScore
    });

    const typographyScale = mode === 'support'
        ? 'comfort'
        : mode === 'challenge'
            ? 'compact'
            : 'balanced';

    const motionIntensity = mode === 'support'
        ? 'soft'
        : mode === 'challenge'
            ? (immersiveMode ? 'crisp' : 'balanced')
            : 'balanced';

    const panelDensityDesktop = mode === 'support'
        ? 'relaxed'
        : mode === 'challenge'
            ? 'compact'
            : 'balanced';
    const panelDensityMobile = panelDensityDesktop === 'compact' ? 'balanced' : panelDensityDesktop;

    const coachingTone = confidenceBand === 'recovering'
        ? 'reassuring'
        : confidenceBand === 'momentum'
            ? 'assertive'
            : 'steady';

    return {
        confidenceBand,
        coachingTone,
        typographyScale,
        motionIntensity,
        panelDensityDesktop,
        panelDensityMobile,
        panelDensity: panelDensityDesktop,
        audioPrompt: resolveAudioPrompt({ mode, focusScore, sessionAccuracy })
    };
};

export function buildAdaptiveSessionModel({
    userLevel = 'Intermediate',
    userSkillScore = 50,
    sessionMode = 'category',
    selectedStage = null,
    answeredCount = 0,
    remainingQuestions = 0,
    sessionAccuracy = 0,
    averageTimePerAnswer = 50,
    idleGapSeconds = 0,
    fluencyTrajectory = 50,
    focusScore = 70,
    sessionMasteryEtaMinutes = 5,
    uxTelemetry = {},
    immersiveMode = false,
    modePreference = 'auto'
} = {}) {
    const resolvedMode = modePreference === 'auto'
        ? resolveAutoMode({
            userLevel,
            userSkillScore,
            sessionAccuracy,
            answeredCount,
            focusScore,
            idleGapSeconds,
            averageTimePerAnswer,
            uxTelemetry
        })
        : modePreference;

    const recommendedDifficulty = resolveDifficulty({
        userLevel,
        userSkillScore,
        mode: resolvedMode,
        answeredCount,
        sessionAccuracy,
        focusScore
    });

    const hints = uxTelemetry.hints || 0;
    const errors = uxTelemetry.errors || 0;
    const retries = uxTelemetry.retries || 0;
    const interactions = uxTelemetry.interactions || 0;

    const supportIntensity = roundSignal(
        ((100 - sessionAccuracy) * 0.4) +
        (errors * 10) +
        (hints * 7) +
        (retries * 6) +
        (Math.max(0, averageTimePerAnswer - 45) * 0.5) +
        (Math.max(0, idleGapSeconds - 12) * 0.8)
    );

    const challengeIntensity = roundSignal(
        ((userSkillScore - 40) * 0.9) +
        (sessionAccuracy * 0.45) +
        (Math.max(0, 45 - averageTimePerAnswer) * 0.6) +
        (focusScore * 0.25) +
        (interactions * 0.4) -
        (hints * 8) -
        (errors * 9)
    );

    const coach = buildCoachCopy({
        mode: resolvedMode,
        focusScore,
        sessionAccuracy,
        averageTimePerAnswer,
        recommendedDifficulty,
        remainingQuestions,
        selectedStage,
        sessionMode
    });

    const reasons = [
        `${focusScore}/100 focus score`,
        `${sessionAccuracy}% session accuracy`,
        `${averageTimePerAnswer}s average answer pace`
    ];

    if (hints > 0) reasons.push(`${hints} hint request${hints === 1 ? '' : 's'} detected`);
    if (errors > 0) reasons.push(`${errors} answer error${errors === 1 ? '' : 's'} detected`);
    if (idleGapSeconds > 12) reasons.push(`${idleGapSeconds}s idle gap suggests attention drift`);

    const adaptiveUx = resolveAdaptiveUx({
        mode: resolvedMode,
        focusScore,
        sessionAccuracy,
        supportIntensity,
        challengeIntensity,
        immersiveMode
    });

    return {
        modePreference,
        mode: resolvedMode,
        recommendedDifficulty,
        supportIntensity,
        challengeIntensity,
        confidenceBand: adaptiveUx.confidenceBand,
        coachingTone: adaptiveUx.coachingTone,
        focusScore,
        fluencyTrajectory,
        sessionAccuracy,
        averageTimePerAnswer,
        sessionMasteryEtaMinutes,
        immersiveMode,
        coach,
        reasons,
        ui: {
            showHintsByDefault: resolvedMode === 'support' || userLevel === 'Beginner',
            showStepGuidance: resolvedMode === 'support' || userLevel === 'Beginner',
            emphasizeAudio: resolvedMode !== 'challenge',
            singleColumnOptions: resolvedMode === 'support',
            compactMode: resolvedMode === 'challenge',
            lessonTone: resolvedMode,
            density: adaptiveUx.panelDensity,
            typographyScale: adaptiveUx.typographyScale,
            motionIntensity: adaptiveUx.motionIntensity,
            panelDensityDesktop: adaptiveUx.panelDensityDesktop,
            panelDensityMobile: adaptiveUx.panelDensityMobile,
            audioPrompt: adaptiveUx.audioPrompt,
            chromeStyle: immersiveMode
                ? 'immersive'
                : resolvedMode === 'support'
                    ? 'supportive'
                    : resolvedMode === 'challenge'
                        ? 'precision'
                        : 'balanced'
        }
    };
}
