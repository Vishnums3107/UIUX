const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateSkillScore, getLevel } = require('../utils/skillEngine');

const perfectAttempt = {
    score: 1,
    time_spent: 20,
    errors: 0,
    hints_used: 0,
    retries: 0,
    idle_time: 0
};

const poorAttempt = {
    score: 0,
    time_spent: 400,
    errors: 50,
    hints_used: 50,
    retries: 20,
    idle_time: 200
};

test('calculateSkillScore returns current score when attempts are empty', () => {
    const result = calculateSkillScore([], 42);
    assert.equal(result.skillScore, 42);
    assert.equal(result.level, 'Intermediate');
});

test('calculateSkillScore rewards consistently correct and efficient attempts', () => {
    const attempts = Array.from({ length: 20 }, () => ({ ...perfectAttempt }));

    const result = calculateSkillScore(attempts, 50);
    assert.ok(result.skillScore > 50);
    assert.equal(result.level, 'Advanced');
    assert.equal(result.details.successRate, 100);
    assert.equal(result.details.errorRate, 0);
    assert.equal(result.details.hintDependency, 0);
    assert.ok(result.details.rawScore >= 90);
});

test('calculateSkillScore heavily penalizes poor performance and clamps score', () => {
    const attempts = Array.from({ length: 20 }, () => ({ ...poorAttempt }));

    const result = calculateSkillScore(attempts, 20);
    assert.ok(result.skillScore >= 0 && result.skillScore <= 100);
    assert.equal(result.level, 'Beginner');
    assert.ok(result.details.rawScore <= 10);
    assert.equal(result.details.retryDependency, 100);
    assert.ok(result.details.idlePenalty >= 40);
});

test('calculateSkillScore applies confidence-aware smoothing for low sample sizes', () => {
    const oneAttempt = [{ ...perfectAttempt }];
    const fullWindow = Array.from({ length: 20 }, () => ({ ...perfectAttempt }));

    const lowConfidence = calculateSkillScore(oneAttempt, 50);
    const highConfidence = calculateSkillScore(fullWindow, 50);

    assert.ok(lowConfidence.details.confidence < highConfidence.details.confidence);
    assert.ok(lowConfidence.skillScore < highConfidence.skillScore);
});

test('calculateSkillScore applies recency weighting to emphasize recent trend', () => {
    const strongAttempt = {
        score: 1,
        time_spent: 24,
        errors: 0,
        hints_used: 0,
        retries: 0,
        idle_time: 2
    };
    const weakAttempt = {
        score: 0,
        time_spent: 55,
        errors: 2,
        hints_used: 1,
        retries: 1,
        idle_time: 10
    };

    const improvingTrend = [
        ...Array.from({ length: 10 }, () => ({ ...strongAttempt })),
        ...Array.from({ length: 10 }, () => ({ ...weakAttempt }))
    ];
    const decliningTrend = [
        ...Array.from({ length: 10 }, () => ({ ...weakAttempt })),
        ...Array.from({ length: 10 }, () => ({ ...strongAttempt }))
    ];

    const improvingResult = calculateSkillScore(improvingTrend, 50);
    const decliningResult = calculateSkillScore(decliningTrend, 50);

    assert.ok(improvingResult.skillScore > decliningResult.skillScore);
});

test('calculateSkillScore preserves existing details fields for API compatibility', () => {
    const attempts = Array.from({ length: 3 }, () => ({ ...perfectAttempt }));
    const result = calculateSkillScore(attempts, 50);

    assert.ok(Object.hasOwn(result.details, 'successRate'));
    assert.ok(Object.hasOwn(result.details, 'timeEfficiency'));
    assert.ok(Object.hasOwn(result.details, 'errorRate'));
    assert.ok(Object.hasOwn(result.details, 'hintDependency'));
    assert.ok(Object.hasOwn(result.details, 'rawScore'));
});

test('getLevel maps boundaries correctly', () => {
    assert.equal(getLevel(0), 'Beginner');
    assert.equal(getLevel(30), 'Beginner');
    assert.equal(getLevel(31), 'Intermediate');
    assert.equal(getLevel(70), 'Intermediate');
    assert.equal(getLevel(71), 'Advanced');
    assert.equal(getLevel(100), 'Advanced');
});
