const test = require('node:test');
const assert = require('node:assert/strict');

const { buildTopicIntelligence } = require('../utils/topicIntelligence');
const { buildLearningDirector } = require('../utils/learningDirector');

test('buildLearningDirector produces recovery plan for repeated struggle signals', () => {
    const now = Date.now();
    const user = {
        name: 'Priya',
        level: 'Intermediate',
        current_streak: 3,
        unlockedStages: [1, 2, 3],
        masteryPassedStages: [1]
    };

    const recentAttempts = [
        {
            score: 0,
            errors: 3,
            hints_used: 2,
            retries: 2,
            time_spent: 52,
            createdAt: new Date(now - (1 * 60 * 60 * 1000)),
            lesson_id: { category: 'uyir', stage: 2 }
        },
        {
            score: 0,
            errors: 2,
            hints_used: 1,
            retries: 1,
            time_spent: 46,
            createdAt: new Date(now - (2 * 60 * 60 * 1000)),
            lesson_id: { category: 'uyir', stage: 2 }
        },
        {
            score: 0,
            errors: 2,
            hints_used: 1,
            retries: 1,
            time_spent: 41,
            createdAt: new Date(now - (3 * 60 * 60 * 1000)),
            lesson_id: { category: 'uyir', stage: 2 }
        },
        {
            score: 0,
            errors: 1,
            hints_used: 1,
            retries: 1,
            time_spent: 39,
            createdAt: new Date(now - (4 * 60 * 60 * 1000)),
            lesson_id: { category: 'grammar', stage: 2 }
        },
        {
            score: 1,
            errors: 0,
            hints_used: 0,
            retries: 0,
            time_spent: 18,
            createdAt: new Date(now - (6 * 60 * 60 * 1000)),
            lesson_id: { category: 'grammar', stage: 2 }
        }
    ];

    const stageProgress = [
        { stage: 1, unlocked: true, masteryPassed: true },
        { stage: 2, unlocked: true, masteryPassed: false }
    ];

    const topicIntelligence = buildTopicIntelligence({ user, recentAttempts, stageProgress });
    const director = buildLearningDirector({ user, recentAttempts, stageProgress, topicIntelligence });

    assert.equal(director.activeStage, 2);
    assert.ok(Array.isArray(director.stageConfidenceBands));
    assert.ok(Array.isArray(director.nextBestSessions));
    assert.ok(Array.isArray(director.recoveryPlan.plan));
    assert.equal(director.recoveryPlan.required, true);
    assert.ok(director.recoveryPlan.focusAreas.length >= 1);
    assert.ok(director.nextBestSessions[0].actionPath.startsWith('/learn'));
    assert.ok(typeof director.masteryForecast.readinessPercent === 'number');
});

test('buildLearningDirector emits stable workload and learning arc for confident learners', () => {
    const now = Date.now();
    const user = {
        name: 'Arun',
        level: 'Advanced',
        current_streak: 12,
        unlockedStages: [1, 2, 3, 4, 5, 6, 7, 8],
        masteryPassedStages: [1, 2, 3, 4, 5, 6, 7]
    };

    const recentAttempts = Array.from({ length: 10 }).map((_, index) => ({
        score: 1,
        errors: 0,
        hints_used: 0,
        retries: 0,
        time_spent: 12 + (index % 3),
        createdAt: new Date(now - ((index + 1) * 60 * 60 * 1000)),
        lesson_id: { category: index % 2 === 0 ? 'sentences' : 'grammar', stage: 8 }
    }));

    const stageProgress = [
        { stage: 8, unlocked: true, masteryPassed: false }
    ];

    const topicIntelligence = buildTopicIntelligence({ user, recentAttempts, stageProgress });
    const director = buildLearningDirector({ user, recentAttempts, stageProgress, topicIntelligence });

    assert.equal(director.recoveryPlan.required, false);
    assert.ok(director.workloadPlan.recommendedSessionsPerDay >= 2);
    assert.equal(director.learningArc.arcName, 'Precision Fluency Arc');
    assert.ok(Array.isArray(director.learningArc.milestones));
    assert.ok(director.masteryForecast.greenFlags.length >= 1);
});
