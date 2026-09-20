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

test.before(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.JWT_EXPIRE = '1d';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'stage-progress-tests' });
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

async function registerAndToken() {
    const response = await request(app).post('/api/auth/register').send({
        name: 'Stage Learner',
        email: 'stage-learner@example.com',
        password: 'password123'
    });

    assert.equal(response.status, 201);
    return response.body.token;
}

async function seedMinimalStageLessons() {
    await Lesson.insertMany([
        {
            category: 'uyir',
            difficulty: 'Beginner',
            type: 'mcq',
            questionType: 'text_mcq',
            question: 'Stage 1 Lesson A',
            question_tamil: 'நிலை 1 பாடம் A',
            options: ['அ', 'ஆ', 'இ', 'ஈ'],
            correct_answer: 'அ',
            hint: 'EN: pick அ | தமிழ்: அ தேர்வு செய்',
            explanation: 'EN: answer is அ | தமிழ்: பதில் அ',
            transliteration: 'a',
            tamilScript: 'அ',
            phonetic: '/a/',
            stage: 1,
            stageOrder: 1,
            order: 1,
            exerciseType: 'text_mcq',
            isMasteryTest: false
        },
        {
            category: 'uyir',
            difficulty: 'Intermediate',
            type: 'mcq',
            questionType: 'text_mcq',
            question: 'Stage 1 Lesson B',
            question_tamil: 'நிலை 1 பாடம் B',
            options: ['ஆ', 'அ', 'இ', 'ஈ'],
            correct_answer: 'ஆ',
            hint: 'EN: pick ஆ | தமிழ்: ஆ தேர்வு செய்',
            explanation: 'EN: answer is ஆ | தமிழ்: பதில் ஆ',
            transliteration: 'aa',
            tamilScript: 'ஆ',
            phonetic: '/aː/',
            stage: 1,
            stageOrder: 2,
            order: 2,
            exerciseType: 'text_mcq',
            isMasteryTest: false
        },
        {
            category: 'mei',
            difficulty: 'Beginner',
            type: 'mcq',
            questionType: 'text_mcq',
            question: 'Stage 2 Lesson A',
            question_tamil: 'நிலை 2 பாடம் A',
            options: ['க்', 'ங்', 'ச்', 'ஞ்'],
            correct_answer: 'க்',
            hint: 'EN: pick க் | தமிழ்: க் தேர்வு செய்',
            explanation: 'EN: answer is க் | தமிழ்: பதில் க்',
            transliteration: 'k',
            tamilScript: 'க்',
            phonetic: '/k/',
            stage: 2,
            stageOrder: 1,
            order: 1,
            exerciseType: 'text_mcq',
            isMasteryTest: false
        },
        {
            category: 'sentences',
            difficulty: 'Advanced',
            type: 'mcq',
            questionType: 'mastery_test',
            question: 'Mastery for Stage 1',
            question_tamil: 'நிலை 1 தேர்ச்சி',
            options: ['Start Test', 'Review', 'Later', 'Skip'],
            correct_answer: 'Start Test',
            hint: 'EN: no hints | தமிழ்: குறிப்பு இல்லை',
            explanation: 'EN: pass to unlock stage 2 | தமிழ்: நிலை 2 திறக்க தேர்ச்சி பெற வேண்டும்',
            transliteration: 'nilai 1 therchi',
            tamilScript: 'நிலை 1 தேர்ச்சி',
            phonetic: '/ta/',
            stage: 10,
            stageOrder: 1,
            order: 1,
            exerciseType: 'mastery_test',
            isMasteryTest: true,
            unlocksStage: 2
        }
    ]);
}

test('stage endpoints enforce unlock gates and mastery unlocks next stage', async () => {
    const token = await registerAndToken();
    await seedMinimalStageLessons();

    const stage1Res = await request(app)
        .get('/api/lessons/stage/1')
        .set('Authorization', `Bearer ${token}`);
    assert.equal(stage1Res.status, 200);
    assert.equal(stage1Res.body.length, 3);
    assert.equal(stage1Res.body[0].stageOrder, 1);
    assert.equal(stage1Res.body[2].isMasteryTest, true);
    assert.equal(stage1Res.body[2].unlocksStage, 2);

    const lockedStageRes = await request(app)
        .get('/api/lessons/stage/2')
        .set('Authorization', `Bearer ${token}`);
    assert.equal(lockedStageRes.status, 403);
    assert.equal(lockedStageRes.body.requiredMasteryStage, 1);

    const lessonId = stage1Res.body[0]._id;
    const firstAttemptRes = await request(app)
        .post('/api/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
            lesson_id: lessonId,
            time_spent: 18,
            errors: 0,
            hints_used: 0,
            retries: 0,
            idle_time: 0,
            score: 1,
            answer_given: 'அ'
        });
    assert.equal(firstAttemptRes.status, 201);
    assert.equal(firstAttemptRes.body.skillUpdate.xpEarned, 10);

    const secondAttemptRes = await request(app)
        .post('/api/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
            lesson_id: lessonId,
            time_spent: 12,
            errors: 0,
            hints_used: 0,
            retries: 0,
            idle_time: 0,
            score: 1,
            answer_given: 'அ'
        });
    assert.equal(secondAttemptRes.status, 201);
    assert.equal(secondAttemptRes.body.skillUpdate.xpEarned, 0);

    const stage1LessonBId = stage1Res.body[1]._id;
    const stage1LessonBAttemptRes = await request(app)
        .post('/api/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
            lesson_id: stage1LessonBId,
            time_spent: 16,
            errors: 0,
            hints_used: 0,
            retries: 0,
            idle_time: 0,
            score: 1,
            answer_given: 'à®†'
        });
    assert.equal(stage1LessonBAttemptRes.status, 201);

    const nextBeforeMasteryRes = await request(app)
        .get('/api/lessons/stage/1/next')
        .set('Authorization', `Bearer ${token}`);
    assert.equal(nextBeforeMasteryRes.status, 200);
    assert.equal(nextBeforeMasteryRes.body.completed, false);
    assert.equal(nextBeforeMasteryRes.body.lesson.isMasteryTest, true);
    assert.equal(nextBeforeMasteryRes.body.lesson.unlocksStage, 2);

    const progressRes = await request(app)
        .get('/api/lessons/stages/progress')
        .set('Authorization', `Bearer ${token}`);
    assert.equal(progressRes.status, 200);
    const stage1Progress = progressRes.body.find((item) => item.stage === 1);
    assert.equal(stage1Progress.totalLessons, 2);
    assert.equal(stage1Progress.completedLessons, 2);
    assert.equal(stage1Progress.unlocked, true);
    assert.equal(stage1Progress.masteryPassed, false);

    const masteryRes = await request(app)
        .post('/api/attempts/mastery')
        .set('Authorization', `Bearer ${token}`)
        .send({
            stageNumber: 1,
            scorePercent: 80,
            correctCount: 16,
            totalQuestions: 20,
            timeSpent: 400,
            errors: 2,
            hintsUsed: 0,
            questions: [{ id: 'q1', score: 1 }]
        });
    assert.equal(masteryRes.status, 201);
    assert.equal(masteryRes.body.passed, true);
    assert.equal(masteryRes.body.unlockedStage, 2);
    assert.equal(masteryRes.body.user.xpEarned, 200);

    const nextAfterMasteryRes = await request(app)
        .get('/api/lessons/stage/1/next')
        .set('Authorization', `Bearer ${token}`);
    assert.equal(nextAfterMasteryRes.status, 200);
    assert.equal(nextAfterMasteryRes.body.completed, true);
    assert.equal(nextAfterMasteryRes.body.lesson, null);

    const unlockedStageRes = await request(app)
        .get('/api/lessons/stage/2')
        .set('Authorization', `Bearer ${token}`);
    assert.equal(unlockedStageRes.status, 200);
    assert.equal(unlockedStageRes.body.length, 1);
});
