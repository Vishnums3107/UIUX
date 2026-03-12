const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateSpacedReviewSchedule } = require('../utils/spacedRepetition');

const buildAttempt = ({
    createdAt,
    score = 1,
    errors = 0,
    hints_used = 0,
    time_spent = 12
}) => ({
    createdAt,
    score,
    errors,
    hints_used,
    time_spent
});

test('spaced repetition marks incorrect latest attempt as immediately due', () => {
    const now = new Date('2026-03-11T12:00:00.000Z');
    const schedule = calculateSpacedReviewSchedule([
        buildAttempt({
            createdAt: new Date('2026-03-11T10:00:00.000Z'),
            score: 0,
            errors: 2,
            hints_used: 1
        })
    ], now);

    assert.equal(schedule.isDue, true);
    assert.equal(schedule.intervalHours, 0);
    assert.equal(schedule.reason, 'last_attempt_incorrect');
    assert.equal(schedule.latestAttemptCorrect, false);
});

test('spaced repetition keeps recent strong streaks out of the queue', () => {
    const now = new Date('2026-03-11T12:00:00.000Z');
    const schedule = calculateSpacedReviewSchedule([
        buildAttempt({ createdAt: new Date('2026-03-11T10:00:00.000Z'), score: 1, time_spent: 9 }),
        buildAttempt({ createdAt: new Date('2026-03-11T04:00:00.000Z'), score: 1, time_spent: 10 }),
        buildAttempt({ createdAt: new Date('2026-03-10T20:00:00.000Z'), score: 1, time_spent: 10 })
    ], now);

    assert.equal(schedule.isDue, false);
    assert.equal(schedule.reason, 'scheduled_review_due');
    assert.ok(schedule.intervalHours >= 24);
    assert.ok(new Date(schedule.dueAt).getTime() > now.getTime());
});

test('spaced repetition surfaces older successful lessons once their interval has elapsed', () => {
    const now = new Date('2026-03-11T12:00:00.000Z');
    const schedule = calculateSpacedReviewSchedule([
        buildAttempt({
            createdAt: new Date('2026-03-07T08:00:00.000Z'),
            score: 1,
            errors: 0,
            hints_used: 0
        }),
        buildAttempt({
            createdAt: new Date('2026-03-06T08:00:00.000Z'),
            score: 1,
            errors: 1,
            hints_used: 1
        })
    ], now);

    assert.equal(schedule.isDue, true);
    assert.equal(schedule.reason, 'scheduled_review_due');
    assert.ok(schedule.intervalHours > 0);
    assert.ok(schedule.overdueHours > 0);
});
