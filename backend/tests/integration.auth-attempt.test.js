const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const createApp = require('../app');
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const LessonAttempt = require('../models/LessonAttempt');
const ReviewCompletion = require('../models/ReviewCompletion');
const ReviewState = require('../models/ReviewState');

let mongoServer;
let app;

const TEST_USER = {
    name: 'Priya',
    email: 'priya@example.com',
    password: 'password123'
};

test.before(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.JWT_EXPIRE = '1d';
    process.env.FRONTEND_URL = 'http://localhost:5173';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'integration-tests' });
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
        LessonAttempt.deleteMany({}),
        ReviewCompletion.deleteMany({}),
        ReviewState.deleteMany({})
    ]);
});

async function registerAndGetToken() {
    const registerRes = await request(app).post('/api/auth/register').send(TEST_USER);
    assert.equal(registerRes.status, 201);
    assert.ok(registerRes.body.token);
    return registerRes.body.token;
}

test('auth flow: register, login, and get profile with JWT', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(TEST_USER);
    assert.equal(registerRes.status, 201);
    assert.ok(registerRes.body.token);
    assert.equal(registerRes.body.user.email, TEST_USER.email);

    const loginRes = await request(app).post('/api/auth/login').send({
        email: TEST_USER.email,
        password: TEST_USER.password
    });
    assert.equal(loginRes.status, 200);
    assert.ok(loginRes.body.token);

    const profileRes = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${loginRes.body.token}`);
    assert.equal(profileRes.status, 200);
    assert.equal(profileRes.body.email, TEST_USER.email);
});

test('forgot-password flow keeps generic response and provides dev reset token for known user', async () => {
    await request(app).post('/api/auth/register').send(TEST_USER);

    const unknownRes = await request(app).post('/api/auth/forgotpassword').send({
        email: 'missing@example.com'
    });
    assert.equal(unknownRes.status, 200);
    assert.equal(
        unknownRes.body.message,
        'If an account with that email exists, a reset link has been sent.'
    );
    assert.equal(unknownRes.body.resetToken, undefined);

    const knownRes = await request(app).post('/api/auth/forgotpassword').send({
        email: TEST_USER.email
    });
    assert.equal(knownRes.status, 200);
    assert.equal(
        knownRes.body.message,
        'If an account with that email exists, a reset link has been sent.'
    );
    assert.ok(knownRes.body.resetToken);
});

test('attempt flow: submit attempt stores answer and increments lessons completed', async () => {
    const token = await registerAndGetToken();

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

    const attemptPayload = {
        lesson_id: String(lesson._id),
        time_spent: 15,
        errors: 0,
        hints_used: 0,
        retries: 0,
        idle_time: 0,
        score: 1,
        answer_given: 'அ'
    };

    const submitRes = await request(app)
        .post('/api/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send(attemptPayload);

    assert.equal(submitRes.status, 201);
    assert.equal(submitRes.body.attempt.score, 1);
    assert.equal(submitRes.body.skillUpdate.lessons_completed, 1);

    const storedAttempt = await LessonAttempt.findOne({ lesson_id: lesson._id });
    assert.ok(storedAttempt);
    assert.equal(storedAttempt.answer_given, 'அ');

    const reviewState = await ReviewState.findOne({ user_id: storedAttempt.user_id, lesson_id: lesson._id });
    assert.ok(reviewState);
    assert.equal(reviewState.latestAttemptCorrect, true);
    assert.ok(reviewState.dueAt);

    const updatedUser = await User.findOne({ email: TEST_USER.email });
    assert.equal(updatedUser.lessons_completed, 1);
});

test('correctly clearing a due review stores review completion history', async () => {
    const token = await registerAndGetToken();
    const user = await User.findOne({ email: TEST_USER.email });

    const lesson = await Lesson.create({
        category: 'uyir',
        difficulty: 'Beginner',
        type: 'mcq',
        question: 'Due review lesson',
        question_tamil: 'Due review lesson tamil',
        options: ['A', 'B', 'C'],
        correct_answer: 'A',
        hint: 'Hint',
        explanation: 'Explanation'
    });

    await ReviewState.create({
        user_id: user._id,
        lesson_id: lesson._id,
        attemptCount: 1,
        avgScore: 0,
        avgErrors: 2,
        avgHints: 1,
        consecutiveCorrect: 0,
        lapses: 1,
        easeFactor: 1.9,
        intervalHours: 0,
        dueAt: new Date(Date.now() - (60 * 60 * 1000)),
        priority: 100,
        reason: 'last_attempt_incorrect',
        lastAttemptedAt: new Date(Date.now() - (2 * 60 * 60 * 1000)),
        latestAttemptCorrect: false
    });

    const submitRes = await request(app)
        .post('/api/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
            lesson_id: String(lesson._id),
            time_spent: 20,
            errors: 0,
            hints_used: 0,
            retries: 0,
            idle_time: 0,
            score: 1,
            answer_given: 'A'
        });

    assert.equal(submitRes.status, 201);
    assert.equal(submitRes.body.reviewProgress.clearedToday, 1);
    assert.equal(submitRes.body.reviewProgress.currentStreak, 1);

    const completion = await ReviewCompletion.findOne({ user_id: user._id, lesson_id: lesson._id });
    assert.ok(completion);
    assert.equal(completion.wasOverdue, true);
});

test('review queue returns due lessons using spaced repetition timing', async () => {
    const token = await registerAndGetToken();
    const user = await User.findOne({ email: TEST_USER.email });
    const now = Date.now();

    const [failedLesson, dueLesson, strongLesson] = await Lesson.create([
        {
            category: 'uyir',
            difficulty: 'Beginner',
            type: 'mcq',
            question: 'Failed lesson',
            question_tamil: 'Failed lesson tamil',
            options: ['A', 'B', 'C'],
            correct_answer: 'A',
            hint: 'Hint',
            explanation: 'Explanation'
        },
        {
            category: 'grammar',
            difficulty: 'Intermediate',
            type: 'text',
            question: 'Due lesson',
            question_tamil: 'Due lesson tamil',
            correct_answer: 'answer',
            hint: 'Hint',
            explanation: 'Explanation'
        },
        {
            category: 'sentences',
            difficulty: 'Intermediate',
            type: 'text',
            question: 'Strong lesson',
            question_tamil: 'Strong lesson tamil',
            correct_answer: 'answer',
            hint: 'Hint',
            explanation: 'Explanation'
        }
    ]);

    await LessonAttempt.insertMany([
        {
            user_id: user._id,
            lesson_id: failedLesson._id,
            time_spent: 20,
            errors: 3,
            hints_used: 1,
            retries: 1,
            idle_time: 0,
            score: 0,
            answer_given: 'B',
            createdAt: new Date(now - (3 * 60 * 60 * 1000)),
            updatedAt: new Date(now - (3 * 60 * 60 * 1000))
        },
        {
            user_id: user._id,
            lesson_id: dueLesson._id,
            time_spent: 18,
            errors: 1,
            hints_used: 1,
            retries: 0,
            idle_time: 0,
            score: 1,
            answer_given: 'answer',
            createdAt: new Date(now - (5 * 24 * 60 * 60 * 1000)),
            updatedAt: new Date(now - (5 * 24 * 60 * 60 * 1000))
        },
        {
            user_id: user._id,
            lesson_id: dueLesson._id,
            time_spent: 16,
            errors: 0,
            hints_used: 0,
            retries: 0,
            idle_time: 0,
            score: 1,
            answer_given: 'answer',
            createdAt: new Date(now - (4 * 24 * 60 * 60 * 1000)),
            updatedAt: new Date(now - (4 * 24 * 60 * 60 * 1000))
        },
        {
            user_id: user._id,
            lesson_id: strongLesson._id,
            time_spent: 12,
            errors: 0,
            hints_used: 0,
            retries: 0,
            idle_time: 0,
            score: 1,
            answer_given: 'answer',
            createdAt: new Date(now - (18 * 60 * 60 * 1000)),
            updatedAt: new Date(now - (18 * 60 * 60 * 1000))
        },
        {
            user_id: user._id,
            lesson_id: strongLesson._id,
            time_spent: 10,
            errors: 0,
            hints_used: 0,
            retries: 0,
            idle_time: 0,
            score: 1,
            answer_given: 'answer',
            createdAt: new Date(now - (10 * 60 * 60 * 1000)),
            updatedAt: new Date(now - (10 * 60 * 60 * 1000))
        },
        {
            user_id: user._id,
            lesson_id: strongLesson._id,
            time_spent: 9,
            errors: 0,
            hints_used: 0,
            retries: 0,
            idle_time: 0,
            score: 1,
            answer_given: 'answer',
            createdAt: new Date(now - (2 * 60 * 60 * 1000)),
            updatedAt: new Date(now - (2 * 60 * 60 * 1000))
        }
    ]);

    const reviewRes = await request(app)
        .get('/api/attempts/review-queue?limit=5')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(reviewRes.status, 200);
    assert.equal(reviewRes.body.total, 2);
    assert.equal(reviewRes.body.upcomingCount, 1);
    assert.equal(reviewRes.body.items[0].lesson.question, 'Failed lesson');
    assert.equal(reviewRes.body.items[1].lesson.question, 'Due lesson');
    assert.equal(reviewRes.body.items[0].stats.isDue, true);
    assert.equal(reviewRes.body.items[0].stats.reason, 'last_attempt_incorrect');
    assert.equal(reviewRes.body.items[1].stats.isDue, true);
    assert.equal(reviewRes.body.items[1].stats.reason, 'scheduled_review_due');
    assert.ok(reviewRes.body.items[1].stats.intervalHours > 0);
    assert.ok(reviewRes.body.items[1].stats.dueAt);
    assert.ok(reviewRes.body.nextDueAt);
    assert.equal(reviewRes.body.reviewBuckets.dueNow.count, 2);
    assert.equal(reviewRes.body.reviewBuckets.laterToday.count, 0);
    assert.equal(reviewRes.body.reviewBuckets.tomorrow.count, 0);
});

test('review queue groups persisted review states into due now later today and tomorrow buckets', async () => {
    const token = await registerAndGetToken();
    const user = await User.findOne({ email: TEST_USER.email });
    const now = new Date();
    const startOfTomorrow = new Date(now);
    startOfTomorrow.setHours(24, 0, 0, 0);

    const [dueNowLesson, laterTodayLesson, tomorrowLesson] = await Lesson.create([
        {
            category: 'uyir',
            difficulty: 'Beginner',
            type: 'mcq',
            question: 'Due now bucket',
            question_tamil: 'Due now bucket tamil',
            options: ['A', 'B', 'C'],
            correct_answer: 'A',
            hint: 'Hint',
            explanation: 'Explanation'
        },
        {
            category: 'grammar',
            difficulty: 'Intermediate',
            type: 'text',
            question: 'Later today bucket',
            question_tamil: 'Later today bucket tamil',
            correct_answer: 'answer',
            hint: 'Hint',
            explanation: 'Explanation'
        },
        {
            category: 'sentences',
            difficulty: 'Intermediate',
            type: 'text',
            question: 'Tomorrow bucket',
            question_tamil: 'Tomorrow bucket tamil',
            correct_answer: 'answer',
            hint: 'Hint',
            explanation: 'Explanation'
        }
    ]);

    await ReviewState.insertMany([
        {
            user_id: user._id,
            lesson_id: dueNowLesson._id,
            attemptCount: 2,
            avgScore: 0.5,
            avgErrors: 1,
            avgHints: 1,
            consecutiveCorrect: 0,
            lapses: 1,
            easeFactor: 2,
            intervalHours: 0,
            dueAt: new Date(now.getTime() - (60 * 60 * 1000)),
            priority: 105,
            reason: 'last_attempt_incorrect',
            lastAttemptedAt: new Date(now.getTime() - (2 * 60 * 60 * 1000)),
            latestAttemptCorrect: false
        },
        {
            user_id: user._id,
            lesson_id: laterTodayLesson._id,
            attemptCount: 3,
            avgScore: 0.8,
            avgErrors: 0.5,
            avgHints: 0.5,
            consecutiveCorrect: 2,
            lapses: 1,
            easeFactor: 2.2,
            intervalHours: 10,
            dueAt: new Date(now.getTime() + (4 * 60 * 60 * 1000)),
            priority: 4,
            reason: 'scheduled_review_due',
            lastAttemptedAt: new Date(now.getTime() - (6 * 60 * 60 * 1000)),
            latestAttemptCorrect: true
        },
        {
            user_id: user._id,
            lesson_id: tomorrowLesson._id,
            attemptCount: 4,
            avgScore: 0.9,
            avgErrors: 0,
            avgHints: 0,
            consecutiveCorrect: 3,
            lapses: 0,
            easeFactor: 2.5,
            intervalHours: 30,
            dueAt: new Date(startOfTomorrow.getTime() + (8 * 60 * 60 * 1000)),
            priority: 2,
            reason: 'scheduled_review_due',
            lastAttemptedAt: new Date(now.getTime() - (12 * 60 * 60 * 1000)),
            latestAttemptCorrect: true
        }
    ]);

    await ReviewCompletion.create({
        user_id: user._id,
        lesson_id: dueNowLesson._id,
        attempt_id: new mongoose.Types.ObjectId(),
        clearedAt: new Date(),
        scheduledDueAt: new Date(now.getTime() - (2 * 60 * 60 * 1000)),
        wasOverdue: true
    });

    const reviewRes = await request(app)
        .get('/api/attempts/review-queue?limit=5')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(reviewRes.status, 200);
    assert.equal(reviewRes.body.reviewBuckets.dueNow.count, 1);
    assert.equal(reviewRes.body.reviewBuckets.laterToday.count, 1);
    assert.equal(reviewRes.body.reviewBuckets.tomorrow.count, 1);
    assert.equal(reviewRes.body.reviewBuckets.dueNow.items[0].lesson.question, 'Due now bucket');
    assert.equal(reviewRes.body.reviewBuckets.laterToday.items[0].lesson.question, 'Later today bucket');
    assert.equal(reviewRes.body.reviewBuckets.tomorrow.items[0].lesson.question, 'Tomorrow bucket');
    assert.equal(reviewRes.body.completionStats.clearedToday, 1);
    assert.ok(reviewRes.body.weeklyTimeline.length >= 7);
    assert.ok(reviewRes.body.weeklyTimeline[0].dueCount >= 1);
});
