const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '5001';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-jwt-secret';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '1d';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:4173';
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || '7.0.14';
process.env.AUTH_LOGIN_RATE_LIMIT_MAX = process.env.AUTH_LOGIN_RATE_LIMIT_MAX || '100';
process.env.AUTH_FORGOT_RATE_LIMIT_MAX = process.env.AUTH_FORGOT_RATE_LIMIT_MAX || '100';
process.env.AUTH_RESET_RATE_LIMIT_MAX = process.env.AUTH_RESET_RATE_LIMIT_MAX || '100';

const { app, connectDatabase } = require('../../server');
const User = require('../../models/User');
const Lesson = require('../../models/Lesson');
const LessonAttempt = require('../../models/LessonAttempt');

let mongoServer;
let server;

async function seedData() {
    await Promise.all([
        User.deleteMany({}),
        Lesson.deleteMany({}),
        LessonAttempt.deleteMany({})
    ]);

    await User.create([
        {
            name: 'E2E Admin',
            email: 'admin.e2e@example.com',
            password: 'Admin123!',
            role: 'admin',
            level: 'Advanced',
            skill_score: 85
        },
        {
            name: 'E2E Learner',
            email: 'learner.e2e@example.com',
            password: 'Password123!',
            role: 'user',
            level: 'Intermediate',
            skill_score: 50
        }
    ]);

    await Lesson.create({
        category: 'uyir',
        difficulty: 'Intermediate',
        type: 'mcq',
        question: 'Select the first Tamil vowel',
        question_tamil: '',
        options: ['a', 'aa', 'i'],
        correct_answer: 'a',
        hint: 'It comes first in vowel order.',
        explanation: 'a is the first vowel.',
        order: 1
    });
}

async function start() {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    await connectDatabase(process.env.MONGODB_URI);
    await seedData();

    await new Promise((resolve) => {
        server = app.listen(process.env.PORT, resolve);
    });

    console.log(`E2E backend running on http://127.0.0.1:${process.env.PORT}`);
}

async function shutdown(code = 0) {
    try {
        if (server) {
            await new Promise((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            });
        }
        if (mongoose.connection.readyState) {
            await mongoose.connection.close();
        }
        if (mongoServer) {
            await mongoServer.stop();
        }
    } catch (err) {
        console.error('E2E shutdown error:', err.message);
        process.exit(1);
    }
    process.exit(code);
}

process.on('SIGINT', () => { void shutdown(0); });
process.on('SIGTERM', () => { void shutdown(0); });

start().catch(async (err) => {
    console.error('E2E backend start failed:', err.message);
    await shutdown(1);
});
