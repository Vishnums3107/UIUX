import { useState, useEffect, useRef } from 'react';
import { leaderboardAPI } from '../services/api';
import { getAvatar } from '../utils/avatars';
import { useAuth } from '../context/AuthContext';

const TABS = [
    { key: 'skill_score', label: '⚡ Skill Score', color: 'from-fuchsia-600 to-sky-600' },
    { key: 'totalXP', label: '✨ Total XP', color: 'from-amber-500 to-orange-500' },
    { key: 'current_streak', label: '🔥 Streak', color: 'from-rose-500 to-pink-500' },
];

const PODIUM_MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_HEIGHTS = ['h-52', 'h-40', 'h-32'];
const PODIUM_SCALES = ['scale-110', 'scale-100', 'scale-90'];
const PODIUM_DELAYS = ['delay-[600ms]', 'delay-[300ms]', 'delay-[900ms]'];
const PODIUM_RING_COLORS = [
    'ring-4 ring-amber-400/50 shadow-[0_0_32px_rgba(251,191,36,0.35)]',
    'ring-2 ring-gray-400/40 shadow-[0_0_20px_rgba(156,163,175,0.25)]',
    'ring-2 ring-amber-700/40 shadow-[0_0_16px_rgba(180,83,9,0.2)]',
];
const PODIUM_GRADIENT = [
    'from-amber-500/20 to-yellow-500/10 border-amber-500/30',
    'from-gray-400/12 to-slate-400/8 border-gray-500/20',
    'from-amber-700/15 to-orange-700/8 border-amber-700/20',
];

function AnimatedBar({ value, maxValue, delay = 0, color = '#0ea5e9' }) {
    const [width, setWidth] = useState(0);
    const ref = useRef(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setWidth(maxValue > 0 ? (value / maxValue) * 100 : 0);
        }, delay);
        return () => clearTimeout(timer);
    }, [value, maxValue, delay]);

    return (
        <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
            <div
                ref={ref}
                className="h-full rounded-full transition-all"
                style={{
                    width: `${width}%`,
                    background: color,
                    transitionDuration: '900ms',
                    transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
            />
        </div>
    );
}

function PodiumCard({ user, rank, entered }) {
    const avatar = getAvatar(user.avatarId);
    const delay = PODIUM_DELAYS[rank - 1];
    const ring = PODIUM_RING_COLORS[rank - 1];
    const gradient = PODIUM_GRADIENT[rank - 1];

    return (
        <div
            className={`flex flex-col items-center transition-all duration-700 ${delay} ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
        >
            {/* Medal */}
            <span className={`text-4xl mb-2 ${rank === 1 ? 'animate-bounce' : ''}`}>
                {PODIUM_MEDALS[rank - 1]}
            </span>

            {/* Avatar */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${avatar?.bg || 'bg-gray-800'} ${ring} mb-3`}>
                {avatar?.icon || '👤'}
            </div>

            {/* Name + score */}
            <h3 className="font-bold text-gray-100 text-center text-sm truncate max-w-[120px]">{user.name}</h3>
            <p className={`text-xl font-black text-transparent bg-clip-text bg-gradient-to-r ${TABS[0].color}`}>
                {Math.round(user.skill_score)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">🔥 {user.current_streak} streak</p>

            {/* Podium block */}
            <div
                className={`mt-3 w-28 ${PODIUM_HEIGHTS[rank - 1]} rounded-t-2xl border bg-gradient-to-b ${gradient} ${PODIUM_SCALES[rank - 1]} transition-all duration-1000 ${delay} ${entered ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'} origin-bottom`}
            />
        </div>
    );
}

export default function Leaderboard() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('skill_score');
    const [podiumEntered, setPodiumEntered] = useState(false);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await leaderboardAPI.getTopUsers();
                setUsers(res.data || []);
                // Trigger podium animation after data loads
                setTimeout(() => setPodiumEntered(true), 150);
            } catch (err) {
                console.error('Leaderboard error:', err);
                setError('Failed to load leaderboard rankings.');
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const sortedUsers = [...users].sort((a, b) => {
        if (activeTab === 'totalXP') return (b.totalXP || 0) - (a.totalXP || 0);
        if (activeTab === 'current_streak') return (b.current_streak || 0) - (a.current_streak || 0);
        return (b.skill_score || 0) - (a.skill_score || 0);
    });

    const top3 = sortedUsers.slice(0, 3);
    const rest = sortedUsers.slice(3);
    const maxValue = sortedUsers[0]?.[activeTab] || 1;
    const currentUserRank = sortedUsers.findIndex(u => u._id === currentUser?._id) + 1;
    const currentUserData = sortedUsers.find(u => u._id === currentUser?._id);

    const activeTabMeta = TABS.find(t => t.key === activeTab);

    const getValueDisplay = (user) => {
        if (activeTab === 'skill_score') return Math.round(user.skill_score || 0);
        if (activeTab === 'totalXP') return `${(user.totalXP || 0).toLocaleString()} XP`;
        return `${user.current_streak || 0}🔥`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="relative mx-auto w-16 h-16">
                        <div className="w-16 h-16 border-4 border-fuchsia-500/20 rounded-full" />
                        <div className="absolute inset-0 w-16 h-16 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-gray-400 text-sm animate-pulse">Loading rankings...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="card text-center max-w-md w-full space-y-4">
                    <div className="text-6xl">🏆</div>
                    <h2 className="text-2xl font-bold text-gray-100">Unavailable</h2>
                    <p className="text-gray-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
            {/* Header */}
            <div className="text-center space-y-3 animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-fuchsia-400">Global Rankings</p>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-sky-400 to-indigo-400">
                    Leaderboard
                </h1>
                <p className="text-gray-400 text-sm max-w-xl mx-auto">
                    Master Tamil to claim the crown. Ranked by skill, XP, and consistency. 👑
                </p>
            </div>

            {/* Tab switcher */}
            <div className="flex justify-center">
                <div className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-gray-900/60 p-1 backdrop-blur-sm">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${activeTab === tab.key
                                ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Podium — top 3 */}
            {top3.length > 0 && (
                <div className="flex items-end justify-center gap-4 pt-4">
                    {/* Reorder: 2nd, 1st, 3rd */}
                    {[
                        top3[1] && { user: top3[1], rank: 2 },
                        top3[0] && { user: top3[0], rank: 1 },
                        top3[2] && { user: top3[2], rank: 3 },
                    ].filter(Boolean).map(({ user, rank }) => (
                        <PodiumCard key={user._id} user={user} rank={rank} entered={podiumEntered} />
                    ))}
                </div>
            )}

            {/* Rest of rankings */}
            {rest.length > 0 && (
                <div className="rounded-3xl border border-white/8 bg-gray-900/40 backdrop-blur-sm overflow-hidden">
                    <div className="border-b border-white/8 px-5 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Rankings 4–{sortedUsers.length}</p>
                    </div>
                    <ul className="divide-y divide-white/5">
                        {rest.map((u, index) => {
                            const avatar = getAvatar(u.avatarId);
                            const isCurrentUser = u._id === currentUser?._id;
                            const globalRank = index + 4;

                            return (
                                <li
                                    key={u._id}
                                    className={`flex items-center gap-4 px-5 py-3 transition-all ${isCurrentUser
                                        ? 'bg-fuchsia-500/8 border-l-2 border-fuchsia-500'
                                        : 'hover:bg-white/3'
                                    }`}
                                >
                                    <span className="w-8 text-center text-sm font-bold text-gray-600">
                                        #{globalRank}
                                    </span>

                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${avatar?.bg || 'bg-gray-800'}`}>
                                        {avatar?.icon || '👤'}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className={`font-semibold truncate ${isCurrentUser ? 'text-fuchsia-300' : 'text-gray-200'}`}>
                                                {u.name}
                                            </h4>
                                            {isCurrentUser && (
                                                <span className="rounded-full bg-fuchsia-500/20 px-2 py-0.5 text-[10px] font-bold text-fuchsia-300">You</span>
                                            )}
                                        </div>
                                        <AnimatedBar
                                            value={u[activeTab] || 0}
                                            maxValue={maxValue}
                                            delay={200 + index * 60}
                                            color={`linear-gradient(to right, ${activeTab === 'skill_score' ? '#c026d3, #0ea5e9' : activeTab === 'totalXP' ? '#f59e0b, #ef4444' : '#ef4444, #ec4899'})`}
                                        />
                                    </div>

                                    <div className="text-right flex-shrink-0">
                                        <p className={`font-black text-base ${isCurrentUser ? 'text-fuchsia-300' : 'text-gray-200'}`}>
                                            {getValueDisplay(u)}
                                        </p>
                                        <p className="text-[10px] text-gray-500 capitalize">{u.level}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* Your Rank card — pinned at bottom */}
            {currentUserRank > 0 && currentUserData && (
                <div className="rounded-3xl border border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500/10 via-transparent to-sky-500/10 p-5 animate-fade-in">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-400">Your Standing</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-sky-400">
                                    #{currentUserRank}
                                </span>
                                <span className="text-sm text-gray-500">of {sortedUsers.length} learners</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Gap to #1</p>
                            <p className="text-lg font-bold text-gray-300">
                                {activeTab === 'skill_score'
                                    ? `${Math.round((sortedUsers[0]?.[activeTab] || 0) - (currentUserData?.[activeTab] || 0))} pts`
                                    : activeTab === 'totalXP'
                                        ? `${((sortedUsers[0]?.totalXP || 0) - (currentUserData?.totalXP || 0)).toLocaleString()} XP`
                                        : `${(sortedUsers[0]?.current_streak || 0) - (currentUserData?.current_streak || 0)} days`
                                }
                            </p>
                        </div>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${getAvatar(currentUserData.avatarId)?.bg || 'bg-gray-800'}`}>
                            {getAvatar(currentUserData.avatarId)?.icon || '👤'}
                        </div>
                    </div>
                    <div className="mt-3">
                        <AnimatedBar
                            value={currentUserData?.[activeTab] || 0}
                            maxValue={sortedUsers[0]?.[activeTab] || 1}
                            delay={400}
                            color="linear-gradient(to right, #c026d3, #0ea5e9)"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                            <span>You</span>
                            <span>#1 {sortedUsers[0]?.name}</span>
                        </div>
                    </div>
                </div>
            )}

            {users.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                    No learners yet. Be the first to rank! 🏆
                </div>
            )}
        </div>
    );
}
