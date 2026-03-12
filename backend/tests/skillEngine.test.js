const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateSkillScore, getLevel } = require('../utils/skillEngine');

test('calculateSkillScore returns current score when attempts are empty', () => {
    const result = calculateSkillScore([], 42);
    assert.equal(result.skillScore, 42);
    assert.equal(result.level, 'Intermediate');
});

test('calculateSkillScore rewards consistently correct and efficient attempts', () => {
    const attempts = Array.from({ length: 20 }, () => ({
        score: 1,
        time_spent: 20,
        errors: 0,
        hints_used: 0
    }));

    const result = calculateSkillScore(attempts, 50);
    assert.ok(result.skillScore > 50);
    assert.equal(result.level, 'Intermediate');
    assert.equal(result.details.successRate, 100);
});

test('calculateSkillScore heavily penalizes poor performance and clamps score', () => {
    const attempts = Array.from({ length: 20 }, () => ({
        score: 0,
        time_spent: 400,
        errors: 50,
        hints_used: 50
    }));

    const result = calculateSkillScore(attempts, 20);
    assert.ok(result.skillScore >= 0 && result.skillScore <= 100);
    assert.equal(result.level, 'Beginner');
});

test('getLevel maps boundaries correctly', () => {
    assert.equal(getLevel(0), 'Beginner');
    assert.equal(getLevel(30), 'Beginner');
    assert.equal(getLevel(31), 'Intermediate');
    assert.equal(getLevel(70), 'Intermediate');
    assert.equal(getLevel(71), 'Advanced');
    assert.equal(getLevel(100), 'Advanced');
});
