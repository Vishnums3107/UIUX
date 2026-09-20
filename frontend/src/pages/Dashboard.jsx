import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attemptAPI, authAPI, lessonAPI } from '../services/api';
import { Link } from 'react-router-dom';
import SkillMeter from '../components/SkillMeter';
import SkillRadar from '../components/SkillRadar';
import FluencyTimeline from '../components/FluencyTimeline';
import { getAvatar, AVATARS } from '../utils/avatars';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement, BarElement,
    Title, Tooltip, Legend, Filler, ArcElement,
    RadialLinearScale
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { buildDashboardCopilotRecommendations } from '../utils/copilotEngine';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement, RadialLinearScale);

const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { labels: { color: '#9ca3af', font: { size: 11 } } },
        tooltip: { backgroundColor: '#1f2937', borderColor: '#374151', borderWidth: 1, titleColor: '#f3f4f6', bodyColor: '#d1d5db' }
    },
    scales: {
        x: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(75,85,99,0.2)' } },
        y: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(75,85,99,0.2)' } }
    }
};

function formatReviewReason(reason) {
    switch (reason) {
    case 'last_attempt_incorrect':
        return 'Last attempt was incorrect';
    case 'hint_heavy_lesson':
        return 'Needs less hint support';
    case 'error_prone_lesson':
        return 'Still error-prone';
    default:
        return 'Scheduled review is due';
    }
}

function formatDueLabel(dueAt) {
    if (!dueAt) return 'No review scheduled';

    const dueDate = new Date(dueAt);
    const diffMs = dueDate.getTime() - Date.now();
    const diffHours = Math.round(Math.abs(diffMs) / (1000 * 60 * 60));

    if (diffHours < 1) {
        return diffMs <= 0 ? 'Due now' : 'Due within the hour';
    }

    if (diffMs <= 0) {
        return `${diffHours}h overdue`;
    }

    if (diffHours < 24) {
        return `Due in ${diffHours}h`;
    }

    const diffDays = Math.round(diffHours / 24);
    return `Due in ${diffDays}d`;
}

const REVIEW_BUCKETS = [
    { key: 'dueNow', label: 'Due Now', empty: 'Nothing is due right now.' },
    { key: 'laterToday', label: 'Later Today', empty: 'No more reviews later today.' },
    { key: 'tomorrow', label: 'Tomorrow', empty: 'Nothing scheduled for tomorrow yet.' }
];

const STAGE_LABELS = [
    { stage: 1, en: 'Uyir Eluthukal', ta: 'உயிர் எழுத்துகள்' },
    { stage: 2, en: 'Mei Eluthukal', ta: 'மெய் எழுத்துகள்' },
    { stage: 3, en: 'Uyir-Mei Grid', ta: 'உயிர்மெய்' },
    { stage: 4, en: 'Numbers & Time', ta: 'எண்கள் & நேரம்' },
    { stage: 5, en: 'Core Vocabulary', ta: 'சொற்தொகுப்பு' },
    { stage: 6, en: 'Sentence Basics', ta: 'வாக்கிய அடிப்படை' },
    { stage: 7, en: 'Dialogues', ta: 'உரையாடல்' },
    { stage: 8, en: 'Reading', ta: 'படிப்பு' },
    { stage: 9, en: 'Writing', ta: 'எழுத்து பயிற்சி' },
    { stage: 10, en: 'Fluency Tests', ta: 'தேர்ச்சி தேர்வு' }
];

const CATEGORY_LABELS = {
    uyir: 'Uyir',
    mei: 'Mei',
    'uyir-mei': 'Uyir-Mei',
    grammar: 'Grammar',
    sentences: 'Sentences'
};

const ADAPTIVE_MODE_LABELS = {
    auto: 'Auto',
    support: 'Support',
    balanced: 'Flow',
    challenge: 'Challenge'
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function Dashboard() {
    const { user, refreshProfile, updateUser } = useAuth();
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [reviewQueue, setReviewQueue] = useState({
        total: 0,
        items: [],
        weeklyTimeline: [],
        completionStats: {
            clearedToday: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastClearedAt: null
        },
        reviewBuckets: {
            dueNow: { count: 0, items: [] },
            laterToday: { count: 0, items: [] },
            tomorrow: { count: 0, items: [] }
        }
    });
    const [stageProgress, setStageProgress] = useState([]);
    const [adaptiveInsights, setAdaptiveInsights] = useState({
        adaptivePreferences: null,
        adaptiveProfile: null,
        categoryRecommendations: [],
        generatedAt: null,
        attemptWindowSize: 0
    });
    const [topicIntelligence, setTopicIntelligence] = useState({
        activeStage: 1,
        pendingMasteryStages: [],
        categoryMasteryMap: [],
        stageCategoryRecommendations: [],
        sequencingPlan: [],
        generatedAt: null,
        attemptWindowSize: 0
    });
    const [learningDirector, setLearningDirector] = useState({
        activeStage: 1,
        stageConfidenceBands: [],
        nextBestSessions: [],
        recoveryPlan: {
            required: false,
            triggerReason: null,
            focusAreas: [],
            plan: [],
            signalSummary: {
                windowSize: 0,
                incorrectCount: 0,
                hintHeavyCount: 0,
                retryHeavyCount: 0,
                highFrictionCount: 0
            },
            targetOutcomes: {
                accuracyTarget: 0,
                maxAvgHints: 0,
                maxAvgRetries: 0
            },
            horizonDays: 0
        },
        workloadPlan: {
            recommendedSessionsPerDay: 1,
            sessionMinutesRange: { min: 10, max: 18 },
            restDaySuggested: false,
            streakWeight: 0,
            reason: null
        },
        masteryForecast: {
            stage: 1,
            confidenceBand: 'developing',
            readinessPercent: 0,
            masteryLikelyInDays: 0,
            isReadyForMasteryTest: false,
            blockingFactors: [],
            greenFlags: []
        },
        learningArc: {
            arcName: null,
            currentPhase: null,
            nextMilestone: null,
            milestones: [],
            fluencyOutcome: null,
            narrative: null
        },
        generatedAt: null,
        attemptWindowSize: 0
    });
    const [loading, setLoading] = useState(true);

    // Profile Edit State
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAvatarId, setEditAvatarId] = useState('');
    const [editAdaptiveModePreference, setEditAdaptiveModePreference] = useState('auto');
    const [editImmersiveModeDefault, setEditImmersiveModeDefault] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    const handleSaveProfile = async () => {
        if (!editName.trim()) return;
        setSavingProfile(true);
        try {
            const res = await authAPI.updateProfile({
                name: editName,
                avatarId: editAvatarId,
                adaptivePreferences: {
                    modePreference: editAdaptiveModePreference,
                    immersiveModeDefault: editImmersiveModeDefault
                }
            });
            updateUser(res.data);
            setIsEditProfileOpen(false);
        } catch (err) {
            console.error('Failed to update profile', err);
        } finally {
            setSavingProfile(false);
        }
    };

    const openEditProfile = () => {
        setEditName(user?.name || '');
        setEditAvatarId(user?.avatarId || 'avatar-1');
        setEditAdaptiveModePreference(user?.adaptivePreferences?.modePreference || 'auto');
        setEditImmersiveModeDefault(Boolean(user?.adaptivePreferences?.immersiveModeDefault));
        setIsEditProfileOpen(true);
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statsRes, histRes, reviewRes, stageRes, adaptiveRes, topicRes, directorRes] = await Promise.allSettled([
                attemptAPI.getStats(),
                attemptAPI.getHistory({ limit: 50 }),
                attemptAPI.getReviewQueue({ limit: 5 }),
                lessonAPI.getStageProgress(),
                authAPI.getAdaptiveProfileInsights(),
                authAPI.getTopicIntelligence(),
                authAPI.getLearningDirectorInsights()
            ]);

            if (statsRes.status === 'fulfilled') {
                setStats(statsRes.value.data);
            } else {
                throw statsRes.reason;
            }

            if (histRes.status === 'fulfilled') {
                setHistory(histRes.value.data.attempts);
            } else {
                throw histRes.reason;
            }

            if (reviewRes.status === 'fulfilled') {
                setReviewQueue(reviewRes.value.data);
            } else {
                setReviewQueue({
                    total: 0,
                    items: [],
                    weeklyTimeline: [],
                    completionStats: {
                        clearedToday: 0,
                        currentStreak: 0,
                        longestStreak: 0,
                        lastClearedAt: null
                    },
                    reviewBuckets: {
                        dueNow: { count: 0, items: [] },
                        laterToday: { count: 0, items: [] },
                        tomorrow: { count: 0, items: [] }
                    }
                });
            }

            if (stageRes.status === 'fulfilled') {
                setStageProgress(stageRes.value.data || []);
            } else {
                setStageProgress([]);
            }

            if (adaptiveRes.status === 'fulfilled') {
                const insights = adaptiveRes.value.data || {};
                setAdaptiveInsights({
                    adaptivePreferences: insights.adaptivePreferences || null,
                    adaptiveProfile: insights.adaptiveProfile || null,
                    categoryRecommendations: insights.categoryRecommendations || [],
                    generatedAt: insights.generatedAt || null,
                    attemptWindowSize: insights.attemptWindowSize || 0
                });

                if (insights.adaptivePreferences || insights.adaptiveProfile) {
                    updateUser({
                        adaptivePreferences: insights.adaptivePreferences,
                        adaptiveProfile: insights.adaptiveProfile
                    });
                }
            } else {
                setAdaptiveInsights({
                    adaptivePreferences: null,
                    adaptiveProfile: null,
                    categoryRecommendations: [],
                    generatedAt: null,
                    attemptWindowSize: 0
                });
            }

            if (topicRes.status === 'fulfilled') {
                const intelligence = topicRes.value.data || {};
                setTopicIntelligence({
                    activeStage: intelligence.activeStage || 1,
                    pendingMasteryStages: intelligence.pendingMasteryStages || [],
                    categoryMasteryMap: intelligence.categoryMasteryMap || [],
                    stageCategoryRecommendations: intelligence.stageCategoryRecommendations || [],
                    sequencingPlan: intelligence.sequencingPlan || [],
                    generatedAt: intelligence.generatedAt || null,
                    attemptWindowSize: intelligence.attemptWindowSize || 0
                });
            } else {
                setTopicIntelligence({
                    activeStage: 1,
                    pendingMasteryStages: [],
                    categoryMasteryMap: [],
                    stageCategoryRecommendations: [],
                    sequencingPlan: [],
                    generatedAt: null,
                    attemptWindowSize: 0
                });
            }

            if (directorRes.status === 'fulfilled') {
                const director = directorRes.value.data || {};
                setLearningDirector({
                    activeStage: director.activeStage || 1,
                    stageConfidenceBands: director.stageConfidenceBands || [],
                    nextBestSessions: director.nextBestSessions || [],
                    recoveryPlan: director.recoveryPlan || {
                        required: false,
                        triggerReason: null,
                        focusAreas: [],
                        plan: [],
                        signalSummary: {
                            windowSize: 0,
                            incorrectCount: 0,
                            hintHeavyCount: 0,
                            retryHeavyCount: 0,
                            highFrictionCount: 0
                        },
                        targetOutcomes: {
                            accuracyTarget: 0,
                            maxAvgHints: 0,
                            maxAvgRetries: 0
                        },
                        horizonDays: 0
                    },
                    workloadPlan: director.workloadPlan || {
                        recommendedSessionsPerDay: 1,
                        sessionMinutesRange: { min: 10, max: 18 },
                        restDaySuggested: false,
                        streakWeight: 0,
                        reason: null
                    },
                    masteryForecast: director.masteryForecast || {
                        stage: director.activeStage || 1,
                        confidenceBand: 'developing',
                        readinessPercent: 0,
                        masteryLikelyInDays: 0,
                        isReadyForMasteryTest: false,
                        blockingFactors: [],
                        greenFlags: []
                    },
                    learningArc: director.learningArc || {
                        arcName: null,
                        currentPhase: null,
                        nextMilestone: null,
                        milestones: [],
                        fluencyOutcome: null,
                        narrative: null
                    },
                    generatedAt: director.generatedAt || null,
                    attemptWindowSize: director.attemptWindowSize || 0
                });
            } else {
                setLearningDirector({
                    activeStage: 1,
                    stageConfidenceBands: [],
                    nextBestSessions: [],
                    recoveryPlan: {
                        required: false,
                        triggerReason: null,
                        focusAreas: [],
                        plan: [],
                        signalSummary: {
                            windowSize: 0,
                            incorrectCount: 0,
                            hintHeavyCount: 0,
                            retryHeavyCount: 0,
                            highFrictionCount: 0
                        },
                        targetOutcomes: {
                            accuracyTarget: 0,
                            maxAvgHints: 0,
                            maxAvgRetries: 0
                        },
                        horizonDays: 0
                    },
                    workloadPlan: {
                        recommendedSessionsPerDay: 1,
                        sessionMinutesRange: { min: 10, max: 18 },
                        restDaySuggested: false,
                        streakWeight: 0,
                        reason: null
                    },
                    masteryForecast: {
                        stage: 1,
                        confidenceBand: 'developing',
                        readinessPercent: 0,
                        masteryLikelyInDays: 0,
                        isReadyForMasteryTest: false,
                        blockingFactors: [],
                        greenFlags: []
                    },
                    learningArc: {
                        arcName: null,
                        currentPhase: null,
                        nextMilestone: null,
                        milestones: [],
                        fluencyOutcome: null,
                        narrative: null
                    },
                    generatedAt: null,
                    attemptWindowSize: 0
                });
            }

            refreshProfile();
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin h-10 w-10 border-4 border-tamil-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    // Chart data: Performance trend
    const trendData = {
        labels: stats?.recentTrend?.map(d => d._id.slice(5)) || [],
        datasets: [
            {
                label: 'Success Rate',
                data: stats?.recentTrend?.map(d => Math.round(d.avgScore * 100)) || [],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37,99,235,0.12)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2563eb',
            }
        ]
    };

    // Chart data: Error trend
    const errorData = {
        labels: stats?.recentTrend?.map(d => d._id.slice(5)) || [],
        datasets: [
            {
                label: 'Avg Errors',
                data: stats?.recentTrend?.map(d => d.avgErrors?.toFixed(1)) || [],
                backgroundColor: 'rgba(239,68,68,0.6)',
                borderRadius: 6,
            }
        ]
    };

    // Chart data: Attempts per day
    const activityData = {
        labels: stats?.recentTrend?.map(d => d._id.slice(5)) || [],
        datasets: [
            {
                label: 'Questions Attempted',
                data: stats?.recentTrend?.map(d => d.count) || [],
                backgroundColor: 'rgba(14,165,233,0.6)',
                borderRadius: 6,
            }
        ]
    };

    const summary = stats?.summary || {};
    const maxTimelineDue = Math.max(...(reviewQueue.weeklyTimeline || []).map((day) => day.dueCount), 1);
    const stageRows = STAGE_LABELS.map((label) => {
        const progress = stageProgress.find((entry) => entry.stage === label.stage) || {};
        const total = progress.totalLessons || 0;
        const completed = progress.completedLessons || 0;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
            ...label,
            ...progress,
            percent
        };
    });
    const activeStage = stageRows.find((row) => row.unlocked && !row.masteryPassed)?.stage || 1;
    const continuePath = activeStage ? `/learn?stage=${activeStage}` : '/learn';

    const recentAttempts = history.slice(0, 20);
    const recentCorrect = recentAttempts.filter((attempt) => attempt.score === 1).length;
    const recentAccuracy = recentAttempts.length > 0 ? Math.round((recentCorrect / recentAttempts.length) * 100) : Math.round((summary.avgScore || 0) * 100);

    const categoryStats = recentAttempts.reduce((acc, attempt) => {
        const category = attempt.lesson_id?.category || 'other';
        if (!acc[category]) {
            acc[category] = { category, total: 0, incorrect: 0 };
        }
        acc[category].total += 1;
        if (attempt.score !== 1) {
            acc[category].incorrect += 1;
        }
        return acc;
    }, {});

    const weakCategoryInsights = Object.values(categoryStats)
        .map((item) => ({
            ...item,
            failRate: item.total > 0 ? Math.round((item.incorrect / item.total) * 100) : 0
        }))
        .filter((item) => item.incorrect > 0)
        .sort((a, b) => b.failRate - a.failRate)
        .slice(0, 2);

    const trajectoryDelta = (stats?.recentTrend?.length || 0) >= 2
        ? (stats.recentTrend[stats.recentTrend.length - 1].avgScore - stats.recentTrend[0].avgScore)
        : 0;
    const trajectoryWeekly = Math.round(trajectoryDelta * 100);

    const focusScore = clamp(
        100 - ((summary.avgErrors || 0) * 12) - ((summary.avgHints || 0) * 8) + Math.min((user?.current_streak || 0) * 2, 12),
        30,
        99
    );

    const remainingMasteryStages = stageRows.filter((row) => !row.masteryPassed).length;
    const masteryEtaDays = Math.max(3, (remainingMasteryStages * 4) + Math.ceil((reviewQueue.total || 0) / 3));

    const categoryInsightsForCopilot = weakCategoryInsights.map((item) => ({
        ...item,
        label: CATEGORY_LABELS[item.category] || item.category
    }));

    const copilotRecommendations = buildDashboardCopilotRecommendations({
        reviewQueueTotal: reviewQueue.total || 0,
        weakCategoryInsights: categoryInsightsForCopilot,
        activeStage,
        continuePath,
        focusScore,
        trajectoryWeekly,
        remainingMasteryStages,
        masteryEtaDays,
        recentAccuracy,
        streak: user?.current_streak || 0
    });
    const topRecommendation = copilotRecommendations[0];
    const adaptivePreferences = adaptiveInsights.adaptivePreferences || user?.adaptivePreferences || {
        modePreference: 'auto',
        immersiveModeDefault: false
    };
    const adaptiveProfile = adaptiveInsights.adaptiveProfile || user?.adaptiveProfile || {
        recommendedMode: 'balanced',
        recommendedDifficulty: user?.level || 'Intermediate',
        supportNeed: 36,
        challengeReadiness: 44,
        stabilityScore: 55,
        confidenceScore: 0,
        lastUpdatedAt: null
    };
    const categoryRecommendations = adaptiveInsights.categoryRecommendations || [];
    const categoryRecommendationWindow = adaptiveInsights.attemptWindowSize > 0
        ? `Signals from the last ${adaptiveInsights.attemptWindowSize} attempts`
        : 'Signals will appear after a few completed attempts';
    const adaptiveUpdatedLabel = adaptiveProfile.lastUpdatedAt
        ? new Date(adaptiveProfile.lastUpdatedAt).toLocaleDateString()
        : 'Awaiting more practice';
    const topicMasteryMap = topicIntelligence.categoryMasteryMap || [];
    const stageCategoryRecommendations = topicIntelligence.stageCategoryRecommendations || [];
    const sequencingPlan = topicIntelligence.sequencingPlan || [];
    const topicWindowLabel = topicIntelligence.attemptWindowSize > 0
        ? `Signals from the last ${topicIntelligence.attemptWindowSize} attempts`
        : 'Complete more attempts to unlock topic intelligence signals';
    const topicGeneratedLabel = topicIntelligence.generatedAt
        ? new Date(topicIntelligence.generatedAt).toLocaleString()
        : null;
    const stageConfidenceBands = learningDirector.stageConfidenceBands || [];
    const nextBestSessions = learningDirector.nextBestSessions || [];
    const recoveryPlan = learningDirector.recoveryPlan || {
        required: false,
        triggerReason: null,
        focusAreas: [],
        plan: [],
        signalSummary: { windowSize: 0, incorrectCount: 0, hintHeavyCount: 0, retryHeavyCount: 0, highFrictionCount: 0 },
        targetOutcomes: { accuracyTarget: 0, maxAvgHints: 0, maxAvgRetries: 0 },
        horizonDays: 0
    };
    const workloadPlan = learningDirector.workloadPlan || {
        recommendedSessionsPerDay: 1,
        sessionMinutesRange: { min: 10, max: 18 },
        restDaySuggested: false,
        streakWeight: 0,
        reason: null
    };
    const masteryForecast = learningDirector.masteryForecast || {
        stage: activeStage,
        confidenceBand: 'developing',
        readinessPercent: 0,
        masteryLikelyInDays: 0,
        isReadyForMasteryTest: false,
        blockingFactors: [],
        greenFlags: []
    };
    const learningArcSummary = learningDirector.learningArc || {
        arcName: null,
        currentPhase: null,
        nextMilestone: null,
        milestones: [],
        fluencyOutcome: null,
        narrative: null
    };
    const directorGeneratedLabel = learningDirector.generatedAt
        ? new Date(learningDirector.generatedAt).toLocaleString()
        : null;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="stagger-reveal flex flex-col md:flex-row items-start md:items-center justify-between gap-4" style={{ '--reveal-delay': '40ms' }}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={openEditProfile}
                        className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-md border-2 border-transparent hover:border-tamil-500 transition-all ${getAvatar(user?.avatarId).bg}`}
                        title="Edit Profile"
                    >
                        {getAvatar(user?.avatarId).icon}
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 transition-colors flex items-center gap-2">
                            வணக்கம், {user?.name}! 👋
                        </h1>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-gray-600 dark:text-gray-400 transition-colors">Here's your learning progress</p>
                            <div className="flex items-center gap-1 bg-sky-500/10 text-sky-300 px-3 py-1 rounded-full text-sm font-bold border border-sky-500/20 shadow-[0_0_10px_rgba(14,165,233,0.2)] animate-pulse-slow">
                                🔥 {user?.current_streak || 0} Day Streak
                            </div>
                        </div>
                    </div>
                </div>
                <Link to={continuePath} className="btn-primary">
                    📚 Continue Learning
                </Link>
            </div>

            {/* Top stats row */}
            <div className="stagger-reveal grid grid-cols-1 md:grid-cols-4 gap-6" style={{ '--reveal-delay': '120ms' }}>
                {/* Skill meter */}
                <div className="card-glow flex justify-center md:col-span-1">
                    <SkillMeter score={user?.skill_score || 0} />
                </div>

                {/* Skill Radar — per-category mastery */}
                <div className="card-glow md:col-span-1 flex flex-col justify-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400 mb-2">Skill Radar</p>
                    <SkillRadar attempts={history} userLevel={user?.level || 'Intermediate'} />
                </div>

                {/* Stat cards */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <StatCard
                        icon="📝"
                        label="Lessons Completed"
                        value={user?.lessons_completed || 0}
                        color="text-ocean-400"
                    />
                    <StatCard
                        icon="🎯"
                        label="Accuracy"
                        value={`${Math.round((summary.avgScore || 0) * 100)}%`}
                        color="text-emerald-400"
                    />
                    <StatCard
                        icon="⏱️"
                        label="Avg Time"
                        value={`${Math.round(summary.avgTime || 0)}s`}
                        color="text-amber-400"
                    />
                    <StatCard
                        icon="❌"
                        label="Avg Errors"
                        value={(summary.avgErrors || 0).toFixed(1)}
                        color="text-red-400"
                    />
                    <StatCard
                        icon="💡"
                        label="Avg Hints"
                        value={(summary.avgHints || 0).toFixed(1)}
                        color="text-purple-400"
                    />
                    <StatCard
                        icon="✅"
                        label="Total Correct"
                        value={summary.totalCorrect || 0}
                        color="text-emerald-400"
                    />
                </div>
            </div>

            <div className="stagger-reveal grid grid-cols-1 md:grid-cols-3 gap-4" style={{ '--reveal-delay': '200ms' }}>
                <UxMetricCard
                    label="Session Focus Score"
                    value={`${focusScore}/100`}
                    subtitle={focusScore >= 75 ? 'High concentration band' : 'Attention recovery recommended'}
                    tone={focusScore >= 75 ? 'emerald' : 'amber'}
                />
                <UxMetricCard
                    label="Fluency Trajectory"
                    value={`${trajectoryWeekly >= 0 ? '+' : ''}${trajectoryWeekly}%`}
                    subtitle={trajectoryWeekly >= 0 ? 'Improving across recent attempts' : 'Needs correction loop'}
                    tone={trajectoryWeekly >= 0 ? 'sky' : 'rose'}
                />
                <UxMetricCard
                    label="Mastery ETA"
                    value={`~${masteryEtaDays}d`}
                    subtitle={`${remainingMasteryStages} stages still require mastery`}
                    tone="violet"
                />
            </div>

            {/* Fluency Timeline — cinematic stage journey track */}
            <div className="stagger-reveal card-glow border border-indigo-500/15 bg-gradient-to-br from-indigo-500/8 via-transparent to-sky-500/6 p-5" style={{ '--reveal-delay': '210ms' }}>
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">Your Tamil Journey</p>
                        <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">10-Stage Fluency Path</h2>
                    </div>
                    <Link to={continuePath} className="text-xs font-semibold text-ocean-300 hover:text-ocean-200 transition-colors">
                        Continue →
                    </Link>
                </div>
                <FluencyTimeline stageProgress={stageProgress} activeStage={activeStage} />
            </div>

            <div className="stagger-reveal rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/12 via-transparent to-ocean-500/12 p-5" style={{ '--reveal-delay': '240ms' }}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Adaptive Profile</p>
                        <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Persistent learning posture</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            This profile survives across sessions and helps the interface decide how much support or challenge to introduce.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/55 px-4 py-3 text-right dark:bg-gray-900/30">
                        <p className="text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Saved Preference</p>
                        <p className="mt-1 text-xl font-bold text-sky-200">{ADAPTIVE_MODE_LABELS[adaptivePreferences.modePreference] || 'Auto'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {adaptivePreferences.immersiveModeDefault ? 'Immersive default on' : 'Immersive default off'}
                        </p>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
                    <UxMetricCard
                        label="Recommended Mode"
                        value={ADAPTIVE_MODE_LABELS[adaptiveProfile.recommendedMode] || adaptiveProfile.recommendedMode}
                        subtitle={`Target difficulty: ${adaptiveProfile.recommendedDifficulty}`}
                        tone={adaptiveProfile.recommendedMode === 'support' ? 'emerald' : adaptiveProfile.recommendedMode === 'challenge' ? 'rose' : 'sky'}
                    />
                    <UxMetricCard
                        label="Support Need"
                        value={`${adaptiveProfile.supportNeed}/100`}
                        subtitle="Higher means the interface should reduce cognitive load"
                        tone="emerald"
                    />
                    <UxMetricCard
                        label="Challenge Readiness"
                        value={`${adaptiveProfile.challengeReadiness}/100`}
                        subtitle="Higher means the learner can stretch safely"
                        tone="sky"
                    />
                    <UxMetricCard
                        label="Confidence Score"
                        value={`${adaptiveProfile.confidenceScore}/100`}
                        subtitle={`Last refreshed ${adaptiveUpdatedLabel}`}
                        tone="violet"
                    />
                </div>
            </div>

            <div className="stagger-reveal rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/12 via-transparent to-sky-500/8 p-5" style={{ '--reveal-delay': '260ms' }}>
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Category Guidance</p>
                        <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Topic-level support and challenge recommendations</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{categoryRecommendationWindow}</p>
                    </div>
                    {adaptiveInsights.generatedAt && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Generated {new Date(adaptiveInsights.generatedAt).toLocaleString()}
                        </p>
                    )}
                </div>

                {categoryRecommendations.length > 0 ? (
                    <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
                        {categoryRecommendations.slice(0, 3).map((item) => {
                            const modeBadgeClass = item.recommendedMode === 'support'
                                ? 'bg-emerald-500/15 text-emerald-200'
                                : item.recommendedMode === 'challenge'
                                    ? 'bg-rose-500/15 text-rose-200'
                                    : 'bg-sky-500/15 text-sky-200';

                            return (
                                <div key={item.category} className="rounded-2xl border border-white/10 bg-white/55 p-4 dark:bg-gray-900/30">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">{CATEGORY_LABELS[item.category] || item.category}</p>
                                            <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{ADAPTIVE_MODE_LABELS[item.recommendedMode] || item.recommendedMode}</p>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${modeBadgeClass}`}>
                                            {item.recommendedDifficulty}
                                        </span>
                                    </div>

                                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                        <div className="rounded-xl bg-gray-900/10 p-2 dark:bg-gray-800/50">
                                            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Support</p>
                                            <p className="text-sm font-bold text-emerald-200">{item.supportNeed}</p>
                                        </div>
                                        <div className="rounded-xl bg-gray-900/10 p-2 dark:bg-gray-800/50">
                                            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Challenge</p>
                                            <p className="text-sm font-bold text-sky-200">{item.challengeReadiness}</p>
                                        </div>
                                        <div className="rounded-xl bg-gray-900/10 p-2 dark:bg-gray-800/50">
                                            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Confidence</p>
                                            <p className="text-sm font-bold text-violet-200">{item.confidenceScore}</p>
                                        </div>
                                    </div>

                                    <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">{item.reason}</p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        Complete category practice in at least two topics to unlock topic-level recommendations.
                    </p>
                )}
            </div>

            <div className="stagger-reveal rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/12 via-transparent to-indigo-500/10 p-5" style={{ '--reveal-delay': '270ms' }}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Phase 3 Topic Intelligence</p>
                        <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Mastery pressure and next-best sequencing</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{topicWindowLabel}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/55 px-4 py-3 dark:bg-gray-900/30">
                        <p className="text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Active Stage</p>
                        <p className="mt-1 text-2xl font-bold text-blue-200">{topicIntelligence.activeStage || activeStage}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {topicIntelligence.pendingMasteryStages?.length || 0} pending mastery stage{(topicIntelligence.pendingMasteryStages?.length || 0) === 1 ? '' : 's'}
                        </p>
                        {topicGeneratedLabel && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Generated {topicGeneratedLabel}</p>
                        )}
                    </div>
                </div>

                {topicMasteryMap.length > 0 ? (
                    <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
                        {topicMasteryMap.slice(0, 3).map((item) => (
                            <div key={`mastery-${item.category}`} className="rounded-2xl border border-white/10 bg-white/55 p-4 dark:bg-gray-900/30">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">{CATEGORY_LABELS[item.category] || item.category}</p>
                                        <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">Mastery {item.masteryScore}/100</p>
                                    </div>
                                    <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-200">
                                        Pressure {item.weaknessPressure}
                                    </span>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div className="rounded-xl bg-gray-900/10 p-2 dark:bg-gray-800/50">
                                        <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Confidence</p>
                                        <p className="text-sm font-bold text-violet-200">{item.confidenceScore}</p>
                                    </div>
                                    <div className="rounded-xl bg-gray-900/10 p-2 dark:bg-gray-800/50">
                                        <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Difficulty</p>
                                        <p className="text-sm font-bold text-emerald-200">{item.recommendedDifficulty}</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">{item.reason}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        Topic mastery metrics will appear after enough category-level attempts are completed.
                    </p>
                )}

                {stageCategoryRecommendations.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/40 p-4 dark:bg-gray-900/20">
                        <p className="text-sm font-semibold text-blue-200">Stage + Topic Recommendations</p>
                        <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                            {stageCategoryRecommendations.slice(0, 4).map((item, index) => (
                                <div key={`stage-topic-${index}`} className="rounded-xl border border-white/10 bg-white/55 px-3 py-2 dark:bg-gray-900/30">
                                    <p className="text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Stage {item.stage} - {CATEGORY_LABELS[item.category] || item.category}</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{ADAPTIVE_MODE_LABELS[item.recommendedMode] || item.recommendedMode} / {item.recommendedDifficulty}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">{item.reason}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {sequencingPlan.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/40 p-4 dark:bg-gray-900/20">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-indigo-200">Next Best Session Sequence</p>
                            <Link to="/learn" className="text-xs font-semibold text-ocean-200 hover:text-ocean-100">Open Learn</Link>
                        </div>
                        <div className="mt-3 space-y-2">
                            {sequencingPlan.slice(0, 4).map((step) => (
                                <div key={`sequence-${step.rank}-${step.category}-${step.stage}`} className="rounded-xl border border-white/10 bg-white/55 px-3 py-2 dark:bg-gray-900/30">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{step.rank}. {CATEGORY_LABELS[step.category] || step.category} - Stage {step.stage}</p>
                                        <span className="rounded-full bg-indigo-500/15 px-2 py-1 text-xs font-semibold text-indigo-200">Priority {step.priorityScore}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                        {ADAPTIVE_MODE_LABELS[step.recommendedMode] || step.recommendedMode} mode at {step.recommendedDifficulty} for ~{step.estimatedMinutes} min.
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">{step.reason}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="stagger-reveal rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/14 via-transparent to-sky-500/10 p-5" style={{ '--reveal-delay': '276ms' }}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Phase 5 Learning Director</p>
                        <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Directed sessions and mastery forecasting</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Next-best session planning, stage confidence bands, recovery tracks, and fluency arc guidance.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/55 px-4 py-3 text-right dark:bg-gray-900/30">
                        <p className="text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Director Refresh</p>
                        <p className="mt-1 text-xl font-bold text-indigo-200">{learningDirector.attemptWindowSize || 0} attempts</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{directorGeneratedLabel ? `Generated ${directorGeneratedLabel}` : 'Awaiting more attempts'}</p>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
                    <UxMetricCard
                        label="Recovery Track"
                        value={recoveryPlan.required ? 'Active' : 'Stable'}
                        subtitle={recoveryPlan.required ? `Horizon ${recoveryPlan.horizonDays}d` : 'No acute recovery blockers'}
                        tone={recoveryPlan.required ? 'amber' : 'emerald'}
                    />
                    <UxMetricCard
                        label="Session Load"
                        value={`${workloadPlan.recommendedSessionsPerDay}/day`}
                        subtitle={`${workloadPlan.sessionMinutesRange?.min || 10}-${workloadPlan.sessionMinutesRange?.max || 18} min each`}
                        tone="sky"
                    />
                    <UxMetricCard
                        label="Mastery Readiness"
                        value={`${masteryForecast.readinessPercent || 0}/100`}
                        subtitle={masteryForecast.isReadyForMasteryTest ? 'Ready for mastery test' : `Likely in ~${masteryForecast.masteryLikelyInDays || 0}d`}
                        tone={masteryForecast.isReadyForMasteryTest ? 'emerald' : 'violet'}
                    />
                    <UxMetricCard
                        label="Learning Arc"
                        value={learningArcSummary.currentPhase || 'Calibrating'}
                        subtitle={learningArcSummary.nextMilestone || 'Complete more sessions for milestone projection'}
                        tone="violet"
                    />
                </div>

                {stageConfidenceBands.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/40 p-4 dark:bg-gray-900/20">
                        <p className="text-sm font-semibold text-indigo-200">Confidence Bands By Stage</p>
                        <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                            {stageConfidenceBands.slice(0, 4).map((band) => (
                                <div key={`stage-band-${band.stage}`} className="rounded-xl border border-white/10 bg-white/55 px-3 py-2 dark:bg-gray-900/30">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Stage {band.stage}</p>
                                        <span className="rounded-full bg-indigo-500/15 px-2 py-1 text-xs font-semibold text-indigo-200">{band.confidenceBand}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                        Confidence {band.confidenceScore}/100 | Readiness {band.readinessScore}/100 | Accuracy {band.accuracy}%
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {nextBestSessions.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/40 p-4 dark:bg-gray-900/20">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-indigo-200">Next-Best Session Plan</p>
                            <Link to={nextBestSessions[0].actionPath || '/learn'} className="text-xs font-semibold text-ocean-200 hover:text-ocean-100">Start Plan</Link>
                        </div>
                        <div className="mt-3 space-y-2">
                            {nextBestSessions.slice(0, 4).map((step) => (
                                <div key={`director-step-${step.rank}-${step.stage}-${step.category || 'any'}`} className="rounded-xl border border-white/10 bg-white/55 px-3 py-2 dark:bg-gray-900/30">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{step.rank}. {CATEGORY_LABELS[step.category] || step.category || `Stage ${step.stage}`}</p>
                                        <span className="rounded-full bg-indigo-500/15 px-2 py-1 text-xs font-semibold text-indigo-200">Priority {step.priorityScore}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{step.objective}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">{step.reason}</p>
                                    <Link to={step.actionPath || '/learn'} className="mt-1 inline-flex text-xs font-semibold text-sky-200 hover:text-sky-100">Open session</Link>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {recoveryPlan?.triggerReason && (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/40 p-4 dark:bg-gray-900/20">
                        <p className="text-sm font-semibold text-indigo-200">Recovery And Arc Narrative</p>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{recoveryPlan.triggerReason}</p>
                        {learningArcSummary?.narrative && (
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{learningArcSummary.narrative}</p>
                        )}
                    </div>
                )}
            </div>

            <div className="stagger-reveal card-glow border border-ocean-500/25 bg-gradient-to-br from-ocean-500/12 via-tamil-500/10 to-transparent" style={{ '--reveal-delay': '280ms' }}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ocean-300">AI Study Copilot</p>
                        <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Personal Plan For Today</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Auto-generated from review load, weak-skill pressure, focus signals, and stage momentum.</p>
                    </div>
                    <Link to={topRecommendation?.actionPath || continuePath} className="btn-primary whitespace-nowrap">
                        {topRecommendation?.actionLabel || 'Continue Learning'}
                    </Link>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/55 p-4 dark:bg-gray-900/30">
                    <p className="text-sm font-semibold text-ocean-200">Next Best Lesson</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{topRecommendation?.title || 'Continue stage progression'}</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{topRecommendation?.summary || 'No urgent blockers detected.'}</p>
                </div>

                <div className="mt-4 space-y-3">
                    {copilotRecommendations.map((item, index) => (
                        <div key={item.id} className="rounded-2xl border border-white/10 bg-white/45 p-4 dark:bg-gray-900/25">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Suggestion {index + 1}</p>
                                    <p className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
                                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{item.summary}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                                        Priority {item.priorityWeight}
                                    </span>
                                    <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-200">
                                        Confidence {item.confidenceScore}%
                                    </span>
                                </div>
                            </div>

                            <details className="mt-3 rounded-xl border border-white/10 bg-white/35 px-3 py-2 dark:bg-gray-900/30">
                                <summary className="cursor-pointer text-sm font-medium text-ocean-200">Why this recommendation?</summary>
                                <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                    {item.reasons.map((reason) => (
                                        <li key={reason}>- {reason}</li>
                                    ))}
                                </ul>
                            </details>

                            {item.actionPath && (
                                <div className="mt-3">
                                    <Link to={item.actionPath} className="inline-flex items-center rounded-xl border border-ocean-400/25 bg-ocean-500/10 px-3 py-2 text-xs font-semibold text-ocean-200 hover:bg-ocean-500/20 transition-colors">
                                        {item.actionLabel || 'Take Action'}
                                    </Link>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {weakCategoryInsights.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4">
                        <p className="text-sm font-semibold text-rose-300">Weak Skill Alerts</p>
                        <p className="mt-1 text-sm text-rose-100/90">
                            {weakCategoryInsights.map((item) => `${CATEGORY_LABELS[item.category] || item.category} (${item.failRate}% miss rate)`).join(' | ')}
                        </p>
                    </div>
                )}

                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    Live context: {recentAccuracy}% recent accuracy, {reviewQueue.total || 0} due reviews, {user?.current_streak || 0}-day streak.
                </p>
            </div>

            <div className="stagger-reveal card-glow border border-sky-500/20 bg-gradient-to-br from-sky-500/12 via-ocean-500/10 to-transparent" style={{ '--reveal-delay': '360ms' }}>
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Learning Path</p>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stage Roadmap</h2>
                    </div>
                    <span className="text-sm text-sky-200">Unlock next stage by passing mastery tests (70%+)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                    {stageRows.map((stage) => (
                        <Link
                            key={stage.stage}
                            to={stage.unlocked ? `/learn?stage=${stage.stage}` : '#'}
                            className={`rounded-2xl border p-4 transition-all ${
                                stage.unlocked
                                    ? 'border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/20'
                                    : 'pointer-events-none border-gray-700/60 bg-gray-900/30 opacity-70'
                            } ${activeStage === stage.stage ? 'animate-pulse-slow shadow-[0_0_18px_rgba(14,165,233,0.35)]' : ''}`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-400">Stage {stage.stage}</p>
                                    <p className="text-sm font-semibold text-gray-100">{stage.en}</p>
                                    <p className="text-xs font-tamil text-gray-400">{stage.ta}</p>
                                </div>
                                <span className="text-lg">{stage.unlocked ? '🔓' : '🔒'}</span>
                            </div>
                            <div className="mt-3">
                                <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-emerald-400 to-sky-400" style={{ width: `${stage.percent}%` }} />
                                </div>
                                <p className="mt-2 text-xs text-gray-300">{stage.percent}% complete</p>
                                <p className="text-xs text-amber-300">{stage.masteryPassed ? '🏅 Mastery passed' : 'Mastery pending'}</p>
                                {!stage.unlocked && (
                                    <p className="text-[11px] text-gray-500 mt-1">Pass previous mastery at 70% to unlock.</p>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="stagger-reveal card-glow overflow-hidden border border-amber-500/20 bg-gradient-to-br from-amber-500/12 via-orange-500/10 to-transparent" style={{ '--reveal-delay': '440ms' }}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">Review Queue</p>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">
                            {reviewQueue.total > 0 ? `${reviewQueue.total} lesson${reviewQueue.total === 1 ? '' : 's'} due for review` : 'No lessons are due right now'}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">
                            Spaced repetition brings lessons back when they are actually due, instead of retrying every weak answer immediately.
                        </p>
                        {reviewQueue.total === 0 && reviewQueue.nextDueAt && (
                            <p className="text-xs font-medium text-amber-200/90">
                                Next review: {formatDueLabel(reviewQueue.nextDueAt)}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-2">
                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                                {reviewQueue.completionStats?.clearedToday || 0} reviews cleared today
                            </span>
                            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">
                                {reviewQueue.completionStats?.currentStreak || 0}-day review streak
                            </span>
                        </div>
                    </div>
                    <Link
                        to="/learn?mode=review"
                        className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
                            reviewQueue.total > 0
                                ? 'bg-amber-400 text-gray-950 hover:bg-amber-300 shadow-lg shadow-amber-900/20'
                                : 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400 pointer-events-none'
                        }`}
                    >
                        {reviewQueue.total > 0 ? 'Start Review Queue' : 'Nothing Due Yet'}
                    </Link>
                </div>
                {reviewQueue.items?.length > 0 && (
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {reviewQueue.items.map((item) => (
                            <div key={item.lesson._id} className="rounded-2xl border border-white/10 bg-white/60 p-4 dark:bg-gray-900/40">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.lesson.question}</p>
                                        <p className="mt-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            {item.lesson.category} · {item.lesson.difficulty}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-rose-500/15 px-2 py-1 text-xs font-semibold text-rose-300">
                                        {formatDueLabel(item.stats.dueAt)}
                                    </span>
                                </div>
                                <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                                    {formatReviewReason(item.stats.reason)}. {item.stats.consecutiveCorrect} correct in a row, {item.stats.intervalHours}h interval.
                                </p>
                                <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-500">
                                    Accuracy {Math.round((item.stats.avgScore || 0) * 100)}% | {item.stats.avgErrors.toFixed(1)} avg errors | {item.stats.avgHints.toFixed(1)} avg hints
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="stagger-reveal grid grid-cols-1 gap-4 lg:grid-cols-3" style={{ '--reveal-delay': '520ms' }}>
                {REVIEW_BUCKETS.map((bucket) => {
                    const bucketData = reviewQueue.reviewBuckets?.[bucket.key] || { count: 0, items: [] };

                    return (
                        <div key={bucket.key} className="card-glow border border-sky-500/10 bg-gradient-to-br from-sky-500/8 via-transparent to-transparent">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">{bucket.label}</p>
                                    <h3 className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">{bucketData.count}</h3>
                                </div>
                                <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">
                                    {bucketData.count === 1 ? '1 lesson' : `${bucketData.count} lessons`}
                                </span>
                            </div>

                            {bucketData.items.length > 0 ? (
                                <div className="mt-4 space-y-3">
                                    {bucketData.items.map((item) => (
                                        <div key={`${bucket.key}-${item.lesson._id}`} className="rounded-2xl border border-white/10 bg-white/50 p-3 dark:bg-gray-900/30">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.lesson.question}</p>
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                {formatDueLabel(item.stats.dueAt)} | {formatReviewReason(item.stats.reason)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{bucket.empty}</p>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="stagger-reveal card-glow border border-emerald-500/10 bg-gradient-to-br from-emerald-500/8 via-transparent to-transparent" style={{ '--reveal-delay': '600ms' }}>
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Review Calendar</p>
                        <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Next 7 days of review load</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Built from persisted `dueAt` dates so the plan stays stable until you complete more reviews.
                        </p>
                    </div>
                    <div className="flex gap-3 text-sm">
                        <div className="rounded-2xl bg-white/50 px-4 py-3 dark:bg-gray-900/30">
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Cleared Today</p>
                            <p className="mt-1 text-xl font-bold text-emerald-300">{reviewQueue.completionStats?.clearedToday || 0}</p>
                        </div>
                        <div className="rounded-2xl bg-white/50 px-4 py-3 dark:bg-gray-900/30">
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Best Streak</p>
                            <p className="mt-1 text-xl font-bold text-sky-300">{reviewQueue.completionStats?.longestStreak || 0} days</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
                    {(reviewQueue.weeklyTimeline || []).map((day) => (
                        <div key={day.date} className="rounded-2xl border border-white/10 bg-white/50 p-4 dark:bg-gray-900/30">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{day.label}</p>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{day.dueCount}</span>
                            </div>
                            <div className="mt-4 h-24 rounded-xl bg-gray-200/50 p-2 dark:bg-gray-800/60">
                                <div
                                    className="w-full rounded-lg bg-gradient-to-t from-emerald-400 to-sky-400 transition-all"
                                    style={{ height: `${Math.max((day.dueCount / maxTimelineDue) * 100, day.dueCount > 0 ? 18 : 0)}%` }}
                                />
                            </div>
                            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                {day.dueCount === 0 ? 'Clear day' : `${day.dueCount} review${day.dueCount === 1 ? '' : 's'} due`}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Badges Section */}
            {user?.badges?.length > 0 && (
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors">🏆 Badges Earned</h3>
                    <div className="flex flex-wrap gap-4">
                        {user.badges.map((badge, idx) => (
                            <div key={idx} className="flex flex-col items-center bg-gray-100 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 w-32 text-center hover:border-tamil-500/50 dark:hover:border-tamil-500/50 transition-all group">
                                <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">{badge.icon}</span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-tamil-600 dark:group-hover:text-tamil-400 transition-colors">{badge.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors">📈 Performance Trend</h3>
                    <div className="h-64">
                        {stats?.recentTrend?.length > 0 ? (
                            <Line data={trendData} options={{ ...chartDefaults }} />
                        ) : (
                            <EmptyChart message="Complete some lessons to see your performance trend!" />
                        )}
                    </div>
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors">❌ Error Trend</h3>
                    <div className="h-64">
                        {stats?.recentTrend?.length > 0 ? (
                            <Bar data={errorData} options={{ ...chartDefaults }} />
                        ) : (
                            <EmptyChart message="No error data yet. Start learning!" />
                        )}
                    </div>
                </div>
            </div>

            {/* Activity chart */}
            <div className="card">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors">📊 Daily Activity</h3>
                <div className="h-64">
                    {stats?.recentTrend?.length > 0 ? (
                        <Bar data={activityData} options={{ ...chartDefaults }} />
                    ) : (
                        <EmptyChart message="Start learning to see your daily activity!" />
                    )}
                </div>
            </div>

            {/* Recent attempts */}
            <div className="card">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors">📋 Recent Activity</h3>
                {history.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-600 dark:text-gray-500 border-b border-gray-200 dark:border-gray-800">
                                    <th className="text-left py-3 px-2">Question</th>
                                    <th className="text-center py-3 px-2">Result</th>
                                    <th className="text-center py-3 px-2">Time</th>
                                    <th className="text-center py-3 px-2">Errors</th>
                                    <th className="text-center py-3 px-2">Hints</th>
                                    <th className="text-right py-3 px-2">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.slice(0, 10).map((h, i) => (
                                    <tr key={i} className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="py-3 px-2 text-gray-800 dark:text-gray-300 font-tamil max-w-xs truncate">
                                            {h.lesson_id?.question || 'Lesson'}
                                        </td>
                                        <td className="text-center py-3 px-2">
                                            {h.score === 1 ? '✅' : '❌'}
                                        </td>
                                        <td className="text-center py-3 px-2 text-gray-600 dark:text-gray-400">{h.time_spent}s</td>
                                        <td className="text-center py-3 px-2 text-gray-600 dark:text-gray-400">{h.errors}</td>
                                        <td className="text-center py-3 px-2 text-gray-600 dark:text-gray-400">{h.hints_used}</td>
                                        <td className="text-right py-3 px-2 text-gray-500 text-xs">
                                            {new Date(h.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-8">No activity yet. Start your first lesson!</p>
                )}
            </div>

            {/* Edit Profile Modal */}
            {isEditProfileOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Edit Profile</h2>
                            <button onClick={() => setIsEditProfileOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-3xl font-light leading-none">&times;</button>
                        </div>
                        <div className="p-6 space-y-8">
                            {/* Avatar Selection */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">Choose Avatar</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {AVATARS.map(avatar => (
                                        <button
                                            key={avatar.id}
                                            onClick={() => setEditAvatarId(avatar.id)}
                                            className={`w-[4.5rem] h-[4.5rem] mx-auto rounded-2xl flex items-center justify-center text-3xl transition-all ${avatar.bg} hover:scale-105 ${editAvatarId === avatar.id ? `ring-4 ring-offset-2 ring-tamil-500 dark:ring-offset-gray-800 scale-105 shadow-lg` : 'opacity-60 hover:opacity-100 saturate-50 hover:saturate-100'}`}
                                            title="Select Avatar"
                                        >
                                            {avatar.icon}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Name Input */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Display Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    maxLength={50}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-tamil-500 transition-colors text-gray-900 dark:text-white shadow-inner font-medium"
                                    placeholder="Your name"
                                />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Adaptive Mode Preference</label>
                                    <select
                                        value={editAdaptiveModePreference}
                                        onChange={(e) => setEditAdaptiveModePreference(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-tamil-500 transition-colors text-gray-900 dark:text-white shadow-inner font-medium"
                                    >
                                        <option value="auto">Auto</option>
                                        <option value="support">Support</option>
                                        <option value="balanced">Flow</option>
                                        <option value="challenge">Challenge</option>
                                    </select>
                                </div>

                                <label className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                                    <div>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Immersive By Default</p>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Open future learn sessions with immersive visuals enabled.</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={editImmersiveModeDefault}
                                        onChange={(e) => setEditImmersiveModeDefault(e.target.checked)}
                                        className="h-5 w-5 rounded border-gray-300 text-tamil-500 focus:ring-tamil-500"
                                    />
                                </label>
                            </div>
                        </div>
                        <div className="p-5 bg-gray-50 dark:bg-gray-900/80 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                            <button onClick={() => setIsEditProfileOpen(false)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium">Cancel</button>
                            <button onClick={handleSaveProfile} disabled={savingProfile || !editName.trim()} className="btn-primary py-2.5 px-6">
                                {savingProfile ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function UxMetricCard({ label, value, subtitle, tone = 'sky' }) {
    const toneMap = {
        emerald: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
        amber: 'border-amber-500/25 bg-amber-500/10 text-amber-200',
        sky: 'border-sky-500/25 bg-sky-500/10 text-sky-200',
        rose: 'border-rose-500/25 bg-rose-500/10 text-rose-200',
        violet: 'border-violet-500/25 bg-violet-500/10 text-violet-200'
    };

    return (
        <div className={`card-glow border ${toneMap[tone] || toneMap.sky}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
        <div className="card-glow flex flex-col items-center text-center py-5">
            <span className="text-2xl mb-2">{icon}</span>
            <span className={`text-2xl font-bold ${color}`}>{value}</span>
            <span className="text-xs text-gray-500 mt-1">{label}</span>
        </div>
    );
}

function EmptyChart({ message }) {
    return (
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            <p>{message}</p>
        </div>
    );
}
