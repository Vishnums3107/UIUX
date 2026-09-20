import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { lessonAPI, attemptAPI, authAPI } from '../services/api';
import { useInteractionTracker } from '../hooks/useInteractionTracker';
import AdaptiveLesson from '../components/AdaptiveLesson';
import SessionPulseHUD from '../components/SessionPulseHUD';
import TamilLetterBoard from '../components/TamilLetterBoard';
import ConfidenceAura from '../components/ConfidenceAura';
import { generateFluencyCertificate } from '../utils/certificate';
import { buildLearnCopilotRecommendations } from '../utils/copilotEngine';
import { ADAPTIVE_MODE_OPTIONS, buildAdaptiveSessionModel } from '../utils/adaptiveUI';

const CATEGORIES = [
    { id: 'uyir', label: 'Uyir Ezhuthukkal', icon: '🔤', desc: 'Tamil Vowels (உயிர் எழுத்துக்கள்)' },
    { id: 'mei', label: 'Mei Ezhuthukkal', icon: '🔡', desc: 'Tamil Consonants (மெய் எழுத்துக்கள்)' },
    { id: 'uyir-mei', label: 'Uyir-Mei', icon: '✏️', desc: 'Combined Letters (உயிர்மெய் எழுத்துக்கள்)' },
    { id: 'grammar', label: 'Grammar', icon: '📖', desc: 'Basic Grammar (இலக்கணம்)' },
    { id: 'sentences', label: 'Sentences', icon: '💬', desc: 'Sentence Formation (வாக்கிய அமைப்பு)' },
];

const STUDY_MANTRAS = [
    'Lock in for one clean answer at a time.',
    'Read the Tamil line aloud before selecting.',
    'Accuracy first. Speed follows naturally.',
    'Every focused minute compounds fluency.'
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getLocalStorage = () => {
    if (typeof window === 'undefined') return null;

    try {
        return window.localStorage || null;
    } catch {
        return null;
    }
};

const getSessionContext = () => {
    const search = new window.URLSearchParams(window.location.search);
    if (search.get('mode') === 'review') {
        return { mode: 'review', stage: null, category: null };
    }

    const stage = Number.parseInt(search.get('stage') || '', 10);
    if (Number.isFinite(stage) && stage >= 1 && stage <= 10) {
        return { mode: 'stage', stage, category: null };
    }

    const category = String(search.get('category') || '').trim().toLowerCase();
    if (CATEGORIES.some((item) => item.id === category)) {
        return { mode: 'category', stage: null, category };
    }

    return { mode: 'category', stage: null, category: null };
};

const getInitialImmersiveMode = () => {
    const storage = getLocalStorage();
    if (!storage) return false;
    const stored = storage.getItem('learn-immersive-mode');
    if (stored !== null) return stored === 'on';

    try {
        const savedUser = JSON.parse(storage.getItem('user') || '{}');
        return savedUser?.adaptivePreferences?.immersiveModeDefault === true;
    } catch {
        return false;
    }
};

const getInitialAdaptiveModePreference = () => {
    const storage = getLocalStorage();
    if (!storage) return 'auto';
    const saved = storage.getItem('learn-adaptive-mode');
    if (ADAPTIVE_MODE_OPTIONS.some((option) => option.id === saved)) return saved;

    try {
        const savedUser = JSON.parse(storage.getItem('user') || '{}');
        const persistedMode = savedUser?.adaptivePreferences?.modePreference;
        return ADAPTIVE_MODE_OPTIONS.some((option) => option.id === persistedMode) ? persistedMode : 'auto';
    } catch {
        return 'auto';
    }
};

const getInitialViewportWidth = () => {
    if (typeof window === 'undefined') return 1280;
    return window.innerWidth || 1280;
};

const resolvePanelDensity = (ui = {}, viewportWidth = 1280) => {
    const mobile = viewportWidth < 768;
    if (mobile) {
        return ui.panelDensityMobile || ui.density || 'balanced';
    }

    return ui.panelDensityDesktop || ui.density || 'balanced';
};

const getConfidenceAwareCompletionCopy = ({ percentage, confidenceBand }) => {
    if (confidenceBand === 'recovering') {
        return percentage >= 70
            ? 'Strong recovery session. Keep this exact rhythm for your next block.'
            : 'Recovery is in progress. Clean, deliberate attempts still move you forward.';
    }

    if (confidenceBand === 'momentum') {
        return percentage >= 80
            ? 'Momentum is real. This is a good moment to stretch with harder recall.'
            : 'You are building momentum. Keep precision high and avoid rushing.';
    }

    if (percentage >= 75) {
        return 'Steady execution. You are ready to stack another focused set.';
    }

    return 'Stable calibration session. A second short block will reinforce retention.';
};

const getConfidenceAwareEmptyGuidance = ({ sessionMode, confidenceBand }) => {
    if (sessionMode === 'review') {
        return confidenceBand === 'momentum'
            ? 'Queue is clear. Use this window for a challenge pass in your weakest category.'
            : 'Queue is clear. Run one short guided session to keep recall warm.';
    }

    if (confidenceBand === 'recovering') {
        return 'Try a lighter category block and keep pronunciation audio on for each prompt.';
    }

    if (confidenceBand === 'momentum') {
        return 'You can push into a higher-pressure category or stage right now.';
    }

    return 'Pick any category and keep a steady pace while the system gathers fresh signals.';
};

export default function Learn() {
    const { user, updateUser } = useAuth();
    const initialSession = getSessionContext();
    const initialSelection = initialSession.mode === 'stage' && initialSession.stage
        ? `stage-${initialSession.stage}`
        : initialSession.mode === 'category' && initialSession.category
            ? initialSession.category
        : initialSession.mode === 'review'
            ? 'review'
            : null;
    const [lessons, setLessons] = useState([]);
    const [showLetterBoard, setShowLetterBoard] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState(initialSelection);
    const [selectedStage, setSelectedStage] = useState(initialSession.stage);
    const [sessionMode, setSessionMode] = useState(initialSession.mode);
    const [loading, setLoading] = useState(initialSession.mode !== 'category' || Boolean(initialSession.category));
    const [completed, setCompleted] = useState(false);
    const [sessionResults, setSessionResults] = useState([]);
    const [timerSeconds, setTimerSeconds] = useState(60);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [newBadges, setNewBadges] = useState([]);
    const [xpGain, setXpGain] = useState(0);
    const [latestUnlockedStage, setLatestUnlockedStage] = useState(null);
    const [certificate, setCertificate] = useState(null);
    const [reviewQueueMeta, setReviewQueueMeta] = useState({ total: 0, items: [] });
    const [sessionStartedAt, setSessionStartedAt] = useState(Date.now());
    const [liveNow, setLiveNow] = useState(Date.now());
    const [lastActivityAt, setLastActivityAt] = useState(Date.now());
    const [uxTelemetry, setUxTelemetry] = useState({ interactions: 0, hints: 0, errors: 0, retries: 0 });
    const [immersiveMode, setImmersiveMode] = useState(getInitialImmersiveMode);
    const [adaptiveModePreference, setAdaptiveModePreference] = useState(getInitialAdaptiveModePreference);
    const [viewportWidth, setViewportWidth] = useState(getInitialViewportWidth);
    const badgeTimerRef = useRef(null);
    const xpTimerRef = useRef(null);
    const preferenceHydratedRef = useRef(false);
    const {
        startTracking,
        completeTracking,
        recordHint,
        recordError,
        recordRetry,
        recordActivity
    } = useInteractionTracker();

    const level = user?.level || 'Intermediate';
    const isAdvanced = level === 'Advanced';

    const normalizeAnswer = (value = '') => String(value).trim().toLowerCase();
    const isAnswerCorrect = (lesson, answer) => {
        const normalizedAnswer = normalizeAnswer(answer);
        if (!normalizedAnswer) return false;
        return normalizedAnswer === normalizeAnswer(lesson?.correct_answer);
    };

    const clearBadges = () => {
        setNewBadges([]);
        if (badgeTimerRef.current) {
            clearTimeout(badgeTimerRef.current);
            badgeTimerRef.current = null;
        }
    };

    const showBadges = (badges) => {
        if (!Array.isArray(badges) || badges.length === 0) return;
        setNewBadges(badges);
        if (badgeTimerRef.current) {
            clearTimeout(badgeTimerRef.current);
        }
        badgeTimerRef.current = setTimeout(() => {
            setNewBadges([]);
            badgeTimerRef.current = null;
        }, 5000);
    };

    const showXP = (amount) => {
        if (!amount || amount <= 0) return;
        setXpGain(amount);
        if (xpTimerRef.current) {
            clearTimeout(xpTimerRef.current);
        }
        xpTimerRef.current = setTimeout(() => {
            setXpGain(0);
            xpTimerRef.current = null;
        }, 1800);
    };

    const resetSessionState = useCallback(() => {
        setCurrentIndex(0);
        setCompleted(false);
        setSessionResults([]);
        setCurrentAnswer('');
        setSubmitting(false);
        clearBadges();
        setXpGain(0);
        setLatestUnlockedStage(null);
        setCertificate(null);
        const now = Date.now();
        setSessionStartedAt(now);
        setLiveNow(now);
        setLastActivityAt(now);
        setUxTelemetry({ interactions: 0, hints: 0, errors: 0, retries: 0 });
    }, []);

    const noteInteraction = useCallback((kind = 'interaction') => {
        const now = Date.now();
        setLastActivityAt(now);
        setUxTelemetry((prev) => ({
            interactions: prev.interactions + 1,
            hints: prev.hints + (kind === 'hints' ? 1 : 0),
            errors: prev.errors + (kind === 'errors' ? 1 : 0),
            retries: prev.retries + (kind === 'retries' ? 1 : 0)
        }));
    }, []);

    const handleHintUsed = useCallback(() => {
        recordHint();
        noteInteraction('hints');
    }, [noteInteraction, recordHint]);

    const handleError = useCallback(() => {
        recordError();
        noteInteraction('errors');
    }, [noteInteraction, recordError]);

    const handleRetry = useCallback(() => {
        recordRetry();
        noteInteraction('retries');
    }, [noteInteraction, recordRetry]);

    const handleActivity = useCallback(() => {
        recordActivity();
        noteInteraction('interaction');
    }, [noteInteraction, recordActivity]);

    const handleAnswerChange = useCallback((value) => {
        setCurrentAnswer(value);
        noteInteraction('interaction');
    }, [noteInteraction]);

    const elapsedSeconds = Math.max(1, Math.round((liveNow - sessionStartedAt) / 1000));
    const answeredCount = sessionResults.length;
    const answeredCorrect = sessionResults.filter((result) => result.isCorrect).length;
    const sessionAccuracy = answeredCount > 0 ? Math.round((answeredCorrect / answeredCount) * 100) : 0;
    const idleGapSeconds = Math.max(0, Math.round((liveNow - lastActivityAt) / 1000));
    const averageTimePerAnswer = answeredCount > 0
        ? Math.max(8, Math.round(sessionResults.reduce((sum, result) => sum + (result.metrics?.time_spent || 0), 0) / answeredCount))
        : 55;
    const remainingQuestions = Math.max(0, lessons.length - answeredCount);
    const sessionMasteryEtaMinutes = Math.max(1, Math.ceil((remainingQuestions * averageTimePerAnswer) / 60));
    const focusScore = clamp(
        100
            - (uxTelemetry.errors * 8)
            - (uxTelemetry.hints * 6)
            - (uxTelemetry.retries * 5)
            - Math.max(0, idleGapSeconds - 10),
        25,
        99
    );
    const fluencyTrajectory = clamp(
        Math.round((user?.skill_score || 0) + (sessionAccuracy * 0.18) - (uxTelemetry.errors * 0.9) + (uxTelemetry.interactions * 0.12)),
        0,
        100
    );
    const adaptiveSession = useMemo(() => buildAdaptiveSessionModel({
        userLevel: level,
        userSkillScore: user?.skill_score || 50,
        sessionMode,
        selectedStage,
        answeredCount,
        remainingQuestions,
        sessionAccuracy,
        averageTimePerAnswer,
        idleGapSeconds,
        fluencyTrajectory,
        focusScore,
        sessionMasteryEtaMinutes,
        uxTelemetry,
        immersiveMode,
        modePreference: adaptiveModePreference
    }), [
        adaptiveModePreference,
        averageTimePerAnswer,
        answeredCount,
        fluencyTrajectory,
        focusScore,
        idleGapSeconds,
        immersiveMode,
        level,
        remainingQuestions,
        selectedStage,
        sessionAccuracy,
        sessionMasteryEtaMinutes,
        sessionMode,
        user?.skill_score,
        uxTelemetry
    ]);
    const learnCopilotRecommendations = useMemo(() => buildLearnCopilotRecommendations({
        sessionMode,
        selectedStage,
        reviewQueueTotal: reviewQueueMeta.total || 0,
        remainingQuestions,
        sessionAccuracy,
        focusScore,
        idleGapSeconds,
        averageTimePerAnswer,
        uxTelemetry,
        fluencyTrajectory,
        sessionMasteryEtaMinutes
    }), [
        averageTimePerAnswer,
        fluencyTrajectory,
        focusScore,
        idleGapSeconds,
        remainingQuestions,
        reviewQueueMeta.total,
        selectedStage,
        sessionAccuracy,
        sessionMasteryEtaMinutes,
        sessionMode,
        uxTelemetry
    ]);
    const topRecommendation = learnCopilotRecommendations[0];
    const adaptiveModeMeta = ADAPTIVE_MODE_OPTIONS.find((option) => option.id === adaptiveSession.mode) || ADAPTIVE_MODE_OPTIONS[0];
    const activeMantra = STUDY_MANTRAS[currentIndex % STUDY_MANTRAS.length];
    const adaptiveUiConfig = adaptiveSession.ui || {};
    const panelDensity = resolvePanelDensity(adaptiveUiConfig, viewportWidth);
    const learnShellClass = [
        `adaptive-type-${adaptiveUiConfig.typographyScale || 'balanced'}`,
        `adaptive-motion-${adaptiveUiConfig.motionIntensity || 'balanced'}`,
        `adaptive-panel-${panelDensity}`
    ].join(' ');
    const emptyGuidance = getConfidenceAwareEmptyGuidance({
        sessionMode,
        confidenceBand: adaptiveSession.confidenceBand
    });

    // Load lessons for selected category
    const loadLessons = useCallback(async (category) => {
        setLoading(true);
        try {
            const res = await lessonAPI.getAll({ category, difficulty: adaptiveSession.recommendedDifficulty });
            let data = res.data;
            // Fallback: if no lessons at current level, try all difficulties
            if (data.length === 0) {
                const fallback = await lessonAPI.getAll({ category });
                data = fallback.data;
            }
            setLessons(data);
            setReviewQueueMeta({ total: 0, items: [] });
            resetSessionState();
            if (data.length > 0) {
                startTracking();
                if (isAdvanced) setTimerSeconds(60);
            }
        } catch (err) {
            console.error('Failed to load lessons:', err);
        } finally {
            setLoading(false);
        }
    }, [adaptiveSession.recommendedDifficulty, isAdvanced, startTracking, resetSessionState]);

    const loadStageLessons = useCallback(async (stageNumber) => {
        setLoading(true);
        try {
            const [stageRes, nextRes] = await Promise.all([
                lessonAPI.getStage(stageNumber),
                lessonAPI.getNextInStage(stageNumber).catch(() => ({ data: { lesson: null } }))
            ]);
            const stageLessons = stageRes.data || [];
            setSessionMode('stage');
            setSelectedStage(stageNumber);
            setSelectedCategory(`stage-${stageNumber}`);
            setLessons(stageLessons);
            setReviewQueueMeta({ total: 0, items: [] });
            resetSessionState();
            const nextLessonId = nextRes?.data?.lesson?._id;
            if (nextLessonId) {
                const nextIndex = stageLessons.findIndex((lesson) => lesson._id === nextLessonId);
                if (nextIndex >= 0) {
                    setCurrentIndex(nextIndex);
                }
            }

            if (stageLessons.length > 0) {
                startTracking();
                if (isAdvanced) setTimerSeconds(60);
            }
        } catch (err) {
            console.error('Failed to load stage lessons:', err);
            setLessons([]);
            setSelectedStage(stageNumber);
            setSelectedCategory(`stage-${stageNumber}`);
        } finally {
            setLoading(false);
        }
    }, [isAdvanced, resetSessionState, startTracking]);

    const loadReviewQueue = useCallback(async () => {
        setLoading(true);
        try {
            const res = await attemptAPI.getReviewQueue({ limit: 10 });
            const items = res.data?.items || [];
            setSessionMode('review');
            setSelectedCategory('review');
            setReviewQueueMeta({
                total: res.data?.total || items.length,
                items,
                upcomingCount: res.data?.upcomingCount || 0,
                nextDueAt: res.data?.nextDueAt || null
            });
            setLessons(items.map((item) => item.lesson));
            resetSessionState();
            if (items.length > 0) {
                startTracking();
                if (isAdvanced) setTimerSeconds(60);
            }
        } catch (err) {
            console.error('Failed to load review queue:', err);
            setLessons([]);
            setSelectedCategory('review');
            setReviewQueueMeta({ total: 0, items: [] });
        } finally {
            setLoading(false);
        }
    }, [isAdvanced, startTracking, resetSessionState]);

    const handleCategorySelect = (category) => {
        setSessionMode('category');
        setSelectedStage(null);
        setSelectedCategory(category);
        setCurrentAnswer('');
        loadLessons(category);
    };

    const handleSubmit = useCallback(async (submission = {}) => {
        if (submitting) return;

        const metrics = completeTracking();
        const lesson = lessons[currentIndex];
        if (!lesson) return;

        const answer = (submission.answer ?? currentAnswer ?? '').trim();
        const isCorrect = typeof submission.isCorrect === 'boolean'
            ? submission.isCorrect
            : isAnswerCorrect(lesson, answer);

        setSubmitting(true);

        try {
            const isMastery = lesson.isMasteryTest || lesson.exerciseType === 'mastery_test';

            if (isMastery) {
                const masteryPayload = submission.masteryPayload || {
                    stageNumber: selectedStage || (lesson.unlocksStage ? lesson.unlocksStage - 1 : 1),
                    scorePercent: isCorrect ? 100 : 0,
                    correctCount: isCorrect ? 1 : 0,
                    totalQuestions: 1,
                    timeSpent: metrics.time_spent,
                    errors: metrics.errors,
                    hintsUsed: metrics.hints_used,
                    questions: []
                };

                const masteryRes = await attemptAPI.submitMastery(masteryPayload);
                showBadges(masteryRes.data.newBadges || []);
                showXP(masteryRes.data.user?.xpEarned || 0);
                setLatestUnlockedStage(masteryRes.data.unlockedStage || null);

                const masteryStage = Number(masteryPayload.stageNumber || selectedStage || 0);
                if (masteryRes.data.passed && masteryStage === 10) {
                    const generated = generateFluencyCertificate({
                        userName: user?.name || 'Learner',
                        date: new Date()
                    });
                    if (generated) {
                        setCertificate(generated);
                    }
                }

                updateUser({
                    unlockedStages: masteryRes.data.user?.unlockedStages,
                    masteryPassedStages: masteryRes.data.user?.masteryPassedStages,
                    xp: masteryRes.data.user?.xp,
                    totalXP: masteryRes.data.user?.totalXP
                });
            } else {
                const res = await attemptAPI.submit({
                    lesson_id: lesson._id,
                    ...metrics,
                    score: isCorrect ? 1 : 0,
                    answer_given: answer,
                });

                const { skillUpdate } = res.data;
                updateUser({
                    skill_score: skillUpdate.skill_score,
                    level: skillUpdate.level,
                    lessons_completed: skillUpdate.lessons_completed,
                    current_streak: skillUpdate.current_streak,
                    longest_streak: skillUpdate.longest_streak,
                    xp: skillUpdate.xp,
                    totalXP: skillUpdate.totalXP,
                    unlockedStages: skillUpdate.unlockedStages,
                    masteryPassedStages: skillUpdate.masteryPassedStages,
                    adaptiveProfile: skillUpdate.adaptiveProfile
                });
                showBadges(skillUpdate.new_badges);
                showXP(skillUpdate.xpEarned);
            }

            setSessionResults(prev => [...prev, { lesson, isCorrect, metrics, answer, timedOut: !!submission.timedOut }]);

            setTimeout(() => {
                if (currentIndex < lessons.length - 1) {
                    setCurrentIndex(prev => prev + 1);
                    setCurrentAnswer('');
                    startTracking();
                    if (isAdvanced) setTimerSeconds(60);
                } else {
                    setCompleted(true);
                }
                setSubmitting(false);
            }, 1500);
        } catch (err) {
            console.error('Failed to submit attempt:', err);
            setSubmitting(false);
        }
    }, [submitting, completeTracking, lessons, currentIndex, currentAnswer, updateUser, isAdvanced, selectedStage, startTracking]);

    // Timer countdown for advanced mode
    useEffect(() => {
        if (!isAdvanced || !selectedCategory || completed || submitting) return;
        const interval = setInterval(() => {
            setTimerSeconds(prev => {
                if (prev <= 1) {
                    handleSubmit({ answer: currentAnswer, timedOut: true });
                    return 60;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isAdvanced, selectedCategory, completed, submitting, currentAnswer, handleSubmit]);

    useEffect(() => {
        const context = getSessionContext();
        if (context.mode === 'review') {
            loadReviewQueue();
            return;
        }
        if (context.mode === 'stage' && context.stage) {
            loadStageLessons(context.stage);
            return;
        }
        if (context.mode === 'category' && context.category) {
            setSessionMode('category');
            setSelectedStage(null);
            setSelectedCategory(context.category);
            loadLessons(context.category);
        }
    }, [loadReviewQueue, loadStageLessons]);

    useEffect(() => {
        return () => {
            if (badgeTimerRef.current) {
                clearTimeout(badgeTimerRef.current);
            }
            if (xpTimerRef.current) {
                clearTimeout(xpTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setLiveNow(Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        getLocalStorage()?.setItem('learn-immersive-mode', immersiveMode ? 'on' : 'off');
    }, [immersiveMode]);

    useEffect(() => {
        getLocalStorage()?.setItem('learn-adaptive-mode', adaptiveModePreference);
    }, [adaptiveModePreference]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const onResize = () => setViewportWidth(window.innerWidth || 1280);
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
        };
    }, []);

    useEffect(() => {
        const storage = getLocalStorage();
        if (!storage || !user?.adaptivePreferences) return;

        const storedMode = storage.getItem('learn-adaptive-mode');
        if (!storedMode && user.adaptivePreferences.modePreference) {
            setAdaptiveModePreference(user.adaptivePreferences.modePreference);
        }

        const storedImmersive = storage.getItem('learn-immersive-mode');
        if (!storedImmersive) {
            setImmersiveMode(Boolean(user.adaptivePreferences.immersiveModeDefault));
        }
    }, [user?.adaptivePreferences]);

    useEffect(() => {
        if (!user) return undefined;

        if (!preferenceHydratedRef.current) {
            preferenceHydratedRef.current = true;
            return undefined;
        }

        const currentPreferences = user.adaptivePreferences || {};
        if (
            currentPreferences.modePreference === adaptiveModePreference &&
            Boolean(currentPreferences.immersiveModeDefault) === immersiveMode
        ) {
            return undefined;
        }

        const timer = window.setTimeout(async () => {
            try {
                const res = await authAPI.updateProfile({
                    adaptivePreferences: {
                        modePreference: adaptiveModePreference,
                        immersiveModeDefault: immersiveMode
                    }
                });
                updateUser(res.data);
            } catch (err) {
                console.error('Failed to persist adaptive preferences:', err);
            }
        }, 450);

        return () => window.clearTimeout(timer);
    }, [adaptiveModePreference, immersiveMode, updateUser, user]);

    const badgeBanner = (newBadges.length > 0 || xpGain > 0) ? (
        <>
            {newBadges.length > 0 && (
                <div className="fixed top-20 right-4 z-40 space-y-2">
                    {newBadges.map((badge, index) => (
                        <div
                            key={`${badge.name}-${index}`}
                            className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 shadow-lg shadow-emerald-900/30 backdrop-blur-sm animate-slide-up"
                        >
                            <p className="text-emerald-200 text-sm font-semibold">New Badge Unlocked!</p>
                            <p className="text-emerald-100 text-sm">{badge.icon} {badge.name}</p>
                        </div>
                    ))}
                </div>
            )}
            {xpGain > 0 && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 rounded-xl border border-amber-400/40 bg-amber-500/20 px-4 py-2 text-amber-100 animate-slide-up">
                    +{xpGain} XP
                </div>
            )}
        </>
    ) : null;

    // Session HUD — real-time floating performance overlay
    const sessionHUD = (
        <SessionPulseHUD
            sessionResults={sessionResults}
            sessionAccuracy={sessionAccuracy}
            adaptiveMode={adaptiveSession.mode}
            focusScore={focusScore}
            sessionEtaMinutes={sessionMasteryEtaMinutes}
            visible={Boolean(selectedCategory) && !completed && lessons.length > 0}
        />
    );

    if (loading && !selectedCategory) {
        return (
            <>
                {badgeBanner}
                {sessionHUD}
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin h-10 w-10 border-4 border-tamil-500 border-t-transparent rounded-full" />
                </div>
            </>
        );
    }

    if (!selectedCategory) {
        return (
            <>
                {sessionHUD}

                {badgeBanner}
                <div className={`max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in ${learnShellClass}`}>
                    {/* ── Page-level tabs: Practice vs Letters ───────── */}
                    <div className="flex justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowLetterBoard(false)}
                            className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-200 border ${
                                !showLetterBoard
                                    ? 'border-ocean-400/60 bg-ocean-500/20 text-white shadow-lg shadow-ocean-900/20 scale-105'
                                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-gray-200 hover:border-ocean-400/30'
                            }`}
                        >
                            📚 Practice Lessons
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowLetterBoard(true)}
                            className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-200 border ${
                                showLetterBoard
                                    ? 'border-amber-400/60 bg-amber-500/20 text-amber-200 shadow-lg shadow-amber-900/20 scale-105'
                                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-gray-200 hover:border-amber-400/30'
                            }`}
                        >
                            🔤 Learn Letters
                        </button>
                    </div>

                    {showLetterBoard ? (
                        <TamilLetterBoard />
                    ) : (
                        <>
                            <div className="stagger-reveal text-center space-y-3" style={{ '--reveal-delay': '50ms' }}>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 transition-colors">📚 Choose a Category</h1>
                                <p className="adaptive-body text-gray-600 dark:text-gray-400 transition-colors">Select what you'd like to learn today</p>
                                <div className={`inline-block ${level === 'Beginner' ? 'level-beginner' : level === 'Intermediate' ? 'level-intermediate' : 'level-advanced'}`}>
                                    Your level: {level}
                                </div>
                            </div>

                            <div className="adaptive-panel stagger-reveal rounded-3xl border border-ocean-500/20 bg-white/85 p-5 shadow-xl shadow-ocean-900/5 dark:bg-gray-900/75" style={{ '--reveal-delay': '90ms' }}>
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ocean-300">Adaptive Session Primer</p>
                                        <h2 className="adaptive-heading mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">{adaptiveSession.coach.headline}</h2>
                                        <p className="adaptive-body mt-1 text-sm text-gray-600 dark:text-gray-400">{adaptiveSession.coach.summary}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/15 bg-ocean-500/10 px-4 py-3">
                                        <p className="text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Today&apos;s Target</p>
                                        <p className="mt-1 text-2xl font-bold text-ocean-200">{adaptiveSession.recommendedDifficulty}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{adaptiveModeMeta.label} mode</p>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {ADAPTIVE_MODE_OPTIONS.map((option) => {
                                        const isSelected = adaptiveModePreference === option.id;

                                        return (
                                            <button
                                                key={`primer-${option.id}`}
                                                type="button"
                                                onClick={() => setAdaptiveModePreference(option.id)}
                                                className={`rounded-2xl border px-4 py-2 text-left transition-all ${isSelected
                                                    ? 'border-ocean-300 bg-ocean-500/16 text-gray-900 dark:text-white'
                                                    : 'border-gray-300/80 bg-white/80 text-gray-700 hover:border-ocean-400/40 dark:border-white/10 dark:bg-white/5 dark:text-gray-300'
                                                }`}
                                            >
                                                <p className="text-sm font-semibold">{option.label}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="stagger-reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ '--reveal-delay': '130ms' }}>
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleCategorySelect(cat.id)}
                                        data-testid={`category-${cat.id}`}
                                        className="card-glow text-left hover:scale-[1.02] transition-transform duration-200 group"
                                    >
                                        <span className="text-3xl mb-3 block">{cat.icon}</span>
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 group-hover:text-tamil-600 dark:group-hover:text-tamil-400 transition-colors">
                                            {cat.label}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-500 mt-1 font-tamil transition-colors">{cat.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </>
        );
    }

    if (completed) {
        const correct = sessionResults.filter(result => result.isCorrect).length;
        const total = sessionResults.length;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        const timedOutCount = sessionResults.filter(result => result.timedOut).length;
        const completionGuidance = getConfidenceAwareCompletionCopy({
            percentage,
            confidenceBand: adaptiveSession.confidenceBand
        });
        const sessionTitle = sessionMode === 'review'
            ? 'Review Complete!'
            : sessionMode === 'stage'
                ? `Stage ${selectedStage || ''} Complete!`
                : 'Session Complete!';

        return (
            <>
                {badgeBanner}
                {sessionHUD}
                <div className={`max-w-2xl mx-auto px-4 py-12 text-center space-y-8 animate-fade-in ${learnShellClass}`}>
                    <div className="text-6xl mb-4">{percentage >= 70 ? '🎉' : percentage >= 40 ? '👍' : '💪'}</div>
                    <h1 className="adaptive-heading text-3xl font-bold text-gray-100">{sessionTitle}</h1>
                    <p className="adaptive-body text-gray-400 text-lg">
                        You answered <span className="text-emerald-400 font-bold">{correct}</span> out of{' '}
                        <span className="text-gray-200 font-bold">{total}</span> correctly ({percentage}%)
                    </p>
                    <p className="adaptive-body text-sm text-gray-300">{completionGuidance}</p>
                    {timedOutCount > 0 && (
                        <p className="text-sm text-amber-400">
                            Timed out on {timedOutCount} question{timedOutCount === 1 ? '' : 's'}.
                        </p>
                    )}
                    {latestUnlockedStage && (
                        <p className="text-sm text-emerald-300">
                            New stage unlocked: Stage {latestUnlockedStage}
                        </p>
                    )}
                    {certificate?.dataUrl && (
                        <div className="mx-auto max-w-xl rounded-2xl border border-amber-400/35 bg-amber-500/10 p-4 space-y-3">
                            <p className="text-amber-200 font-semibold">Tamil Fluency Certificate Ready</p>
                            <p className="text-sm text-amber-100/90">
                                Issued to {user?.name || 'Learner'} on {certificate.formattedDate}
                            </p>
                            <img
                                src={certificate.dataUrl}
                                alt="Tamil fluency certificate preview"
                                className="w-full rounded-lg border border-amber-300/30"
                            />
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = certificate.dataUrl;
                                    link.download = certificate.fileName;
                                    link.click();
                                }}
                            >
                                Download Certificate PNG
                            </button>
                        </div>
                    )}

                    <div className="card adaptive-panel inline-block">
                        <p className="text-gray-400 text-sm">Updated Skill Score</p>
                        <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-tamil-400 to-ocean-400 mt-1">
                            {user?.skill_score}
                        </p>
                        <p className={`text-sm mt-1 ${user?.level === 'Beginner' ? 'text-emerald-400' :
                            user?.level === 'Intermediate' ? 'text-amber-400' : 'text-rose-400'
                            }`}>
                            {user?.level}
                        </p>
                    </div>

                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => {
                                setSelectedCategory(null);
                                setSelectedStage(null);
                                setSessionMode('category');
                                setReviewQueueMeta({ total: 0, items: [] });
                                window.history.replaceState({}, '', '/learn');
                            }}
                            className="btn-secondary"
                        >
                            ← Choose Category
                        </button>
                        <button
                            onClick={() => {
                                if (sessionMode === 'review') {
                                    loadReviewQueue();
                                    return;
                                }
                                if (sessionMode === 'stage' && selectedStage) {
                                    loadStageLessons(selectedStage);
                                    return;
                                }
                                loadLessons(selectedCategory);
                            }}
                            className="btn-primary"
                        >
                            {sessionMode === 'review' ? 'Review Again' : '🔄 Practice Again'}
                        </button>
                    </div>
                </div>
            </>
        );
    }

    if (loading) {
        return (
            <>
                {badgeBanner}
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin h-10 w-10 border-4 border-tamil-500 border-t-transparent rounded-full" />
                </div>
            </>
        );
    }

    if (lessons.length === 0) {
        return (
            <>
                {badgeBanner}
                <div className={`max-w-2xl mx-auto px-4 py-12 text-center space-y-4 ${learnShellClass}`}>
                    <p className="adaptive-body text-gray-400 text-lg">
                        {sessionMode === 'review'
                            ? 'Your review queue is clear. Great job keeping up with weak lessons.'
                            : sessionMode === 'stage'
                                ? 'No lessons available for this stage yet.'
                                : 'No lessons available for this category yet.'}
                    </p>
                    <p className="adaptive-body text-sm text-gray-500">{emptyGuidance}</p>
                    <button
                        onClick={() => {
                            setSelectedCategory(null);
                            setSelectedStage(null);
                            setSessionMode('category');
                            setReviewQueueMeta({ total: 0, items: [] });
                            window.history.replaceState({}, '', '/learn');
                        }}
                        className="btn-secondary"
                    >
                        ← Back to Categories
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            {badgeBanner}
            <div className={`relative max-w-4xl mx-auto px-4 py-8 space-y-6 ${learnShellClass}`}>
                {immersiveMode && (
                    <>
                        <div className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full bg-sky-400/20 blur-3xl animate-pulse" />
                        <div
                            className="pointer-events-none absolute -bottom-24 -right-10 h-60 w-60 rounded-full bg-blue-500/20 blur-3xl animate-pulse"
                            style={{ animationDelay: '0.8s' }}
                        />
                    </>
                )}
                <div className="flex items-center justify-between mb-2">
                    <button
                        onClick={() => {
                            setSelectedCategory(null);
                            setSelectedStage(null);
                            setSessionMode('category');
                            setReviewQueueMeta({ total: 0, items: [] });
                            window.history.replaceState({}, '', '/learn');
                        }}
                        className="text-gray-500 hover:text-gray-300 text-sm"
                    >
                        ← Categories
                    </button>
                    <span className="text-sm text-gray-500">
                        Question {currentIndex + 1} of {lessons.length}
                    </span>
                </div>
                {sessionMode === 'review' && (
                    <div className="adaptive-panel stagger-reveal rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3" style={{ '--reveal-delay': '40ms' }}>
                        <p className="text-sm font-semibold text-amber-200">Review Queue</p>
                        <p className="text-sm text-amber-100/80">
                            Revisiting lessons that are currently due based on your spaced-repetition schedule.
                            {reviewQueueMeta.total > 0 ? ` ${reviewQueueMeta.total} lesson${reviewQueueMeta.total === 1 ? '' : 's'} queued.` : ''}
                        </p>
                    </div>
                )}
                {sessionMode === 'stage' && (
                    <div className="adaptive-panel stagger-reveal rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3" style={{ '--reveal-delay': '40ms' }}>
                        <p className="text-sm font-semibold text-sky-200">Stage Mode</p>
                        <p className="text-sm text-sky-100/80">
                            Learning Path Stage {selectedStage}. Complete lessons and mastery tests to unlock the next stage.
                        </p>
                    </div>
                )}

                <div
                    className={`adaptive-panel stagger-reveal rounded-3xl border px-5 py-5 ${adaptiveSession.mode === 'support'
                        ? 'border-emerald-400/25 bg-gradient-to-br from-emerald-500/14 via-transparent to-ocean-500/10'
                        : adaptiveSession.mode === 'challenge'
                            ? 'border-rose-400/25 bg-gradient-to-br from-rose-500/12 via-transparent to-amber-500/10'
                            : 'border-ocean-500/20 bg-gradient-to-br from-ocean-500/12 via-transparent to-tamil-500/10'
                    }`}
                    style={{ '--reveal-delay': '55ms' }}
                >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ocean-300">{adaptiveSession.coach.eyebrow}</p>
                            <h2 className="adaptive-heading mt-2 text-2xl font-bold text-gray-100">{adaptiveSession.coach.headline}</h2>
                            <p className="adaptive-body mt-2 text-sm text-gray-300/90">{adaptiveSession.coach.summary}</p>
                            <p className="adaptive-body mt-3 text-sm text-gray-400">{adaptiveSession.coach.microcopy}</p>
                        </div>

                        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm">
                            <p className="text-xs uppercase tracking-[0.14em] text-gray-400">Adaptive Target</p>
                            <p className="mt-1 text-2xl font-bold text-ocean-200">{adaptiveSession.recommendedDifficulty}</p>
                            <p className="text-sm text-gray-300">{adaptiveModeMeta.label} mode</p>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                        {ADAPTIVE_MODE_OPTIONS.map((option) => {
                            const isSelected = adaptiveModePreference === option.id;

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setAdaptiveModePreference(option.id)}
                                    className={`rounded-2xl border px-4 py-3 text-left transition-all ${isSelected
                                        ? 'border-ocean-300 bg-ocean-500/18 text-white shadow-[0_0_20px_rgba(14,165,233,0.22)]'
                                        : 'border-white/10 bg-white/5 text-gray-300 hover:border-ocean-400/35 hover:bg-white/10'
                                    }`}
                                >
                                    <p className="text-sm font-semibold">{option.label}</p>
                                    <p className="mt-1 text-xs text-gray-400">{option.description}</p>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-emerald-200">Support Load</p>
                            <p className="mt-1 text-2xl font-bold text-emerald-100">{adaptiveSession.supportIntensity}</p>
                        </div>
                        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-sky-200">Challenge Readiness</p>
                            <p className="mt-1 text-2xl font-bold text-sky-100">{adaptiveSession.challengeIntensity}</p>
                        </div>
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-amber-200">Pacing</p>
                            <p className="mt-1 text-xl font-bold text-amber-100">{adaptiveSession.coach.pacingLabel}</p>
                        </div>
                        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-violet-200">Layout</p>
                            <p className="mt-1 text-xl font-bold text-violet-100">{adaptiveSession.coach.densityLabel}</p>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {adaptiveSession.reasons.map((reason) => (
                            <span
                                key={reason}
                                className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-gray-300"
                            >
                                {reason}
                            </span>
                        ))}
                    </div>
                </div>

                <div
                    className={`adaptive-panel stagger-reveal relative overflow-hidden rounded-2xl border px-4 py-4 ${immersiveMode
                        ? 'border-sky-400/35 bg-gradient-to-r from-sky-500/20 via-blue-500/20 to-ocean-500/25 shadow-[0_0_35px_rgba(14,165,233,0.25)]'
                        : 'border-gray-700/40 bg-gray-900/55'
                    }`}
                    style={{ '--reveal-delay': '70ms' }}
                >
                    {immersiveMode && (
                        <div className="pointer-events-none absolute inset-x-[-25%] top-[-40%] h-24 rotate-6 bg-gradient-to-r from-transparent via-sky-100/35 to-transparent blur-2xl animate-pulse" />
                    )}
                    <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-sky-200 font-semibold">Study Experience Toggle</p>
                            <p className="mt-1 text-base font-semibold text-gray-100">Immersive Study Mode</p>
                            <p className="text-sm text-gray-300/85">Switch on cinematic focus visuals while you practice.</p>
                            {immersiveMode && (
                                <p className="mt-1 text-sm text-sky-100">{activeMantra}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-end gap-1 h-9">
                                {[16, 26, 20, 30, 24].map((height, idx) => (
                                    <span
                                        key={`beat-${idx}`}
                                        className={`w-1.5 rounded-full transition-colors duration-300 ${immersiveMode ? 'bg-gradient-to-t from-sky-500 to-blue-200 animate-pulse' : 'bg-gray-600'
                                            }`}
                                        style={{ height: `${height}px`, animationDelay: `${idx * 120}ms` }}
                                    />
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => setImmersiveMode((prev) => !prev)}
                                aria-label="Toggle immersive study mode"
                                aria-pressed={immersiveMode}
                                className={`relative inline-flex h-11 w-24 items-center rounded-full border transition-all duration-300 ${immersiveMode
                                    ? 'border-sky-200/70 bg-gradient-to-r from-sky-500 to-blue-500 shadow-[0_0_24px_rgba(14,165,233,0.55)]'
                                    : 'border-gray-600 bg-gray-800'
                                }`}
                            >
                                <span
                                    className="absolute h-8 w-8 rounded-full bg-white shadow-lg transition-transform duration-300"
                                    style={{ transform: immersiveMode ? 'translateX(52px)' : 'translateX(4px)' }}
                                />
                                <span className={`absolute left-3 text-[10px] font-semibold tracking-[0.14em] ${immersiveMode ? 'text-white/70' : 'text-gray-300'}`}>
                                    OFF
                                </span>
                                <span className={`absolute right-3 text-[10px] font-semibold tracking-[0.14em] ${immersiveMode ? 'text-white' : 'text-gray-400'}`}>
                                    ON
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className={`adaptive-panel stagger-reveal card-glow border ${immersiveMode
                        ? 'border-sky-400/35 bg-gradient-to-br from-sky-500/20 via-tamil-500/15 to-ocean-500/20 shadow-[0_0_30px_rgba(56,189,248,0.22)]'
                        : 'border-ocean-500/25 bg-gradient-to-br from-ocean-500/12 via-tamil-500/10 to-transparent'
                    }`}
                    style={{ '--reveal-delay': '110ms' }}
                >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.15em] font-semibold text-ocean-300">AI Study Copilot</p>
                            <p className="adaptive-heading mt-2 text-lg font-semibold text-gray-100">{topRecommendation?.title || adaptiveSession.coach.headline}</p>
                            <p className="adaptive-body mt-1 text-sm text-gray-400">{topRecommendation?.summary || adaptiveSession.coach.summary}</p>
                        </div>
                        <div className="rounded-xl border border-white/15 bg-white/45 px-4 py-3 text-right dark:bg-gray-900/30">
                            <p className="text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Mastery ETA</p>
                            <p className="text-2xl font-bold text-ocean-200">~{sessionMasteryEtaMinutes}m</p>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-emerald-200">Focus Score</p>
                            <p className="text-2xl font-bold text-emerald-100">{focusScore}/100</p>
                        </div>
                        <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-sky-200">Fluency Trajectory</p>
                            <p className="text-2xl font-bold text-sky-100">{fluencyTrajectory}</p>
                        </div>
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-amber-200">Session Pulse</p>
                            <p className="text-2xl font-bold text-amber-100">{Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s</p>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                        {learnCopilotRecommendations.slice(0, 3).map((recommendation) => (
                            <div
                                key={recommendation.id}
                                className="rounded-2xl border border-white/10 bg-white/6 p-4"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-gray-100">{recommendation.title}</p>
                                    <span className="rounded-full bg-ocean-500/15 px-2 py-1 text-xs font-semibold text-ocean-200">
                                        {recommendation.confidenceScore}%
                                    </span>
                                </div>
                                <p className="mt-2 text-sm text-gray-400">{recommendation.summary}</p>
                                {recommendation.reasons?.[0] && (
                                    <p className="mt-3 text-xs uppercase tracking-[0.12em] text-gray-500">
                                        {recommendation.reasons[0]}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-tamil-500 to-ocean-500 rounded-full transition-all duration-500"
                        style={{ width: `${((currentIndex + 1) / lessons.length) * 100}%` }}
                    />
                </div>

                <ConfidenceAura sessionResults={sessionResults}>
                    <AdaptiveLesson
                        key={currentIndex}
                        lesson={lessons[currentIndex]}
                        level={level}
                        userName={user?.name || 'Learner'}
                        adaptiveUi={adaptiveSession}
                        onSubmit={handleSubmit}
                        onAnswerChange={handleAnswerChange}
                        onHintUsed={handleHintUsed}
                        onError={handleError}
                        onRetry={handleRetry}
                        onActivity={handleActivity}
                        isSubmitting={submitting}
                        timeLeft={isAdvanced ? timerSeconds : undefined}
                        studyMode={immersiveMode ? 'immersive' : 'classic'}
                    />
                </ConfidenceAura>
            </div>
        </>
    );
}
