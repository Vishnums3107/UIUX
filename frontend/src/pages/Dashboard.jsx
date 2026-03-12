import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attemptAPI, authAPI } from '../services/api';
import { Link } from 'react-router-dom';
import SkillMeter from '../components/SkillMeter';
import { getAvatar, AVATARS } from '../utils/avatars';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement, BarElement,
    Title, Tooltip, Legend, Filler, ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement);

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
    const [loading, setLoading] = useState(true);

    // Profile Edit State
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAvatarId, setEditAvatarId] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    const handleSaveProfile = async () => {
        if (!editName.trim()) return;
        setSavingProfile(true);
        try {
            const res = await authAPI.updateProfile({ name: editName, avatarId: editAvatarId });
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
        setIsEditProfileOpen(true);
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statsRes, histRes, reviewRes] = await Promise.allSettled([
                attemptAPI.getStats(),
                attemptAPI.getHistory({ limit: 50 }),
                attemptAPI.getReviewQueue({ limit: 5 })
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
                borderColor: '#d946ef',
                backgroundColor: 'rgba(217,70,239,0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#d946ef',
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

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
                            <div className="flex items-center gap-1 bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full text-sm font-bold border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.2)] animate-pulse-slow">
                                🔥 {user?.current_streak || 0} Day Streak
                            </div>
                        </div>
                    </div>
                </div>
                <Link to="/learn" className="btn-primary">
                    📚 Continue Learning
                </Link>
            </div>

            {/* Top stats row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Skill meter */}
                <div className="card-glow flex justify-center md:col-span-1">
                    <SkillMeter score={user?.skill_score || 0} />
                </div>

                {/* Stat cards */}
                <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
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

            <div className="card-glow overflow-hidden border border-amber-500/20 bg-gradient-to-br from-amber-500/12 via-orange-500/10 to-transparent">
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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

            <div className="card-glow border border-emerald-500/10 bg-gradient-to-br from-emerald-500/8 via-transparent to-transparent">
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
