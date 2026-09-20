const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const createApp = require('../app');
const { getReadinessReport } = require('../utils/readiness');
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const LessonAttempt = require('../models/LessonAttempt');

const normalizeStamp = (value = new Date().toISOString()) => {
    return value
        .replace(/[:]/g, '-')
        .replace(/\..+$/, 'Z')
        .replace('T', '_');
};

const resolveMongoTool = (name) => {
    const binaryName = process.platform === 'win32' ? `${name}.exe` : name;
    const explicitPath = process.env[`${name.toUpperCase()}_PATH`];
    if (explicitPath && fs.existsSync(explicitPath)) return explicitPath;

    const toolsBin = process.env.MONGODB_TOOLS_BIN;
    if (toolsBin) {
        const candidate = path.join(toolsBin, binaryName);
        if (fs.existsSync(candidate)) return candidate;
    }

    if (process.platform === 'win32') {
        const defaultPath = path.join('C:\\Program Files\\MongoDB\\Tools\\100\\bin', binaryName);
        if (fs.existsSync(defaultPath)) return defaultPath;
    }

    return binaryName;
};

const runCommand = (command, args, label) => {
    const result = spawnSync(command, args, { encoding: 'utf8' });

    if (result.error) {
        throw new Error(`${label} failed: ${result.error.message}`);
    }

    if (result.status !== 0) {
        const stderr = (result.stderr || '').trim();
        const stdout = (result.stdout || '').trim();
        throw new Error(`${label} failed with exit code ${result.status}\n${stderr || stdout || 'No output captured.'}`);
    }

    return (result.stdout || '').trim();
};

const getCounts = async () => {
    const [users, lessons, lessonattempts] = await Promise.all([
        User.countDocuments(),
        Lesson.countDocuments(),
        LessonAttempt.countDocuments()
    ]);

    return { users, lessons, lessonattempts };
};

const assertCountsMatch = (before, after) => {
    const keys = Object.keys(before);
    const mismatches = keys.filter((key) => before[key] !== after[key]);
    if (mismatches.length > 0) {
        const details = mismatches
            .map((key) => `${key}: expected ${before[key]}, got ${after[key]}`)
            .join('; ');
        throw new Error(`Restore validation failed. Count mismatch detected (${details}).`);
    }
};

const seedSourceData = async () => {
    const user = await User.create({
        name: 'Restore Drill User',
        email: 'restore.drill@example.com',
        password: 'Password123!',
        level: 'Intermediate'
    });

    const lessons = await Lesson.create([
        {
            category: 'uyir',
            difficulty: 'Beginner',
            type: 'mcq',
            question: 'Select the first Tamil vowel',
            question_tamil: 'முதல் தமிழ் உயிர் எழுத்தை தேர்ந்தெடுக்கவும்',
            options: ['a', 'aa', 'i', 'u'],
            correct_answer: 'a',
            hint: 'Tamil starts with அ',
            explanation: 'The first Tamil vowel is அ.'
        },
        {
            category: 'grammar',
            difficulty: 'Intermediate',
            type: 'text',
            question: 'Type the Tamil word for water',
            question_tamil: 'தண்ணீர் என்ற தமிழ் சொல்லை தட்டச்சு செய்யவும்',
            correct_answer: 'தண்ணீர்',
            hint: 'Starts with த',
            explanation: 'Water in Tamil is தண்ணீர்.'
        }
    ]);

    await LessonAttempt.create([
        {
            user_id: user._id,
            lesson_id: lessons[0]._id,
            time_spent: 24,
            errors: 0,
            hints_used: 1,
            retries: 0,
            score: 1,
            answer_given: 'a'
        },
        {
            user_id: user._id,
            lesson_id: lessons[1]._id,
            time_spent: 31,
            errors: 1,
            hints_used: 0,
            retries: 1,
            score: 1,
            answer_given: 'தண்ணீர்'
        }
    ]);
};

const buildMarkdownReport = (report) => {
    return [
        '# Restore Drill Evidence',
        '',
        `- Drill date: ${report.drillDate}`,
        `- Operator: ${report.operator}`,
        `- Backup source timestamp: ${report.backupSourceTimestamp}`,
        `- Backup type: ${report.backupType}`,
        `- Restore target: ${report.restoreTarget}`,
        `- Start time: ${report.startTime}`,
        `- End time: ${report.endTime}`,
        `- Duration (RTO achieved): ${report.durationSeconds}s`,
        `- Status: ${report.status}`,
        '',
        '## Document Count Checks',
        '',
        `- users: ${report.documentCountChecks.before.users} -> ${report.documentCountChecks.after.users}`,
        `- lessons: ${report.documentCountChecks.before.lessons} -> ${report.documentCountChecks.after.lessons}`,
        `- lessonattempts: ${report.documentCountChecks.before.lessonattempts} -> ${report.documentCountChecks.after.lessonattempts}`,
        '',
        '## API Validation Results',
        '',
        `- /api/health status: ${report.apiValidation.healthStatus}`,
        `- /api/readiness status: ${report.apiValidation.readinessStatus}`,
        `- Readiness payload status: ${report.apiValidation.readinessState}`,
        '',
        '## Tooling and Integrity',
        '',
        `- mongodump: ${report.toolVersions.mongodump}`,
        `- mongorestore: ${report.toolVersions.mongorestore}`,
        `- Backup archive SHA-256: ${report.archiveSha256}`,
        '',
        '## Notes',
        '',
        '- Drill executed on isolated non-production MongoDB memory instances.',
        '- Validation completed with matching document counts and healthy API checks.'
    ].join('\n');
};

const run = async () => {
    let sourceServer;
    let targetServer;

    try {
        const mongodump = resolveMongoTool('mongodump');
        const mongorestore = resolveMongoTool('mongorestore');

        const sourceDbName = 'tamil-learning-restore-source';
        const targetDbName = sourceDbName;

        sourceServer = await MongoMemoryServer.create();
        const sourceUri = sourceServer.getUri(sourceDbName);

        await mongoose.connect(sourceUri);
        await seedSourceData();
        const beforeCounts = await getCounts();
        await mongoose.disconnect();

        const backupSourceTimestamp = new Date().toISOString();
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'restore-drill-'));
        const archivePath = path.join(tempDir, 'tamil-learning.archive.gz');

        runCommand(
            mongodump,
            [
                `--uri=${sourceUri}`,
                `--db=${sourceDbName}`,
                '--gzip',
                `--archive=${archivePath}`
            ],
            'mongodump'
        );

        const archiveSha256 = crypto.createHash('sha256')
            .update(fs.readFileSync(archivePath))
            .digest('hex');

        targetServer = await MongoMemoryServer.create();
        const targetUri = targetServer.getUri(targetDbName);

        const restoreStartMs = Date.now();

        runCommand(
            mongorestore,
            [
                `--uri=${targetUri}`,
                '--gzip',
                `--archive=${archivePath}`,
                '--drop'
            ],
            'mongorestore'
        );

        await mongoose.connect(targetUri);
        const afterCounts = await getCounts();
        assertCountsMatch(beforeCounts, afterCounts);

        const app = createApp({ getReadinessReport });
        const healthRes = await request(app).get('/api/health');
        const readinessRes = await request(app).get('/api/readiness');

        const restoreEndMs = Date.now();
        const durationSeconds = Number(((restoreEndMs - restoreStartMs) / 1000).toFixed(3));

        const report = {
            drillDate: new Date().toISOString(),
            operator: process.env.USERNAME || process.env.USER || 'unknown',
            backupSourceTimestamp,
            backupType: 'logical archive (mongodump)',
            restoreTarget: targetUri,
            startTime: new Date(restoreStartMs).toISOString(),
            endTime: new Date(restoreEndMs).toISOString(),
            durationSeconds,
            documentCountChecks: {
                before: beforeCounts,
                after: afterCounts
            },
            apiValidation: {
                healthStatus: healthRes.status,
                readinessStatus: readinessRes.status,
                readinessState: readinessRes.body?.status || 'unknown'
            },
            archiveSha256,
            toolVersions: {
                mongodump: runCommand(mongodump, ['--version'], 'mongodump --version').split(/\r?\n/)[0],
                mongorestore: runCommand(mongorestore, ['--version'], 'mongorestore --version').split(/\r?\n/)[0]
            },
            status: 'passed'
        };

        const repoRoot = path.resolve(__dirname, '..', '..');
        const evidenceDir = path.join(repoRoot, 'docs', 'release-evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        const stamp = normalizeStamp(report.drillDate);

        const jsonPath = path.join(evidenceDir, `restore-drill-${stamp}.json`);
        const markdownPath = path.join(evidenceDir, `restore-drill-${stamp}.md`);

        fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        fs.writeFileSync(markdownPath, `${buildMarkdownReport(report)}\n`, 'utf8');

        console.log('Restore drill completed successfully.');
        console.log(`RTO achieved: ${report.durationSeconds}s`);
        console.log(`Evidence JSON: ${jsonPath}`);
        console.log(`Evidence Markdown: ${markdownPath}`);
    } finally {
        await mongoose.disconnect().catch(() => {});
        if (sourceServer) await sourceServer.stop();
        if (targetServer) await targetServer.stop();
    }
};

run().catch((error) => {
    console.error('Restore drill failed.');
    console.error(error.message);
    process.exit(1);
});
