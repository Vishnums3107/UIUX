import { buildAdaptiveSessionModel } from '../adaptiveUI';

describe('buildAdaptiveSessionModel', () => {
    test('defaults to support mode for beginner profiles', () => {
        const model = buildAdaptiveSessionModel({
            userLevel: 'Beginner',
            userSkillScore: 24
        });

        expect(model.mode).toBe('support');
        expect(model.recommendedDifficulty).toBe('Beginner');
        expect(model.confidenceBand).toBe('recovering');
        expect(model.ui.showHintsByDefault).toBe(true);
        expect(model.ui.typographyScale).toBe('comfort');
        expect(model.ui.audioPrompt.speakRate).toBeLessThan(1);
        expect(model.coach.eyebrow).toMatch(/Adaptive Support/i);
    });

    test('promotes challenge mode when recent signals are strong', () => {
        const model = buildAdaptiveSessionModel({
            userLevel: 'Intermediate',
            userSkillScore: 68,
            answeredCount: 6,
            remainingQuestions: 2,
            sessionAccuracy: 92,
            averageTimePerAnswer: 26,
            idleGapSeconds: 2,
            focusScore: 88,
            fluencyTrajectory: 76,
            sessionMasteryEtaMinutes: 3,
            uxTelemetry: {
                interactions: 18,
                hints: 0,
                errors: 0,
                retries: 0
            }
        });

        expect(model.mode).toBe('challenge');
        expect(model.recommendedDifficulty).toBe('Advanced');
        expect(model.ui.compactMode).toBe(true);
        expect(model.ui.panelDensityDesktop).toBe('compact');
        expect(model.ui.audioPrompt.pronunciationNudge).toMatch(/precision/i);
        expect(model.challengeIntensity).toBeGreaterThan(model.supportIntensity);
    });

    test('honors manual support mode preference', () => {
        const model = buildAdaptiveSessionModel({
            userLevel: 'Intermediate',
            userSkillScore: 40,
            modePreference: 'support',
            answeredCount: 0
        });

        expect(model.mode).toBe('support');
        expect(model.recommendedDifficulty).toBe('Beginner');
        expect(model.ui.singleColumnOptions).toBe(true);
        expect(model.ui.panelDensityMobile).toBe('relaxed');
    });
});
