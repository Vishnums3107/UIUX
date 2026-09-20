const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildTopicIntelligence,
    buildReviewPriorityMap,
    resolveActiveStage
} = require('../utils/topicIntelligence');

test('resolveActiveStage prefers unlocked stage without mastery pass', () => {
    const stage = resolveActiveStage({
        user: {
            unlockedStages: [1, 2, 3],
            masteryPassedStages: [1]
        }
    });

    assert.equal(stage, 2);
});

test('buildTopicIntelligence returns support lane for weak category signals', () => {
    const now = Date.now();
    const intelligence = buildTopicIntelligence({
        user: {
            level: 'Intermediate',
            unlockedStages: [1, 2, 3],
            masteryPassedStages: [1]
        },
        recentAttempts: [
            {
                score: 0,
                errors: 3,
                hints_used: 2,
                retries: 2,
                time_spent: 26,
                createdAt: new Date(now - (8 * 60 * 60 * 1000)),
                lesson_id: { category: 'uyir', stage: 2 }
            },
            {
                score: 0,
                errors: 2,
                hints_used: 2,
                retries: 1,
                time_spent: 28,
                createdAt: new Date(now - (6 * 60 * 60 * 1000)),
                lesson_id: { category: 'uyir', stage: 2 }
            },
            {
                score: 1,
                errors: 0,
                hints_used: 0,
                retries: 0,
                time_spent: 11,
                createdAt: new Date(now - (3 * 60 * 60 * 1000)),
                lesson_id: { category: 'grammar', stage: 2 }
            }
        ]
    });

    assert.equal(intelligence.activeStage, 2);
    assert.ok(Array.isArray(intelligence.categoryMasteryMap));
    assert.ok(Array.isArray(intelligence.stageCategoryRecommendations));
    assert.ok(Array.isArray(intelligence.sequencingPlan));
    assert.ok(intelligence.sequencingPlan.length >= 1);

    const uyir = intelligence.categoryMasteryMap.find((item) => item.category === 'uyir');
    assert.ok(uyir);
    assert.equal(uyir.recommendedMode, 'support');
    assert.ok(uyir.weaknessPressure >= 58);
});

test('buildReviewPriorityMap increases queue weight for support topics', () => {
    const map = buildReviewPriorityMap({
        categoryMasteryMap: [
            {
                category: 'uyir',
                recommendedMode: 'support',
                weaknessPressure: 80,
                confidenceScore: 30,
                recencyPressure: 50
            },
            {
                category: 'grammar',
                recommendedMode: 'challenge',
                weaknessPressure: 30,
                confidenceScore: 80,
                recencyPressure: 10
            }
        ]
    });

    assert.ok(map.uyir > map.grammar);
    assert.ok(map.uyir > 0);
});
