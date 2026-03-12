const test = require('node:test');
const assert = require('node:assert/strict');

const {
    hasEmailConfig,
    buildPasswordResetUrl,
    getEmailReadiness
} = require('../utils/email');

const ORIGINAL_ENV = { ...process.env };

test.afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
});

test('hasEmailConfig returns false when required SMTP variables are missing', () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.MAIL_FROM;

    assert.equal(hasEmailConfig(), false);
});

test('hasEmailConfig returns true when required SMTP variables are set', () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    process.env.MAIL_FROM = 'noreply@example.com';

    assert.equal(hasEmailConfig(), true);
});

test('buildPasswordResetUrl prefers PASSWORD_RESET_URL when configured', () => {
    process.env.PASSWORD_RESET_URL = 'https://app.example.com/resetpassword/';
    process.env.FRONTEND_URL = 'https://ignored.example.com';

    const result = buildPasswordResetUrl('abc123');
    assert.equal(result, 'https://app.example.com/resetpassword/abc123');
});

test('buildPasswordResetUrl falls back to FRONTEND_URL when PASSWORD_RESET_URL is not set', () => {
    delete process.env.PASSWORD_RESET_URL;
    process.env.FRONTEND_URL = 'https://app.example.com';

    const result = buildPasswordResetUrl('abc123');
    assert.equal(result, 'https://app.example.com/resetpassword/abc123');
});

test('buildPasswordResetUrl falls back to localhost when FRONTEND_URL is wildcard', () => {
    delete process.env.PASSWORD_RESET_URL;
    process.env.FRONTEND_URL = '*';

    const result = buildPasswordResetUrl('abc123');
    assert.equal(result, 'http://localhost:5173/resetpassword/abc123');
});

test('getEmailReadiness is not required in non-production when SMTP is not configured', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.MAIL_FROM;

    const readiness = await getEmailReadiness();
    assert.equal(readiness.ready, false);
    assert.equal(readiness.required, false);
    assert.equal(readiness.reason, 'not_configured');
});

test('getEmailReadiness is required in production when SMTP is not configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.MAIL_FROM;

    const readiness = await getEmailReadiness();
    assert.equal(readiness.ready, false);
    assert.equal(readiness.required, true);
    assert.equal(readiness.reason, 'not_configured');
});

test('getEmailReadiness returns ready when configured and verification is disabled', async () => {
    process.env.NODE_ENV = 'test';
    process.env.READINESS_EMAIL_VERIFY = 'false';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    process.env.MAIL_FROM = 'noreply@example.com';

    const readiness = await getEmailReadiness();
    assert.equal(readiness.ready, true);
    assert.equal(readiness.verification, 'skipped');
});
