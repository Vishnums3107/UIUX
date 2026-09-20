const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildAdaptiveProfile,
    buildCategoryRecommendations,
    getDefaultAdaptivePreferences,
    getDefaultAdaptiveProfile,
    normalizeAdaptivePreferences
} = require('../utils/adaptiveProfile');

test('default adaptive preferences are stable', () => {
    assert.deepEqual(getDefaultAdaptivePreferences(), {
        modePreference: 'auto',
        immersiveModeDefault: false
    });
});

test('default adaptive profile reflects baseline learner state', () => {
    const profile = getDefaultAdaptiveProfile({ level: 'Intermediate', skill_score: 50 });

    assert.equal(profile.recommendedMode, 'balanced');
    assert.equal(profile.recommendedDifficulty, 'Intermediate');
    assert.equal(profile.confidenceScore, 0);
});

test('adaptive profile recommends support for low-signal struggling learners', () => {
    const profile = buildAdaptiveProfile({
        user: { level: 'Intermediate', skill_score: 34 },
        skillDetails: {
            successRate: 38,
            timeEfficiency: 32,
            errorRate: 68,
            hintDependency: 55,
            retryDependency: 40,
            idlePenalty: 36,
            confidence: 60
        },
        recentAttempts: Array.from({ length: 8 }, () => ({ score: 0 }))
    });

    assert.equal(profile.recommendedMode, 'support');
    assert.equal(profile.recommendedDifficulty, 'Beginner');
    assert.ok(profile.supportNeed > profile.challengeReadiness);
});

test('adaptive profile recommends challenge for strong consistent learners', () => {
    const profile = buildAdaptiveProfile({
        user: { level: 'Intermediate', skill_score: 76 },
        skillDetails: {
            successRate: 94,
            timeEfficiency: 88,
            errorRate: 6,
            hintDependency: 4,
            retryDependency: 3,
            idlePenalty: 5,
            confidence: 80
        },
        recentAttempts: Array.from({ length: 16 }, () => ({ score: 1 }))
    });

    assert.equal(profile.recommendedMode, 'challenge');
    assert.equal(profile.recommendedDifficulty, 'Advanced');
    assert.ok(profile.challengeReadiness >= 68);
});

test('adaptive preference normalization rejects invalid values safely', () => {
    const normalized = normalizeAdaptivePreferences({
        modePreference: 'wildcard',
        immersiveModeDefault: 1
    });

    assert.equal(normalized.modePreference, 'auto');
    assert.equal(normalized.immersiveModeDefault, true);
});

test('category recommendations identify support and challenge lanes by topic', () => {
    const recommendations = buildCategoryRecommendations({
        user: { level: 'Intermediate' },
        recentAttempts: [
            { score: 0, errors: 3, hints_used: 2, retries: 2, lesson_id: { category: 'uyir' } },
            { score: 0, errors: 2, hints_used: 2, retries: 1, lesson_id: { category: 'uyir' } },
            { score: 1, errors: 0, hints_used: 0, retries: 0, lesson_id: { category: 'grammar' } },
            { score: 1, errors: 0, hints_used: 0, retries: 0, lesson_id: { category: 'grammar' } },
            { score: 1, errors: 0, hints_used: 0, retries: 0, lesson_id: { category: 'grammar' } }
        ]
    });

    assert.ok(Array.isArray(recommendations));
    assert.ok(recommendations.length >= 2);

    const uyir = recommendations.find((item) => item.category === 'uyir');
    const grammar = recommendations.find((item) => item.category === 'grammar');

    assert.ok(uyir);
    assert.equal(uyir.recommendedMode, 'support');
    assert.equal(uyir.recommendedDifficulty, 'Beginner');

    assert.ok(grammar);
    assert.notEqual(grammar.recommendedMode, 'support');
});
