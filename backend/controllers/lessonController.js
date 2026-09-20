const Lesson = require('../models/Lesson');
const LessonAttempt = require('../models/LessonAttempt');

const DIFFICULTY_MAP = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced'
};

const normalizeDifficulty = (value = '') => {
    if (!value) return value;
    const normalized = DIFFICULTY_MAP[String(value).trim().toLowerCase()];
    return normalized || value;
};

const isStageUnlocked = (user, stageNumber) => {
    if (stageNumber <= 1) return true;
    const masteryPassed = Array.isArray(user.masteryPassedStages) ? user.masteryPassedStages : [];
    return masteryPassed.includes(stageNumber - 1);
};

const buildStageLockedResponse = (res, stageNumber) => res.status(403).json({
    error: `Stage ${stageNumber} is locked.`,
    requiredMasteryStage: stageNumber - 1
});

const getStageMasteryLesson = async (stageNumber) => {
    if (stageNumber < 1 || stageNumber > 9) return null;

    return Lesson.findOne({
        isMasteryTest: true,
        unlocksStage: stageNumber + 1
    }).sort({ stageOrder: 1, order: 1 });
};

const getMasteryStageNumber = (lesson) => {
    if (!lesson?.isMasteryTest) return null;

    if (typeof lesson.unlocksStage === 'number' && Number.isFinite(lesson.unlocksStage)) {
        return lesson.unlocksStage - 1;
    }

    if (lesson.stage === 10) return 10;
    return null;
};

/**
 * GET /api/lessons
 * Get lessons filtered by difficulty and/or category
 */
const getLessons = async (req, res) => {
    try {
        const { difficulty, category } = req.query;
        const filter = {};

        if (difficulty) filter.difficulty = normalizeDifficulty(difficulty);
        if (category) filter.category = category;

        const lessons = await Lesson.find(filter).sort({ category: 1, order: 1 });
        res.json(lessons);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lessons.' });
    }
};

/**
 * GET /api/lessons/:id
 * Get a single lesson
 */
const getLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found.' });
        }
        res.json(lesson);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lesson.' });
    }
};

/**
 * GET /api/lessons/categories/summary
 * Get summary of available categories and counts
 */
const getCategorySummary = async (req, res) => {
    try {
        const summary = await Lesson.aggregate([
            {
                $group: {
                    _id: { category: '$category', difficulty: '$difficulty' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.category': 1, '_id.difficulty': 1 } }
        ]);
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch summary.' });
    }
};

/**
 * GET /api/lessons/stage/:stageNumber
 * Get all lessons in a stage with unlock gate check.
 */
const getLessonsByStage = async (req, res) => {
    try {
        const stageNumber = Number(req.params.stageNumber);

        if (!isStageUnlocked(req.user, stageNumber)) {
            return buildStageLockedResponse(res, stageNumber);
        }

        const lessons = await Lesson.find({ stage: stageNumber })
            .sort({ stageOrder: 1, order: 1 });

        if (stageNumber >= 1 && stageNumber <= 9) {
            const stageLessons = lessons.filter((lesson) => !lesson.isMasteryTest);
            const masteryLesson = await getStageMasteryLesson(stageNumber);
            if (masteryLesson) {
                return res.json([...stageLessons, masteryLesson]);
            }
            return res.json(stageLessons);
        }

        return res.json(lessons);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch stage lessons.' });
    }
};

/**
 * GET /api/lessons/stages/progress
 * Returns progress summary for all stages.
 */
const getStageProgress = async (req, res) => {
    try {
        const stages = Array.from({ length: 10 }, (_, index) => index + 1);

        const [stageTotals, passedAttempts] = await Promise.all([
            Lesson.aggregate([
                { $group: { _id: '$stage', totalLessons: { $sum: 1 } } }
            ]),
            LessonAttempt.find({
                user_id: req.user._id,
                score: 1,
                $or: [
                    { isMasteryTest: { $exists: false } },
                    { isMasteryTest: false }
                ]
            }).select('lesson_id').lean()
        ]);

        const stageTotalMap = new Map(stageTotals.map((entry) => [entry._id, entry.totalLessons]));
        const passedLessonIds = [...new Set(passedAttempts.map((attempt) => String(attempt.lesson_id)))];

        const passedLessons = await Lesson.find({
            _id: { $in: passedLessonIds }
        }).select('stage').lean();

        const passedByStage = new Map();
        passedLessons.forEach((lesson) => {
            if (!lesson?.stage) return;
            const current = passedByStage.get(lesson.stage) || 0;
            passedByStage.set(lesson.stage, current + 1);
        });

        const unlockedStages = Array.isArray(req.user.unlockedStages) ? req.user.unlockedStages : [1];
        const masteryPassedStages = Array.isArray(req.user.masteryPassedStages) ? req.user.masteryPassedStages : [];

        const progress = stages.map((stage) => ({
            stage,
            totalLessons: stageTotalMap.get(stage) || 0,
            completedLessons: passedByStage.get(stage) || 0,
            unlocked: stage === 1 || unlockedStages.includes(stage) || isStageUnlocked(req.user, stage),
            masteryPassed: masteryPassedStages.includes(stage)
        }));

        return res.json(progress);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch stage progress.' });
    }
};

/**
 * GET /api/lessons/stage/:stageNumber/next
 * Returns next unfinished lesson in a stage.
 */
const getNextLessonByStage = async (req, res) => {
    try {
        const stageNumber = Number(req.params.stageNumber);

        if (!isStageUnlocked(req.user, stageNumber)) {
            return buildStageLockedResponse(res, stageNumber);
        }

        if (stageNumber === 10) {
            const masteryLessons = await Lesson.find({
                stage: 10,
                isMasteryTest: true
            }).sort({ stageOrder: 1, order: 1 });

            const passedMasteryStages = new Set(Array.isArray(req.user.masteryPassedStages) ? req.user.masteryPassedStages : []);
            const nextMasteryLesson = masteryLessons.find((lesson) => {
                const masteryStage = getMasteryStageNumber(lesson);
                if (!masteryStage) return false;
                return !passedMasteryStages.has(masteryStage);
            }) || null;

            return res.json({
                stage: stageNumber,
                completed: !nextMasteryLesson,
                lesson: nextMasteryLesson
            });
        }

        const [stageLessons, passedAttempts] = await Promise.all([
            Lesson.find({
                stage: stageNumber,
                $or: [
                    { isMasteryTest: { $exists: false } },
                    { isMasteryTest: false }
                ]
            }).sort({ stageOrder: 1, order: 1 }),
            LessonAttempt.find({
                user_id: req.user._id,
                score: 1,
                $or: [
                    { isMasteryTest: { $exists: false } },
                    { isMasteryTest: false }
                ]
            }).select('lesson_id').lean()
        ]);

        const passedLessonSet = new Set(passedAttempts.map((attempt) => String(attempt.lesson_id)));
        const nextLesson = stageLessons.find((lesson) => !passedLessonSet.has(String(lesson._id))) || null;

        if (nextLesson) {
            return res.json({
                stage: stageNumber,
                completed: false,
                lesson: nextLesson
            });
        }

        const masteryLesson = await getStageMasteryLesson(stageNumber);
        const passedMasteryStages = new Set(Array.isArray(req.user.masteryPassedStages) ? req.user.masteryPassedStages : []);
        const stageMasteryPassed = passedMasteryStages.has(stageNumber);

        const pendingMasteryLesson = stageMasteryPassed ? null : masteryLesson;

        return res.json({
            stage: stageNumber,
            completed: !pendingMasteryLesson,
            lesson: pendingMasteryLesson
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch next lesson.' });
    }
};

/**
 * POST /api/lessons
 * Create a new lesson (Admin only)
 */
const createLesson = async (req, res) => {
    try {
        const lesson = new Lesson(req.body);
        const savedLesson = await lesson.save();
        res.status(201).json(savedLesson);
    } catch (err) {
        res.status(400).json({ error: err.message || 'Failed to create lesson.' });
    }
};

/**
 * PUT /api/lessons/:id
 * Update an existing lesson (Admin only)
 */
const updateLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found.' });
        }
        res.json(lesson);
    } catch (err) {
        res.status(400).json({ error: err.message || 'Failed to update lesson.' });
    }
};

/**
 * DELETE /api/lessons/:id
 * Delete a lesson (Admin only)
 */
const deleteLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findByIdAndDelete(req.params.id);
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found.' });
        }
        res.json({ message: 'Lesson deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete lesson.' });
    }
};

module.exports = {
    getLessons,
    getLesson,
    getCategorySummary,
    getLessonsByStage,
    getStageProgress,
    getNextLessonByStage,
    createLesson,
    updateLesson,
    deleteLesson
};
