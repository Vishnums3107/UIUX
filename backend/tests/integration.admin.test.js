const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const createApp = require('../app');
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const LessonAttempt = require('../models/LessonAttempt');

let mongoServer;
let app;

const DEFAULT_PASSWORD = 'password123';

test.before(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.JWT_EXPIRE = '1d';
    process.env.FRONTEND_URL = 'http://localhost:5173';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'admin-integration-tests' });
    app = createApp();
});

test.after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

test.beforeEach(async () => {
    await Promise.all([
        User.deleteMany({}),
        Lesson.deleteMany({}),
        LessonAttempt.deleteMany({})
    ]);
});

async function registerUser({ name, email, password = DEFAULT_PASSWORD }) {
    const registerRes = await request(app).post('/api/auth/register').send({ name, email, password });
    assert.equal(registerRes.status, 201);
    return {
        token: registerRes.body.token,
        user: registerRes.body.user
    };
}

async function promoteToAdmin(userId) {
    await User.findByIdAndUpdate(userId, { role: 'admin' });
}

function approxEqual(actual, expected, tolerance = 0.01) {
    return Math.abs(actual - expected) <= tolerance;
}

test('admin endpoints enforce authentication and admin role', async () => {
    const normal = await registerUser({
        name: 'Normal User',
        email: 'normal@example.com'
    });
    const target = await registerUser({
        name: 'Target User',
        email: 'target@example.com'
    });

    const unauthenticated = await request(app).get('/api/admin/analytics');
    assert.equal(unauthenticated.status, 401);

    const endpoints = [
        '/api/admin/users',
        '/api/admin/analytics',
        `/api/admin/users/${target.user.id}/progress`
    ];

    for (const endpoint of endpoints) {
        const response = await request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${normal.token}`);
        assert.equal(response.status, 403, `Expected 403 for endpoint ${endpoint}`);
    }
});

test('admin analytics aggregates users and recent activity correctly', async () => {
    const admin = await registerUser({ name: 'Admin', email: 'admin@example.com' });
    const userA = await registerUser({ name: 'User A', email: 'usera@example.com' });
    const userB = await registerUser({ name: 'User B', email: 'userb@example.com' });

    await promoteToAdmin(admin.user.id);

    await Promise.all([
        User.findByIdAndUpdate(admin.user.id, { skill_score: 80, lessons_completed: 20, level: 'Advanced' }),
        User.findByIdAndUpdate(userA.user.id, { skill_score: 40, lessons_completed: 10, level: 'Intermediate' }),
        User.findByIdAndUpdate(userB.user.id, { skill_score: 20, lessons_completed: 4, level: 'Beginner' })
    ]);

    const lesson = await Lesson.create({
        category: 'uyir',
        difficulty: 'Beginner',
        type: 'mcq',
        question: 'What is first Tamil vowel?',
        question_tamil: 'முதல் உயிர் எழுத்து?',
        options: ['அ', 'ஆ', 'இ'],
        correct_answer: 'அ',
        hint: 'Starts the vowel order',
        explanation: 'அ is the first Tamil vowel.'
    });

    const now = new Date();
    const oldDate = new Date(Date.now() - (8 * 24 * 60 * 60 * 1000));
    const todayUtc = now.toISOString().slice(0, 10);

    await LessonAttempt.insertMany([
        {
            user_id: admin.user.id,
            lesson_id: lesson._id,
            time_spent: 12,
            errors: 0,
            hints_used: 0,
            retries: 0,
            idle_time: 0,
            score: 1,
            answer_given: 'அ',
            createdAt: now,
            updatedAt: now
        },
        {
            user_id: userA.user.id,
            lesson_id: lesson._id,
            time_spent: 25,
            errors: 1,
            hints_used: 1,
            retries: 1,
            idle_time: 0,
            score: 0,
            answer_given: 'ஆ',
            createdAt: now,
            updatedAt: now
        },
        {
            user_id: userB.user.id,
            lesson_id: lesson._id,
            time_spent: 18,
            errors: 0,
            hints_used: 0,
            retries: 0,
            idle_time: 0,
            score: 1,
            answer_given: 'அ',
            createdAt: now,
            updatedAt: now
        },
        {
            user_id: userB.user.id,
            lesson_id: lesson._id,
            time_spent: 15,
            errors: 0,
            hints_used: 0,
            retries: 0,
            idle_time: 0,
            score: 1,
            answer_given: 'அ',
            createdAt: oldDate,
            updatedAt: oldDate
        }
    ]);

    const analyticsRes = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${admin.token}`);

    assert.equal(analyticsRes.status, 200);
    assert.equal(analyticsRes.body.totalUsers, 3);

    const levelMap = Object.fromEntries(
        analyticsRes.body.levelDistribution.map((entry) => [entry._id, entry.count])
    );
    assert.equal(levelMap.Beginner, 1);
    assert.equal(levelMap.Intermediate, 1);
    assert.equal(levelMap.Advanced, 1);

    assert.ok(approxEqual(analyticsRes.body.averages.avgSkill, (80 + 40 + 20) / 3));
    assert.ok(approxEqual(analyticsRes.body.averages.avgLessons, (20 + 10 + 4) / 3));

    const totalRecentAttempts = analyticsRes.body.recentActivity.reduce((sum, row) => sum + row.attempts, 0);
    assert.equal(totalRecentAttempts, 3);

    const todayRow = analyticsRes.body.recentActivity.find((row) => row._id === todayUtc);
    assert.ok(todayRow, 'Expected recentActivity to include today row');
    assert.equal(todayRow.attempts, 3);
    assert.ok(approxEqual(todayRow.avgScore, 2 / 3));
});

test('admin user progress endpoint returns latest 50 attempts with populated lesson', async () => {
    const admin = await registerUser({ name: 'Admin', email: 'admin2@example.com' });
    const learner = await registerUser({ name: 'Learner', email: 'learner@example.com' });
    await promoteToAdmin(admin.user.id);

    const lesson = await Lesson.create({
        category: 'grammar',
        difficulty: 'Intermediate',
        type: 'mcq',
        question: 'Select correct pronoun',
        question_tamil: 'சரியான சார்புப்பெயரை தேர்ந்தெடு',
        options: ['நான்', 'நீ', 'அவன்'],
        correct_answer: 'நான்',
        hint: 'First person singular',
        explanation: 'நான் means I.'
    });

    const base = Date.now() - 60_000;
    const attempts = Array.from({ length: 55 }, (_, i) => ({
        user_id: learner.user.id,
        lesson_id: lesson._id,
        time_spent: 10 + i,
        errors: i % 2,
        hints_used: 0,
        retries: 0,
        idle_time: 0,
        score: i % 2 === 0 ? 1 : 0,
        answer_given: i % 2 === 0 ? 'நான்' : 'நீ',
        createdAt: new Date(base + (i * 1000)),
        updatedAt: new Date(base + (i * 1000))
    }));

    await LessonAttempt.insertMany(attempts);

    const progressRes = await request(app)
        .get(`/api/admin/users/${learner.user.id}/progress`)
        .set('Authorization', `Bearer ${admin.token}`);

    assert.equal(progressRes.status, 200);
    assert.equal(progressRes.body.user._id, learner.user.id);
    assert.equal(progressRes.body.attempts.length, 50);

    const firstAttempt = progressRes.body.attempts[0];
    const lastAttempt = progressRes.body.attempts[progressRes.body.attempts.length - 1];
    assert.ok(firstAttempt.lesson_id?.question, 'Expected populated lesson question');
    assert.ok(new Date(firstAttempt.createdAt) >= new Date(lastAttempt.createdAt), 'Expected descending createdAt order');
});
