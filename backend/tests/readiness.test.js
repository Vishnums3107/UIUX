const test = require('node:test');
const assert = require('node:assert/strict');

const { isOverallReady, buildReadinessReport, getDatabaseReadiness } = require('../utils/readiness');

test('isOverallReady requires database and required email checks', () => {
    assert.equal(
        isOverallReady({
            database: { ready: true },
            email: { ready: true, required: true }
        }),
        true
    );

    assert.equal(
        isOverallReady({
            database: { ready: true },
            email: { ready: false, required: false }
        }),
        true
    );

    assert.equal(
        isOverallReady({
            database: { ready: false },
            email: { ready: true, required: true }
        }),
        false
    );

    assert.equal(
        isOverallReady({
            database: { ready: true },
            email: { ready: false, required: true }
        }),
        false
    );
});

test('buildReadinessReport sets status from checks', () => {
    const report = buildReadinessReport({
        database: { ready: true, state: 'connected' },
        email: { ready: false, required: false, configured: false },
        timestamp: '2026-03-11T00:00:00.000Z'
    });

    assert.equal(report.status, 'ready');
    assert.equal(report.timestamp, '2026-03-11T00:00:00.000Z');
    assert.equal(report.checks.database.state, 'connected');
    assert.equal(report.checks.email.required, false);
});

test('getDatabaseReadiness maps mongoose readyState values', () => {
    const disconnected = getDatabaseReadiness({
        readyState: 0,
        name: 'test-db',
        host: 'localhost'
    });
    assert.equal(disconnected.ready, false);
    assert.equal(disconnected.state, 'disconnected');

    const connected = getDatabaseReadiness({
        readyState: 1,
        name: 'test-db',
        host: 'localhost'
    });
    assert.equal(connected.ready, true);
    assert.equal(connected.state, 'connected');
});
