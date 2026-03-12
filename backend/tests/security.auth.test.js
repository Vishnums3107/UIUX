const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const createApp = require('../app');
const User = require('../models/User');
const {
    loginRateLimiter,
    forgotPasswordRateLimiter,
    resetPasswordRateLimiter
} = require('../middleware/rateLimiters');

let mongoServer;
let app;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

const TEST_USER = {
    name: 'Secure User',
    email: 'secure@example.com',
    password: 'password123'
};

test.before(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.JWT_EXPIRE = '1d';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'security-tests' });
    app = createApp();
});

test.after(async () => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

test.beforeEach(async () => {
    await User.deleteMany({});
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.MAIL_FROM;
    delete process.env.AUTH_LOCKOUT_ENABLED;
    delete process.env.AUTH_LOCKOUT_MAX_ATTEMPTS;
    delete process.env.AUTH_LOCKOUT_MINUTES;
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;

    // Ensure auth route-specific rate limits do not leak state between tests.
    for (const key of ['::ffff:127.0.0.1', '::1']) {
        loginRateLimiter.resetKey(key);
        forgotPasswordRateLimiter.resetKey(key);
        resetPasswordRateLimiter.resetKey(key);
    }
});

async function registerUser() {
    const response = await request(app).post('/api/auth/register').send(TEST_USER);
    assert.equal(response.status, 201);
    return response.body;
}

test('production forgot-password fails closed uniformly when SMTP is not configured', async () => {
    process.env.NODE_ENV = 'production';
    await registerUser();

    const knownResponse = await request(app)
        .post('/api/auth/forgotpassword')
        .send({ email: TEST_USER.email });

    const unknownResponse = await request(app)
        .post('/api/auth/forgotpassword')
        .send({ email: 'unknown@example.com' });

    assert.equal(knownResponse.status, 500);
    assert.equal(unknownResponse.status, 500);
    assert.equal(knownResponse.body.error, 'Password reset is temporarily unavailable.');
    assert.equal(unknownResponse.body.error, 'Password reset is temporarily unavailable.');

    const storedUser = await User.findOne({ email: TEST_USER.email });
    assert.equal(storedUser.resetPasswordToken, undefined);
    assert.equal(storedUser.resetPasswordExpire, undefined);
});

test('production reset-password rejects invalid token with generic response', async () => {
    process.env.NODE_ENV = 'production';

    const response = await request(app)
        .put('/api/auth/resetpassword/invalid-token')
        .send({ password: 'newPassword123' });

    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'Invalid or expired token');
});

test('reset token is one-time use and old password is invalid after reset', async () => {
    process.env.NODE_ENV = 'production';
    await registerUser();

    const user = await User.findOne({ email: TEST_USER.email }).select('+password');
    const rawResetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetResponse = await request(app)
        .put(`/api/auth/resetpassword/${rawResetToken}`)
        .send({ password: 'newPassword123' });

    assert.equal(resetResponse.status, 200);
    assert.equal(resetResponse.body.success, true);
    assert.ok(resetResponse.body.token);

    const reusedTokenResponse = await request(app)
        .put(`/api/auth/resetpassword/${rawResetToken}`)
        .send({ password: 'anotherPassword123' });
    assert.equal(reusedTokenResponse.status, 400);
    assert.equal(reusedTokenResponse.body.error, 'Invalid or expired token');

    const oldPasswordLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });
    assert.equal(oldPasswordLogin.status, 401);

    const newPasswordLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: 'newPassword123' });
    assert.equal(newPasswordLogin.status, 200);
    assert.ok(newPasswordLogin.body.token);
});

test('security headers and correlation id are included in responses', async () => {
    const response = await request(app).get('/api/health');

    assert.equal(response.status, 200);
    assert.ok(response.headers['x-request-id']);
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['x-frame-options'], 'SAMEORIGIN');
});

test('login endpoint enforces route-specific rate limiting', async () => {
    for (let i = 0; i < 10; i += 1) {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: 'missing@example.com', password: 'wrong-password' });
        assert.equal(response.status, 401);
    }

    const rateLimited = await request(app)
        .post('/api/auth/login')
        .send({ email: 'missing@example.com', password: 'wrong-password' });

    assert.equal(rateLimited.status, 429);
    assert.equal(rateLimited.body.error, 'Too many login attempts. Please try again later.');
});

test('login lockout is enforced after repeated failed attempts and clears after expiry', async () => {
    process.env.AUTH_LOCKOUT_ENABLED = 'true';
    process.env.AUTH_LOCKOUT_MAX_ATTEMPTS = '3';
    process.env.AUTH_LOCKOUT_MINUTES = '15';
    await registerUser();

    for (let i = 0; i < 2; i += 1) {
        const failedLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: 'wrong-password' });
        assert.equal(failedLogin.status, 401);
        assert.equal(failedLogin.body.error, 'Invalid email or password.');
    }

    const lockoutTrigger = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: 'wrong-password' });
    assert.equal(lockoutTrigger.status, 429);
    assert.equal(lockoutTrigger.body.error, 'Too many login attempts. Try again later.');

    const lockedCorrectPassword = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });
    assert.equal(lockedCorrectPassword.status, 429);

    await User.updateOne(
        { email: TEST_USER.email },
        { $set: { lock_until: new Date(Date.now() - 1000), failed_login_attempts: 0 } }
    );

    const successfulLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });
    assert.equal(successfulLogin.status, 200);
    assert.ok(successfulLogin.body.token);
});
