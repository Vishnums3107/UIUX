const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const createApp = require('../app');
const User = require('../models/User');
const Lesson = require('../models/Lesson');

let mongoServer;
let app;

const PASSWORD = 'password123';

const validLessonPayload = {
    category: 'uyir',
    difficulty: 'Beginner',
    type: 'mcq',
    question: 'Select the first vowel',
    question_tamil: '',
    options: ['a', 'aa', 'i'],
    correct_answer: 'a',
    hint: 'Starts the vowel order',
    explanation: 'a is the first vowel'
};

test.before(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.JWT_EXPIRE = '1d';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'lesson-admin-integration-tests' });
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
        Lesson.deleteMany({})
    ]);
});

async function registerUser({ name, email, password = PASSWORD }) {
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

test('lesson CMS endpoints enforce authentication and admin role', async () => {
    const normalUser = await registerUser({
        name: 'Normal User',
        email: 'normal.lesson@example.com'
    });

    const lesson = await Lesson.create(validLessonPayload);

    const unauthenticatedCreate = await request(app)
        .post('/api/lessons')
        .send(validLessonPayload);
    assert.equal(unauthenticatedCreate.status, 401);

    const unauthenticatedUpdate = await request(app)
        .put(`/api/lessons/${lesson._id}`)
        .send({ question: 'updated question' });
    assert.equal(unauthenticatedUpdate.status, 401);

    const unauthenticatedDelete = await request(app)
        .delete(`/api/lessons/${lesson._id}`);
    assert.equal(unauthenticatedDelete.status, 401);

    const nonAdminCreate = await request(app)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${normalUser.token}`)
        .send(validLessonPayload);
    assert.equal(nonAdminCreate.status, 403);

    const nonAdminUpdate = await request(app)
        .put(`/api/lessons/${lesson._id}`)
        .set('Authorization', `Bearer ${normalUser.token}`)
        .send({ question: 'updated question' });
    assert.equal(nonAdminUpdate.status, 403);

    const nonAdminDelete = await request(app)
        .delete(`/api/lessons/${lesson._id}`)
        .set('Authorization', `Bearer ${normalUser.token}`);
    assert.equal(nonAdminDelete.status, 403);
});

test('admin lesson CMS validates payloads and performs create update delete correctly', async () => {
    const admin = await registerUser({
        name: 'Admin User',
        email: 'admin.lesson@example.com'
    });
    await promoteToAdmin(admin.user.id);

    const invalidCreate = await request(app)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
            ...validLessonPayload,
            options: ['aa', 'i'],
            correct_answer: 'a'
        });
    assert.equal(invalidCreate.status, 400);
    assert.ok(Array.isArray(invalidCreate.body.errors));
    assert.ok(
        invalidCreate.body.errors.some((error) => (
            String(error.msg).includes('correct_answer must match one of the options')
        ))
    );

    const createRes = await request(app)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${admin.token}`)
        .send(validLessonPayload);
    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.question, validLessonPayload.question);
    assert.ok(createRes.body._id);

    const lessonId = createRes.body._id;

    const emptyUpdate = await request(app)
        .put(`/api/lessons/${lessonId}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({});
    assert.equal(emptyUpdate.status, 400);
    assert.ok(Array.isArray(emptyUpdate.body.errors));
    assert.ok(
        emptyUpdate.body.errors.some((error) => (
            String(error.msg).includes('At least one field is required for update')
        ))
    );

    const invalidUpdate = await request(app)
        .put(`/api/lessons/${lessonId}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
            options: ['x', 'y'],
            correct_answer: 'z'
        });
    assert.equal(invalidUpdate.status, 400);
    assert.ok(Array.isArray(invalidUpdate.body.errors));
    assert.ok(
        invalidUpdate.body.errors.some((error) => (
            String(error.msg).includes('correct_answer must match one of the provided options')
        ))
    );

    const updateRes = await request(app)
        .put(`/api/lessons/${lessonId}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
            question: 'Updated lesson question',
            options: ['x', 'y', 'z'],
            correct_answer: 'z',
            order: 8
        });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.question, 'Updated lesson question');
    assert.equal(updateRes.body.correct_answer, 'z');
    assert.equal(updateRes.body.order, 8);

    const deleteRes = await request(app)
        .delete(`/api/lessons/${lessonId}`)
        .set('Authorization', `Bearer ${admin.token}`);
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.message, 'Lesson deleted successfully.');

    const deletedLesson = await Lesson.findById(lessonId);
    assert.equal(deletedLesson, null);

    const fetchDeleted = await request(app)
        .get(`/api/lessons/${lessonId}`)
        .set('Authorization', `Bearer ${admin.token}`);
    assert.equal(fetchDeleted.status, 404);
    assert.equal(fetchDeleted.body.error, 'Lesson not found.');
});
