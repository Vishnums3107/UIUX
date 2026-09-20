const test = require('node:test');
const assert = require('node:assert/strict');
const { buildLessons } = require('../seed');

const MCQ_TYPES = new Set([
    'audio_mcq',
    'image_mcq',
    'text_mcq',
    'role_play_mcq',
    'comprehension_mcq',
    'true_false',
    'mastery_test'
]);

test('seed generator outputs 333 lessons with expected stage distribution', () => {
    const lessons = buildLessons();
    assert.equal(lessons.length, 333);

    const counts = lessons.reduce((acc, lesson) => {
        acc[lesson.stage] = (acc[lesson.stage] || 0) + 1;
        return acc;
    }, {});

    assert.equal(counts[1], 36);
    assert.equal(counts[2], 36);
    assert.equal(counts[3], 54);
    assert.equal(counts[4], 27);
    assert.equal(counts[5], 40);
    assert.equal(counts[6], 40);
    assert.equal(counts[7], 32);
    assert.equal(counts[8], 30);
    assert.equal(counts[9], 28);
    assert.equal(counts[10], 10);
});

test('seed lessons contain required core fields and normalization constraints', () => {
    const lessons = buildLessons();

    lessons.forEach((lesson) => {
        assert.ok(lesson.question, 'question is required');
        assert.ok(lesson.correct_answer, 'correct_answer is required');
        assert.ok(lesson.hint, 'hint is required');
        assert.ok(lesson.explanation, 'explanation is required');
        assert.ok(lesson.transliteration, 'transliteration is required');
        assert.ok(lesson.tamilScript, 'tamilScript is required');
        assert.ok(lesson.phonetic, 'phonetic is required');
        assert.equal(lesson.question.normalize('NFC'), lesson.question);
        assert.equal(lesson.tamilScript.normalize('NFC'), lesson.tamilScript);

        if (MCQ_TYPES.has(lesson.exerciseType)) {
            assert.ok(Array.isArray(lesson.options), 'MCQ lessons must contain options');
            assert.ok(lesson.options.length >= 4, 'MCQ lessons must contain >= 4 options');
        }
    });
});

test('stage-specific seed constraints are satisfied', () => {
    const lessons = buildLessons();

    [1, 2, 3].forEach((stage) => {
        lessons.filter((lesson) => lesson.stage === stage).forEach((lesson) => {
            assert.ok(lesson.phonetic.includes('/'), `Stage ${stage} requires IPA-like phonetic notation`);
        });
    });

    const stage3SpeedRounds = lessons.filter((lesson) => lesson.stage === 3 && lesson.exerciseType === 'speed_round');
    assert.ok(stage3SpeedRounds.length >= 1, 'Stage 3 should include at least one speed_round lesson');
    stage3SpeedRounds.forEach((lesson) => {
        assert.ok(Array.isArray(lesson.questions), 'Stage 3 speed_round requires questions array');
        assert.equal(lesson.questions.length, 10, 'Stage 3 speed_round should contain 10 timed questions');
    });

    const stage5 = lessons.filter((lesson) => lesson.stage === 5);
    const stage5ByCategory = stage5.reduce((acc, lesson) => {
        const key = lesson.question.split(':')[0].trim();
        acc[key] = acc[key] || [];
        acc[key].push(lesson);
        return acc;
    }, {});
    assert.equal(Object.keys(stage5ByCategory).length, 10, 'Stage 5 should cover 10 vocabulary categories');
    Object.values(stage5ByCategory).forEach((categoryLessons) => {
        assert.equal(categoryLessons.length, 4, 'Each Stage 5 category should include 4 lessons');
    });

    const stage9 = lessons.filter((lesson) => lesson.stage === 9);
    stage9.forEach((lesson) => {
        assert.ok(Array.isArray(lesson.acceptedAnswers), 'Stage 9 lessons need acceptedAnswers');
        assert.ok(lesson.acceptedAnswers.length >= 2, 'Stage 9 needs strict + colloquial variants');
        assert.ok(lesson.modelAnswer, 'Stage 9 needs modelAnswer');
    });

    const stage7Translation = lessons.filter((lesson) => lesson.stage === 7 && lesson.exerciseType === 'translation_input');
    stage7Translation.forEach((lesson) => {
        assert.ok(Array.isArray(lesson.acceptedAnswers), 'Stage 7 translation lessons need acceptedAnswers');
        assert.ok(lesson.acceptedAnswers.length >= 2, 'Stage 7 translation lessons need formal + colloquial variants');
    });

    const stage10 = lessons.filter((lesson) => lesson.stage === 10);
    stage10.forEach((lesson) => {
        assert.ok(lesson.isMasteryTest, 'Stage 10 lessons should be marked as mastery tests');
        assert.ok(Array.isArray(lesson.questions), 'Stage 10 mastery lessons need questions array');
        assert.equal(lesson.questions.length, 20, 'Stage 10 mastery lessons require exactly 20 questions');
        lesson.questions.forEach((question, index) => {
            assert.ok(question.question, `Stage 10 question ${index + 1} requires prompt`);
            assert.ok(Array.isArray(question.options) && question.options.length >= 4, `Stage 10 question ${index + 1} needs >=4 options`);
            assert.ok(question.options.includes(question.correctAnswer), `Stage 10 question ${index + 1} correct answer must be in options`);
        });
    });

    const firstOfEachStage = new Map();
    lessons.forEach((lesson) => {
        if (!firstOfEachStage.has(lesson.stage) || lesson.stageOrder < firstOfEachStage.get(lesson.stage).stageOrder) {
            firstOfEachStage.set(lesson.stage, lesson);
        }
    });

    firstOfEachStage.forEach((lesson) => {
        assert.equal(lesson.difficulty, 'Beginner', `Stage ${lesson.stage} first lesson should be Beginner`);
    });
});
