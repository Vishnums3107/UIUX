const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const request = require('supertest');
const mongoose = require('mongoose');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { MongoMemoryServer } = require('mongodb-memory-server');

const createApp = require('../app');
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const LessonAttempt = require('../models/LessonAttempt');
const ReviewState = require('../models/ReviewState');
const ReviewCompletion = require('../models/ReviewCompletion');

const openApiSpec = require(path.resolve(__dirname, '../../docs/openapi/critical-endpoints.openapi.json'));

let mongoServer;
let app;

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validatorCache = new Map();

const decodeJsonPointerToken = (token) => token.replace(/~1/g, '/').replace(/~0/g, '~');

const getByJsonPointer = (source, pointer) => {
    if (!pointer.startsWith('#/')) {
        throw new Error(`Only local JSON pointers are supported: ${pointer}`);
    }

    return pointer
        .slice(2)
        .split('/')
        .map(decodeJsonPointerToken)
        .reduce((current, segment) => {
            if (current === null || current === undefined || !Object.hasOwn(current, segment)) {
                throw new Error(`Unable to resolve JSON pointer segment "${segment}" from "${pointer}"`);
            }
            return current[segment];
        }, source);
};

const resolveSchemaRefs = (schema) => {
    if (Array.isArray(schema)) {
        return schema.map((item) => resolveSchemaRefs(item));
    }

    if (!schema || typeof schema !== 'object') {
        return schema;
    }

    if (schema.$ref) {
        const { $ref, ...siblingKeywords } = schema;
        const resolvedTarget = resolveSchemaRefs(getByJsonPointer(openApiSpec, $ref));

        if (Object.keys(siblingKeywords).length === 0) {
            return resolvedTarget;
        }

        return {
            allOf: [resolvedTarget, resolveSchemaRefs(siblingKeywords)]
        };
    }

    const resolved = {};
    Object.entries(schema).forEach(([key, value]) => {
        resolved[key] = resolveSchemaRefs(value);
    });

    return resolved;
};

const getResponseSchema = (pathKey, method, statusCode) => {
    const pathObject = openApiSpec.paths[pathKey];
    assert.ok(pathObject, `OpenAPI path is missing: ${pathKey}`);

    const operation = pathObject[method.toLowerCase()];
    assert.ok(operation, `OpenAPI operation is missing: ${method.toUpperCase()} ${pathKey}`);

    const response = operation.responses?.[String(statusCode)];
    assert.ok(response, `OpenAPI response is missing: ${method.toUpperCase()} ${pathKey} ${statusCode}`);

    const schema = response.content?.['application/json']?.schema;
    assert.ok(schema, `OpenAPI JSON schema is missing: ${method.toUpperCase()} ${pathKey} ${statusCode}`);

    return schema;
};

const getValidator = (pathKey, method, statusCode) => {
    const cacheKey = `${method.toUpperCase()} ${pathKey} ${statusCode}`;
    if (validatorCache.has(cacheKey)) {
        return validatorCache.get(cacheKey);
    }

    const rawSchema = getResponseSchema(pathKey, method, statusCode);
    const resolvedSchema = resolveSchemaRefs(rawSchema);
    const validator = ajv.compile(resolvedSchema);
    validatorCache.set(cacheKey, validator);
    return validator;
};

const assertContract = (pathKey, method, statusCode, payload) => {
    const validator = getValidator(pathKey, method, statusCode);
    const valid = validator(payload);

    const contractLabel = `${method.toUpperCase()} ${pathKey} ${statusCode}`;
    assert.equal(
        valid,
        true,
        `OpenAPI contract validation failed for ${contractLabel}: ${ajv.errorsText(validator.errors, { separator: '; ' })}`
    );
};

const createLessonPayload = (overrides = {}) => ({
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
    phonetic: '/a/',
    ...overrides
});

async function registerUser({ name = 'Contract User', email = 'contract.user@example.com', password = 'Password123!' } = {}) {
    const response = await request(app)
        .post('/api/auth/register')
        .send({ name, email, password });

    assert.equal(response.status, 201);
    return response;
}

test.before(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.JWT_EXPIRE = '1d';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX = '100';
    process.env.AUTH_FORGOT_RATE_LIMIT_MAX = '100';
    process.env.AUTH_RESET_RATE_LIMIT_MAX = '100';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'openapi-contract-tests' });
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

test('OpenAPI contract: auth endpoints', async () => {
    const registerRes = await registerUser();
    assertContract('/auth/register', 'post', 201, registerRes.body);

    const loginRes = await request(app).post('/api/auth/login').send({
        email: 'contract.user@example.com',
        password: 'Password123!'
    });
    assert.equal(loginRes.status, 200);
    assertContract('/auth/login', 'post', 200, loginRes.body);

    const profileRes = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${loginRes.body.token}`);
    assert.equal(profileRes.status, 200);
    assertContract('/auth/profile', 'get', 200, profileRes.body);

    const adaptiveRes = await request(app)
        .get('/api/auth/adaptive-profile')
        .set('Authorization', `Bearer ${loginRes.body.token}`);
    assert.equal(adaptiveRes.status, 200);
    assertContract('/auth/adaptive-profile', 'get', 200, adaptiveRes.body);

    const forgotRes = await request(app)
        .post('/api/auth/forgotpassword')
        .send({ email: 'unknown.user@example.com' });
    assert.equal(forgotRes.status, 200);
    assertContract('/auth/forgotpassword', 'post', 200, forgotRes.body);

    const storedUser = await User.findOne({ email: 'contract.user@example.com' });
    const resetToken = storedUser.getResetPasswordToken();
    await storedUser.save({ validateBeforeSave: false });

    const resetRes = await request(app)
        .put(`/api/auth/resetpassword/${resetToken}`)
        .send({ password: 'NewPassword123!' });
    assert.equal(resetRes.status, 200);
    assertContract('/auth/resetpassword/{resettoken}', 'put', 200, resetRes.body);
});

test('OpenAPI contract: lesson and attempt endpoints', async () => {
    const registerRes = await registerUser();
    const token = registerRes.body.token;

    const lesson = await Lesson.create(createLessonPayload());

    const lessonsRes = await request(app)
        .get('/api/lessons?category=uyir&difficulty=Beginner')
        .set('Authorization', `Bearer ${token}`);
    assert.equal(lessonsRes.status, 200);
    assertContract('/lessons', 'get', 200, lessonsRes.body);

    const categoriesRes = await request(app)
        .get('/api/lessons/categories')
        .set('Authorization', `Bearer ${token}`);
    assert.equal(categoriesRes.status, 200);
    assertContract('/lessons/categories', 'get', 200, categoriesRes.body);

    const stageProgressRes = await request(app)
        .get('/api/lessons/stages/progress')
        .set('Authorization', `Bearer ${token}`);
    assert.equal(stageProgressRes.status, 200);
    assertContract('/lessons/stages/progress', 'get', 200, stageProgressRes.body);

    const attemptRes = await request(app)
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
            answer_given: 'அ'
        });
    assert.equal(attemptRes.status, 201);
    assertContract('/attempts', 'post', 201, attemptRes.body);

    const statsRes = await request(app)
        .get('/api/attempts/stats')
        .set('Authorization', `Bearer ${token}`);
    assert.equal(statsRes.status, 200);
    assertContract('/attempts/stats', 'get', 200, statsRes.body);
});

test('OpenAPI contract: admin analytics and lesson management endpoints', async () => {
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

    const adminToken = adminRegisterRes.body.token;

    const createRes = await request(app)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createLessonPayload({
            question: 'Admin created lesson',
            question_tamil: 'அட்மின் பாடம்',
            order: 3,
            stageOrder: 3
        }));
    assert.equal(createRes.status, 201);
    assertContract('/lessons', 'post', 201, createRes.body);

    const updateRes = await request(app)
        .put(`/api/lessons/${createRes.body._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ question: 'Admin updated lesson question' });
    assert.equal(updateRes.status, 200);
    assertContract('/lessons/{id}', 'put', 200, updateRes.body);

    await LessonAttempt.create({
        user_id: learnerRegisterRes.body.user.id,
        lesson_id: createRes.body._id,
        time_spent: 21,
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
        .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(analyticsRes.status, 200);
    assertContract('/admin/analytics', 'get', 200, analyticsRes.body);

    const userProgressRes = await request(app)
        .get(`/api/admin/users/${learnerRegisterRes.body.user.id}/progress`)
        .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(userProgressRes.status, 200);
    assertContract('/admin/users/{id}/progress', 'get', 200, userProgressRes.body);

    const deleteRes = await request(app)
        .delete(`/api/lessons/${createRes.body._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(deleteRes.status, 200);
    assertContract('/lessons/{id}', 'delete', 200, deleteRes.body);
});
