const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const createApp = require('../app');

let mongoServer;
let app;

test.before(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.JWT_EXPIRE = '1d';
    process.env.FRONTEND_URL = 'http://localhost:5173';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'health-readiness-tests' });
    app = createApp();
});

test.after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

test('GET /api/health returns liveness payload', async () => {
    const response = await request(app).get('/api/health');

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ok');
    assert.ok(typeof response.body.timestamp === 'string');
    assert.ok(Number.isInteger(response.body.uptimeSeconds));
    assert.ok(response.body.uptimeSeconds >= 0);
});

test('GET /api/readiness returns 200 when readiness report is ready', async () => {
    const readyApp = createApp({
        getReadinessReport: async () => ({
            status: 'ready',
            timestamp: new Date().toISOString(),
            checks: {
                database: { ready: true, state: 'connected' },
                email: { ready: true, required: true, configured: true, verification: 'ok' }
            }
        })
    });

    const response = await request(readyApp).get('/api/readiness');

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ready');
    assert.equal(response.body.checks.database.ready, true);
    assert.equal(response.body.checks.email.ready, true);
});

test('GET /api/readiness returns 503 when readiness report is not ready', async () => {
    const notReadyApp = createApp({
        getReadinessReport: async () => ({
            status: 'not_ready',
            timestamp: new Date().toISOString(),
            checks: {
                database: { ready: true, state: 'connected' },
                email: { ready: false, required: true, configured: false, reason: 'not_configured' }
            }
        })
    });

    const response = await request(notReadyApp).get('/api/readiness');

    assert.equal(response.status, 503);
    assert.equal(response.body.status, 'not_ready');
    assert.equal(response.body.checks.email.required, true);
    assert.equal(response.body.checks.email.reason, 'not_configured');
});
