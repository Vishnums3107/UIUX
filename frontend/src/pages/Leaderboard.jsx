import { useState, useEffect } from 'react';
import { leaderboardAPI } from '../services/api';
import { getAvatar } from '../utils/avatars';

const Leaderboard = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await leaderboardAPI.getTopUsers();
                setUsers(res.data);
            } catch (err) {
                console.error("Leaderboard error:", err);
                setError('Failed to load leaderboard relative rankings.');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="text-rose-500 text-5xl mb-4">🏆</div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Unavailable</h2>
                    <p className="text-gray-600 dark:text-gray-300">{error}</p>
                </div>
            </div>
        );
    }

    const topThree = users.slice(0, 3);
    const rest = users.slice(3);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-4xl mx-auto space-y-12">

                {/* Header */}
                <div className="text-center space-y-4 animate-[fade-in_0.5s_ease-out]">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-sky-600 dark:from-fuchsia-400 dark:to-sky-400">
                        Global Leaderboard
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Ranked by skill score and daily study streaks. Master the language to claim the crown! 👑
                    </p>
                </div>

                {/* Top 3 Podium */}
                {topThree.length > 0 && (
                    <div className="flex flex-col md:flex-row items-end justify-center gap-6 md:gap-4 lg:gap-8 pt-8 pb-4 animate-[slide-up_0.6s_ease-out]">

                        {/* 2nd Place */}
                        {topThree[1] && (
                            <div className="flex flex-col items-center order-2 md:order-1 relative group w-full md:w-1/3">
                                <div className="absolute -top-10 text-4xl mb-2 drop-shadow-md">🥈</div>
                                <div className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-lg w-full p-4 flex flex-col items-center border border-gray-100 dark:border-gray-700 h-48 justify-end transform transition-transform group-hover:-translate-y-2">
                                    <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-inner mb-3">
                                        {getAvatar(topThree[1].avatarId)?.icon || '👤'}
                                    </div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate w-full text-center">
                                        {topThree[1].name}
                                    </h3>
                                    <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-500 to-gray-700 dark:from-gray-300 dark:to-gray-100">
                                        {Math.round(topThree[1].skill_score)}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                                        🔥 {topThree[1].current_streak} streak
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 1st Place */}
                        <div className="flex flex-col items-center order-1 md:order-2 relative group w-full md:w-1/3 z-10">
                            <div className="absolute -top-14 text-6xl drop-shadow-lg animate-bounce">👑</div>
                            <div className="bg-gradient-to-b from-yellow-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-t-3xl shadow-2xl w-full p-6 flex flex-col items-center border border-yellow-200 dark:border-yellow-700/50 h-56 justify-end transform transition-transform group-hover:-translate-y-2">
                                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-inner shadow-yellow-200 mb-3 ring-4 ring-yellow-100 dark:ring-yellow-900/50">
                                    {getAvatar(topThree[0].avatarId)?.icon || '👤'}
                                </div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate w-full text-center">
                                    {topThree[0].name}
                                </h3>
                                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-700 dark:from-yellow-400 dark:to-amber-600">
                                    {Math.round(topThree[0].skill_score)}
                                </div>
                                <div className="text-sm font-medium text-amber-600 dark:text-amber-400 mt-1 flex items-center bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 rounded-full">
                                    🔥 {topThree[0].current_streak} streak
                                </div>
                            </div>
                        </div>

                        {/* 3rd Place */}
                        {topThree[2] && (
                            <div className="flex flex-col items-center order-3 md:order-3 relative group w-full md:w-1/3">
                                <div className="absolute -top-10 text-4xl mb-2 drop-shadow-md">🥉</div>
                                <div className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-lg w-full p-4 flex flex-col items-center border border-gray-100 dark:border-gray-700 h-40 justify-end transform transition-transform group-hover:-translate-y-2">
                                    <div className="w-14 h-14 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-inner mb-3">
                                        {getAvatar(topThree[2].avatarId)?.icon || '👤'}
                                    </div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate w-full text-center">
                                        {topThree[2].name}
                                    </h3>
                                    <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-amber-900 dark:from-amber-500 dark:to-amber-700">
                                        {Math.round(topThree[2].skill_score)}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                                        🔥 {topThree[2].current_streak} streak
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Rest of the list */}
                {rest.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden animate-[fade-in_0.8s_ease-out]">
                        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                            {rest.map((user, index) => (
                                <li key={user._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center">
                                    <div className="w-8 text-center text-gray-400 dark:text-gray-500 font-bold mr-4">
                                        #{index + 4}
                                    </div>

                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl mr-4 flex-shrink-0 ${getAvatar(user.avatarId)?.bg || 'bg-gray-100'}`}>
                                        {getAvatar(user.avatarId)?.icon || '👤'}
                                    </div>

                                    <div className="flex-1 min-w-0 pr-4">
                                        <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
                                            {user.name}
                                        </h4>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                            {user.level} Level
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end flex-shrink-0">
                                        <div className="text-lg font-black text-fuchsia-600 dark:text-fuchsia-400">
                                            {Math.round(user.skill_score)}
                                        </div>
                                        <div className="text-xs font-medium text-orange-500 flex items-center bg-orange-50 dark:bg-orange-900/20 px-2 rounded-full">
                                            🔥 {user.current_streak}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {users.length === 0 && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                        No learners found on the leaderboard yet. Be the first!
                    </div>
                )}

            </div>
        </div>
    );
};

export default Leaderboard;
