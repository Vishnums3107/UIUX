const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const createApp = require('../app');
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const LessonAttempt = require('../models/LessonAttempt');
const ReviewState = require('../models/ReviewState');
const ReviewCompletion = require('../models/ReviewCompletion');

let mongoServer;
let app;

const TEST_USER = {
    name: 'Contract User',
    email: 'contract.user@example.com',
    password: 'Password123!'
};

const EXPECTED_USER_KEYS = [
    'id',
    'name',
    'email',
    'skill_score',
    'level',
    'lessons_completed',
    'unlockedStages',
    'masteryPassedStages',
    'xp',
    'totalXP',
    'current_streak',
    'longest_streak',
    'badges',
    'avatarId',
    'adaptivePreferences',
    'adaptiveProfile',
    'role',
    'createdAt'
];

const EXPECTED_ADAPTIVE_PREFERENCES_KEYS = [
    'modePreference',
    'immersiveModeDefault'
];

const EXPECTED_ADAPTIVE_PROFILE_KEYS = [
    'recommendedMode',
    'recommendedDifficulty',
    'supportNeed',
    'challengeReadiness',
    'stabilityScore',
    'confidenceScore',
    'lastUpdatedAt'
];

const EXPECTED_ADAPTIVE_INSIGHTS_KEYS = [
    'adaptivePreferences',
    'adaptiveProfile',
    'categoryRecommendations',
    'generatedAt',
    'attemptWindowSize'
];

const EXPECTED_ADAPTIVE_CATEGORY_RECOMMENDATION_KEYS = [
    'category',
    'recommendedMode',
    'recommendedDifficulty',
    'supportNeed',
    'challengeReadiness',
    'confidenceScore',
    'attemptCount',
    'successRate',
    'avgErrors',
    'avgHints',
    'avgRetries',
    'priorityScore',
    'reason'
];

const EXPECTED_SKILL_UPDATE_KEYS = [
    'skill_score',
    'level',
    'lessons_completed',
    'current_streak',
    'longest_streak',
    'xp',
    'totalXP',
    'xpEarned',
    'unlockedStages',
    'masteryPassedStages',
    'new_badges',
    'adaptiveProfile',
    'details',
    'levelChanged',
    'previousLevel',
    'adaptationDirection'
];

const EXPECTED_SKILL_DETAILS_KEYS = [
    'successRate',
    'timeEfficiency',
    'errorRate',
    'hintDependency',
    'rawScore',
    'retryDependency',
    'idlePenalty',
    'confidence',
    'smoothingWeight'
];

const EXPECTED_REVIEW_PROGRESS_KEYS = [
    'clearedToday',
    'currentStreak',
    'longestStreak',
    'lastClearedAt'
];

const sortedKeys = (value) => Object.keys(value).sort();

const assertExactKeys = (value, expectedKeys, label) => {
    assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
    assert.deepEqual(
        sortedKeys(value),
        [...expectedKeys].sort(),
        `${label} response contract changed`
    );
};

const assertHasKeys = (value, expectedKeys, label) => {
    assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
    expectedKeys.forEach((key) => {
        assert.ok(Object.hasOwn(value, key), `${label} is missing key: ${key}`);
    });
};

async function registerUser(payload = TEST_USER) {
    const response = await request(app).post('/api/auth/register').send(payload);
    assert.equal(response.status, 201);
    return response;
}

async function createSeedLesson() {
    return Lesson.create({
        category: 'uyir',
        difficulty: 'Beginner',
        type: 'mcq',
        questionType: 'text_mcq',
        exerciseType: 'text_mcq',
        question: 'Select the first Tamil vowel',
        question_tamil: 'முதல் உயிர் எழுத்தை தேர்வு செய்',
        options: ['அ', 'ஆ', 'இ', 'ஈ'],
        correct_answer: 'அ',
        hint: 'Starts the vowel order',
        explanation: 'அ is the first Tamil vowel.',
        stage: 1,
        stageOrder: 1,
        order: 1,
        transliteration: 'a',
        tamilScript: 'அ',
        phonetic: '/a/'
    });
}

test.before(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.JWT_EXPIRE = '1d';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX = '100';
    process.env.AUTH_FORGOT_RATE_LIMIT_MAX = '100';
    process.env.AUTH_RESET_RATE_LIMIT_MAX = '100';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'api-contract-freeze-tests' });
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
        ReviewState.deleteMany({}),
        ReviewCompletion.deleteMany({})
    ]);
});

test('contract freeze: auth response structures remain stable', async () => {
    const registerRes = await registerUser();
    assertExactKeys(registerRes.body, ['token', 'user'], 'POST /api/auth/register');
    assertExactKeys(registerRes.body.user, EXPECTED_USER_KEYS, 'POST /api/auth/register user');
    assertExactKeys(registerRes.body.user.adaptivePreferences, EXPECTED_ADAPTIVE_PREFERENCES_KEYS, 'POST /api/auth/register user.adaptivePreferences');
    assertExactKeys(registerRes.body.user.adaptiveProfile, EXPECTED_ADAPTIVE_PROFILE_KEYS, 'POST /api/auth/register user.adaptiveProfile');

    const loginRes = await request(app).post('/api/auth/login').send({
        email: TEST_USER.email,
        password: TEST_USER.password
    });
    assert.equal(loginRes.status, 200);
    assertExactKeys(loginRes.body, ['token', 'user'], 'POST /api/auth/login');
    assertExactKeys(loginRes.body.user, EXPECTED_USER_KEYS, 'POST /api/auth/login user');
    assertExactKeys(loginRes.body.user.adaptivePreferences, EXPECTED_ADAPTIVE_PREFERENCES_KEYS, 'POST /api/auth/login user.adaptivePreferences');
    assertExactKeys(loginRes.body.user.adaptiveProfile, EXPECTED_ADAPTIVE_PROFILE_KEYS, 'POST /api/auth/login user.adaptiveProfile');

    const profileRes = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${loginRes.body.token}`);
    assert.equal(profileRes.status, 200);
    assertExactKeys(profileRes.body, EXPECTED_USER_KEYS, 'GET /api/auth/profile');
    assertExactKeys(profileRes.body.adaptivePreferences, EXPECTED_ADAPTIVE_PREFERENCES_KEYS, 'GET /api/auth/profile adaptivePreferences');
    assertExactKeys(profileRes.body.adaptiveProfile, EXPECTED_ADAPTIVE_PROFILE_KEYS, 'GET /api/auth/profile adaptiveProfile');

    const adaptiveRes = await request(app)
        .get('/api/auth/adaptive-profile')
        .set('Authorization', `Bearer ${loginRes.body.token}`);
    assert.equal(adaptiveRes.status, 200);
    assertExactKeys(adaptiveRes.body, EXPECTED_ADAPTIVE_INSIGHTS_KEYS, 'GET /api/auth/adaptive-profile');
    assertExactKeys(adaptiveRes.body.adaptivePreferences, EXPECTED_ADAPTIVE_PREFERENCES_KEYS, 'GET /api/auth/adaptive-profile adaptivePreferences');
    assertExactKeys(adaptiveRes.body.adaptiveProfile, EXPECTED_ADAPTIVE_PROFILE_KEYS, 'GET /api/auth/adaptive-profile adaptiveProfile');
    assert.ok(Array.isArray(adaptiveRes.body.categoryRecommendations), 'GET /api/auth/adaptive-profile categoryRecommendations must be an array');
    if (adaptiveRes.body.categoryRecommendations.length > 0) {
        assertExactKeys(
            adaptiveRes.body.categoryRecommendations[0],
            EXPECTED_ADAPTIVE_CATEGORY_RECOMMENDATION_KEYS,
            'GET /api/auth/adaptive-profile categoryRecommendations[0]'
        );
    }

    const forgotRes = await request(app)
        .post('/api/auth/forgotpassword')
        .send({ email: 'unknown.user@example.com' });
    assert.equal(forgotRes.status, 200);
    assertExactKeys(forgotRes.body, ['success', 'message'], 'POST /api/auth/forgotpassword');

    const storedUser = await User.findOne({ email: TEST_USER.email });
    const resetToken = storedUser.getResetPasswordToken();
    await storedUser.save({ validateBeforeSave: false });

    const resetRes = await request(app)
        .put(`/api/auth/resetpassword/${resetToken}`)
        .send({ password: 'NewPassword123!' });
    assert.equal(resetRes.status, 200);
    assertExactKeys(resetRes.body, ['success', 'token', 'user'], 'PUT /api/auth/resetpassword/:resettoken');
    assertExactKeys(resetRes.body.user, EXPECTED_USER_KEYS, 'PUT /api/auth/resetpassword/:resettoken user');
    assertExactKeys(resetRes.body.user.adaptivePreferences, EXPECTED_ADAPTIVE_PREFERENCES_KEYS, 'PUT /api/auth/resetpassword/:resettoken user.adaptivePreferences');
    assertExactKeys(resetRes.body.user.adaptiveProfile, EXPECTED_ADAPTIVE_PROFILE_KEYS, 'PUT /api/auth/resetpassword/:resettoken user.adaptiveProfile');
});

test('contract freeze: lesson and attempt response structures remain stable', async () => {
    const registerRes = await registerUser();
    const token = registerRes.body.token;

    const lesson = await createSeedLesson();

    const lessonsRes = await request(app)
        .get('/api/lessons?category=uyir&difficulty=Beginner')
        .set('Authorization', `Bearer ${token}`);
    assert.equal(lessonsRes.status, 200);
    assert.ok(Array.isArray(lessonsRes.body));
    assert.ok(lessonsRes.body.length >= 1);
    assertHasKeys(
        lessonsRes.body[0],
        ['_id', 'category', 'difficulty', 'type', 'question', 'correct_answer', 'hint', 'explanation'],
        'GET /api/lessons item'
    );

    const categoryRes = await request(app)
        .get('/api/lessons/categories')
        .set('Authorization', `Bearer ${token}`);
    assert.equal(categoryRes.status, 200);
    assert.ok(Array.isArray(categoryRes.body));
    assert.ok(categoryRes.body.length >= 1);
    assertExactKeys(categoryRes.body[0], ['_id', 'count'], 'GET /api/lessons/categories item');
    assertExactKeys(categoryRes.body[0]._id, ['category', 'difficulty'], 'GET /api/lessons/categories item._id');

    const progressRes = await request(app)
        .get('/api/lessons/stages/progress')
        .set('Authorization', `Bearer ${token}`);
    assert.equal(progressRes.status, 200);
    assert.ok(Array.isArray(progressRes.body));
    assert.equal(progressRes.body.length, 10);
    assertExactKeys(
        progressRes.body[0],
        ['stage', 'totalLessons', 'completedLessons', 'unlocked', 'masteryPassed'],
        'GET /api/lessons/stages/progress item'
    );

    const attemptRes = await request(app)
        .post('/api/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
            lesson_id: String(lesson._id),
            time_spent: 18,
            errors: 0,
            hints_used: 0,
            retries: 0,
            idle_time: 0,
            score: 1,
            answer_given: 'அ'
        });

    assert.equal(attemptRes.status, 201);
    assertExactKeys(attemptRes.body, ['attempt', 'skillUpdate', 'reviewProgress'], 'POST /api/attempts');
    assertExactKeys(attemptRes.body.attempt, ['id', 'score', 'time_spent'], 'POST /api/attempts attempt');
    assertExactKeys(attemptRes.body.skillUpdate, EXPECTED_SKILL_UPDATE_KEYS, 'POST /api/attempts skillUpdate');
    assertExactKeys(attemptRes.body.skillUpdate.adaptiveProfile, EXPECTED_ADAPTIVE_PROFILE_KEYS, 'POST /api/attempts skillUpdate.adaptiveProfile');
    assertExactKeys(attemptRes.body.skillUpdate.details, EXPECTED_SKILL_DETAILS_KEYS, 'POST /api/attempts skillUpdate.details');
    assertExactKeys(attemptRes.body.reviewProgress, EXPECTED_REVIEW_PROGRESS_KEYS, 'POST /api/attempts reviewProgress');

    const statsRes = await request(app)
        .get('/api/attempts/stats')
        .set('Authorization', `Bearer ${token}`);
    assert.equal(statsRes.status, 200);
    assertExactKeys(statsRes.body, ['totalAttempts', 'summary', 'recentTrend'], 'GET /api/attempts/stats');
    assertExactKeys(statsRes.body.summary, ['_id', 'avgScore', 'avgTime', 'avgErrors', 'avgHints', 'totalCorrect'], 'GET /api/attempts/stats summary');
});

test('contract freeze: admin analytics and progress response structures remain stable', async () => {
    const adminRegisterRes = await registerUser({
        name: 'Admin Contract',
        email: 'admin.contract@example.com',
        password: 'AdminPassword123!'
    });
    const learnerRegisterRes = await registerUser({
        name: 'Learner Contract',
        email: 'learner.contract@example.com',
        password: 'LearnerPassword123!'
    });

    await User.findByIdAndUpdate(adminRegisterRes.body.user.id, { role: 'admin' });

    const lesson = await createSeedLesson();
    await LessonAttempt.create({
        user_id: learnerRegisterRes.body.user.id,
        lesson_id: lesson._id,
        time_spent: 20,
        errors: 1,
        hints_used: 1,
        retries: 0,
        idle_time: 0,
        score: 1,
        answer_given: 'அ',
        stage: 1,
        isMasteryTest: false
    });

    const analyticsRes = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${adminRegisterRes.body.token}`);
    assert.equal(analyticsRes.status, 200);
    assertExactKeys(analyticsRes.body, ['totalUsers', 'levelDistribution', 'averages', 'recentActivity'], 'GET /api/admin/analytics');
    assertExactKeys(analyticsRes.body.averages, ['_id', 'avgSkill', 'avgLessons'], 'GET /api/admin/analytics averages');

    const usersRes = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminRegisterRes.body.token}`);
    assert.equal(usersRes.status, 200);
    assert.ok(Array.isArray(usersRes.body));
    assert.ok(usersRes.body.length >= 2);
    assertHasKeys(usersRes.body[0], ['_id', 'name', 'email', 'role'], 'GET /api/admin/users item');
    assert.ok(!Object.hasOwn(usersRes.body[0], 'password'), 'GET /api/admin/users must not expose password');

    const progressRes = await request(app)
        .get(`/api/admin/users/${learnerRegisterRes.body.user.id}/progress`)
        .set('Authorization', `Bearer ${adminRegisterRes.body.token}`);
    assert.equal(progressRes.status, 200);
    assertExactKeys(progressRes.body, ['user', 'attempts'], 'GET /api/admin/users/:id/progress');
    assertHasKeys(
        progressRes.body.user,
        ['_id', 'name', 'email', 'skill_score', 'level', 'lessons_completed', 'role'],
        'GET /api/admin/users/:id/progress user'
    );
    assert.ok(Array.isArray(progressRes.body.attempts));
});
