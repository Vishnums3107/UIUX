const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const createApp = require('../app');

let app;

test.before(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    app = createApp();
});

test('telemetry endpoint accepts valid frontend runtime error payload', async () => {
    const response = await request(app)
        .post('/api/telemetry/frontend-error')
        .send({
            message: 'ChunkLoadError: Loading chunk 4 failed.',
            source: 'window.unhandledrejection',
            severity: 'high',
            stack: 'Error: ChunkLoadError\\n at app.js:1:1',
            context: {
                route: '/dashboard',
                component: 'Dashboard',
                release: '2026.04.20-rc1',
                href: 'https://app.example.com/dashboard'
            }
        });

    assert.equal(response.status, 202);
    assert.equal(response.body.accepted, true);
});

test('telemetry endpoint rejects invalid payloads', async () => {
    const response = await request(app)
        .post('/api/telemetry/frontend-error')
        .send({
            severity: 'urgent'
        });

    assert.equal(response.status, 400);
    assert.ok(Array.isArray(response.body.errors));
    assert.ok(response.body.errors.length >= 1);
});