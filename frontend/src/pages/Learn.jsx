import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { lessonAPI, attemptAPI } from '../services/api';
import { useInteractionTracker } from '../hooks/useInteractionTracker';
import AdaptiveLesson from '../components/AdaptiveLesson';

const CATEGORIES = [
    { id: 'uyir', label: 'Uyir Ezhuthukkal', icon: '🔤', desc: 'Tamil Vowels (உயிர் எழுத்துக்கள்)' },
    { id: 'mei', label: 'Mei Ezhuthukkal', icon: '🔡', desc: 'Tamil Consonants (மெய் எழுத்துக்கள்)' },
    { id: 'uyir-mei', label: 'Uyir-Mei', icon: '✏️', desc: 'Combined Letters (உயிர்மெய் எழுத்துக்கள்)' },
    { id: 'grammar', label: 'Grammar', icon: '📖', desc: 'Basic Grammar (இலக்கணம்)' },
    { id: 'sentences', label: 'Sentences', icon: '💬', desc: 'Sentence Formation (வாக்கிய அமைப்பு)' },
];

const getCurrentMode = () => {
    const search = new window.URLSearchParams(window.location.search);
    return search.get('mode') === 'review' ? 'review' : 'category';
};

export default function Learn() {
    const { user, updateUser } = useAuth();
    const [lessons, setLessons] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [sessionMode, setSessionMode] = useState(getCurrentMode());
    const [loading, setLoading] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [sessionResults, setSessionResults] = useState([]);
    const [timerSeconds, setTimerSeconds] = useState(60);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [newBadges, setNewBadges] = useState([]);
    const [reviewQueueMeta, setReviewQueueMeta] = useState({ total: 0, items: [] });
    const badgeTimerRef = useRef(null);
    const tracker = useInteractionTracker();

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

    const resetSessionState = useCallback(() => {
        setCurrentIndex(0);
        setCompleted(false);
        setSessionResults([]);
        setCurrentAnswer('');
        setSubmitting(false);
        clearBadges();
    }, []);

    // Load lessons for selected category
    const loadLessons = useCallback(async (category) => {
        setLoading(true);
        try {
            const res = await lessonAPI.getAll({ category, difficulty: level });
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
                tracker.startTracking();
                if (isAdvanced) setTimerSeconds(60);
            }
        } catch (err) {
            console.error('Failed to load lessons:', err);
        } finally {
            setLoading(false);
        }
    }, [level, isAdvanced, tracker, resetSessionState]);

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
                tracker.startTracking();
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
    }, [isAdvanced, tracker, resetSessionState]);

    const handleCategorySelect = (category) => {
        setSessionMode('category');
        setSelectedCategory(category);
        setCurrentAnswer('');
        loadLessons(category);
    };

    const handleSubmit = useCallback(async (submission = {}) => {
        if (submitting) return;

        const metrics = tracker.completeTracking();
        const lesson = lessons[currentIndex];
        if (!lesson) return;

        const answer = (submission.answer ?? currentAnswer ?? '').trim();
        const isCorrect = typeof submission.isCorrect === 'boolean'
            ? submission.isCorrect
            : isAnswerCorrect(lesson, answer);

        setSubmitting(true);

        try {
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
            });
            showBadges(skillUpdate.new_badges);

            setSessionResults(prev => [...prev, { lesson, isCorrect, metrics, answer, timedOut: !!submission.timedOut }]);

            setTimeout(() => {
                if (currentIndex < lessons.length - 1) {
                    setCurrentIndex(prev => prev + 1);
                    setCurrentAnswer('');
                    tracker.startTracking();
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
    }, [submitting, tracker, lessons, currentIndex, currentAnswer, updateUser, isAdvanced]);

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
        if (getCurrentMode() === 'review') {
            loadReviewQueue();
        }
    }, [loadReviewQueue]);

    useEffect(() => {
        return () => {
            if (badgeTimerRef.current) {
                clearTimeout(badgeTimerRef.current);
            }
        };
    }, []);

    const badgeBanner = newBadges.length > 0 ? (
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
    ) : null;

    if (loading && !selectedCategory) {
        return (
            <>
                {badgeBanner}
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin h-10 w-10 border-4 border-tamil-500 border-t-transparent rounded-full" />
                </div>
            </>
        );
    }

    if (!selectedCategory) {
        return (
            <>
                {badgeBanner}
                <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
                    <div className="text-center space-y-3">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 transition-colors">📚 Choose a Category</h1>
                        <p className="text-gray-600 dark:text-gray-400 transition-colors">Select what you'd like to learn today</p>
                        <div className={`inline-block ${level === 'Beginner' ? 'level-beginner' : level === 'Intermediate' ? 'level-intermediate' : 'level-advanced'}`}>
                            Your level: {level}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                </div>
            </>
        );
    }

    if (completed) {
        const correct = sessionResults.filter(result => result.isCorrect).length;
        const total = sessionResults.length;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        const timedOutCount = sessionResults.filter(result => result.timedOut).length;
        const sessionTitle = sessionMode === 'review' ? 'Review Complete!' : 'Session Complete!';

        return (
            <>
                {badgeBanner}
                <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-8 animate-fade-in">
                    <div className="text-6xl mb-4">{percentage >= 70 ? '🎉' : percentage >= 40 ? '👍' : '💪'}</div>
                    <h1 className="text-3xl font-bold text-gray-100">{sessionTitle}</h1>
                    <p className="text-gray-400 text-lg">
                        You answered <span className="text-emerald-400 font-bold">{correct}</span> out of{' '}
                        <span className="text-gray-200 font-bold">{total}</span> correctly ({percentage}%)
                    </p>
                    {timedOutCount > 0 && (
                        <p className="text-sm text-amber-400">
                            Timed out on {timedOutCount} question{timedOutCount === 1 ? '' : 's'}.
                        </p>
                    )}

                    <div className="card inline-block">
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
                <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4">
                    <p className="text-gray-400 text-lg">
                        {sessionMode === 'review'
                            ? 'Your review queue is clear. Great job keeping up with weak lessons.'
                            : 'No lessons available for this category yet.'}
                    </p>
                    <button
                        onClick={() => {
                            setSelectedCategory(null);
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
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <button
                        onClick={() => {
                            setSelectedCategory(null);
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
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                        <p className="text-sm font-semibold text-amber-200">Review Queue</p>
                        <p className="text-sm text-amber-100/80">
                            Revisiting lessons that are currently due based on your spaced-repetition schedule.
                            {reviewQueueMeta.total > 0 ? ` ${reviewQueueMeta.total} lesson${reviewQueueMeta.total === 1 ? '' : 's'} queued.` : ''}
                        </p>
                    </div>
                )}
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-tamil-500 to-ocean-500 rounded-full transition-all duration-500"
                        style={{ width: `${((currentIndex + 1) / lessons.length) * 100}%` }}
                    />
                </div>

                <AdaptiveLesson
                    key={currentIndex}
                    lesson={lessons[currentIndex]}
                    level={level}
                    onSubmit={handleSubmit}
                    onAnswerChange={setCurrentAnswer}
                    onHintUsed={tracker.recordHint}
                    onError={tracker.recordError}
                    onRetry={tracker.recordRetry}
                    onActivity={tracker.recordActivity}
                    isSubmitting={submitting}
                    timeLeft={isAdvanced ? timerSeconds : undefined}
                />
            </div>
        </>
    );
}
