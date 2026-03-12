import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

export default function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [userProgress, setUserProgress] = useState(null);
    const [progressLoading, setProgressLoading] = useState(false);
    const [progressError, setProgressError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersRes, analyticsRes] = await Promise.all([
                adminAPI.getUsers(),
                adminAPI.getAnalytics()
            ]);
            setUsers(usersRes.data);
            setAnalytics(analyticsRes.data);
        } catch (err) {
            console.error('Admin data load failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const openUserProgress = async (user) => {
        setSelectedUser(user);
        setUserProgress(null);
        setProgressError('');
        setProgressLoading(true);

        try {
            const progressRes = await adminAPI.getUserProgress(user._id);
            setUserProgress(progressRes.data);
        } catch (err) {
            console.error('Failed to load user progress:', err);
            setProgressError('Unable to load user progress right now.');
        } finally {
            setProgressLoading(false);
        }
    };

    const closeUserProgress = () => {
        setSelectedUser(null);
        setUserProgress(null);
        setProgressLoading(false);
        setProgressError('');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin h-10 w-10 border-4 border-tamil-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    // Filter and search users
    const filteredUsers = users.filter(u => {
        const matchFilter = filter === 'all' || u.level === filter;
        const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase());
        return matchFilter && matchSearch;
    });

    // Level distribution chart
    const levelDist = analytics?.levelDistribution || [];
    const levelChartData = {
        labels: levelDist.map(d => d._id),
        datasets: [{
            data: levelDist.map(d => d.count),
            backgroundColor: ['rgba(16,185,129,0.7)', 'rgba(245,158,11,0.7)', 'rgba(244,63,94,0.7)'],
            borderWidth: 0,
        }]
    };

    // Activity chart
    const activityData = {
        labels: analytics?.recentActivity?.map(d => d._id.slice(5)) || [],
        datasets: [{
            label: 'Attempts',
            data: analytics?.recentActivity?.map(d => d.attempts) || [],
            backgroundColor: 'rgba(217,70,239,0.6)',
            borderRadius: 6,
        }]
    };

    const progressAttempts = userProgress?.attempts || [];
    const progressSummary = progressAttempts.length
        ? {
            attempts: progressAttempts.length,
            accuracy: Math.round((progressAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / progressAttempts.length) * 100),
            avgTime: Math.round(progressAttempts.reduce((sum, attempt) => sum + (attempt.time_spent || 0), 0) / progressAttempts.length),
            avgErrors: (progressAttempts.reduce((sum, attempt) => sum + (attempt.errors || 0), 0) / progressAttempts.length).toFixed(1)
        }
        : { attempts: 0, accuracy: 0, avgTime: 0, avgErrors: '0.0' };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-4 transition-colors">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 transition-colors">⚙️ Admin Dashboard</h1>
                <Link to="/admin/lessons" className="btn-primary flex items-center gap-2">
                    <span>📚</span> Manage Lessons
                </Link>
            </div>

            {/* Overview cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card-glow text-center">
                    <p className="text-3xl font-bold text-ocean-400">{analytics?.totalUsers || 0}</p>
                    <p className="text-sm text-gray-500 mt-1">Total Users</p>
                </div>
                <div className="card-glow text-center">
                    <p className="text-3xl font-bold text-tamil-400">{Math.round(analytics?.averages?.avgSkill || 0)}</p>
                    <p className="text-sm text-gray-500 mt-1">Avg Skill Score</p>
                </div>
                <div className="card-glow text-center">
                    <p className="text-3xl font-bold text-emerald-400">{Math.round(analytics?.averages?.avgLessons || 0)}</p>
                    <p className="text-sm text-gray-500 mt-1">Avg Lessons Completed</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors">Level Distribution</h3>
                    <div className="h-64 flex items-center justify-center">
                        {levelDist.length > 0 ? (
                            <Doughnut data={levelChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#9ca3af' } } } }} />
                        ) : <p className="text-gray-500 text-sm">No user data yet</p>}
                    </div>
                </div>
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors">Weekly Activity</h3>
                    <div className="h-64">
                        {analytics?.recentActivity?.length > 0 ? (
                            <Bar data={activityData} options={{
                                responsive: true, maintainAspectRatio: false,
                                plugins: { legend: { labels: { color: '#9ca3af' } } },
                                scales: { x: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(75,85,99,0.2)' } }, y: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(75,85,99,0.2)' } } }
                            }} />
                        ) : <p className="text-gray-500 text-sm text-center mt-12">No activity data yet</p>}
                    </div>
                </div>
            </div>

            {/* Users table */}
            <div className="card">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 transition-colors">👥 All Users</h3>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="input-field py-2 px-3 text-sm w-48"
                        />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="input-field py-2 px-3 text-sm w-36"
                        >
                            <option value="all">All Levels</option>
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-600 dark:text-gray-500 border-b border-gray-200 dark:border-gray-800 transition-colors">
                                <th className="text-left py-3 px-3">Name</th>
                                <th className="text-left py-3 px-3">Email</th>
                                <th className="text-center py-3 px-3">Skill</th>
                                <th className="text-center py-3 px-3">Level</th>
                                <th className="text-center py-3 px-3">Lessons</th>
                                <th className="text-right py-3 px-3">Joined</th>
                                <th className="text-right py-3 px-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(u => (
                                <tr key={u._id} className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                    <td className="py-3 px-3 text-gray-800 dark:text-gray-200 font-medium">{u.name}</td>
                                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                                    <td className="text-center py-3 px-3">
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-tamil-400 to-ocean-400 font-bold">
                                            {u.skill_score}
                                        </span>
                                    </td>
                                    <td className="text-center py-3 px-3">
                                        <span className={`level-${u.level.toLowerCase()}`}>{u.level}</span>
                                    </td>
                                    <td className="text-center py-3 px-3 text-gray-400">{u.lessons_completed}</td>
                                    <td className="text-right py-3 px-3 text-gray-500 text-xs">
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="text-right py-3 px-3">
                                        <button
                                            onClick={() => openUserProgress(u)}
                                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr><td colSpan="7" className="text-center py-8 text-gray-500">No users found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-slide-up">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">User Progress</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedUser.name} ({selectedUser.email})</p>
                            </div>
                            <button onClick={closeUserProgress} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-3xl font-light leading-none">&times;</button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            {progressLoading && (
                                <div className="flex items-center justify-center min-h-[180px]">
                                    <div className="animate-spin h-10 w-10 border-4 border-tamil-500 border-t-transparent rounded-full" />
                                </div>
                            )}

                            {!progressLoading && progressError && (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 px-4 py-3 text-sm">
                                    {progressError}
                                </div>
                            )}

                            {!progressLoading && !progressError && userProgress && (
                                <>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <SummaryCard label="Attempts" value={progressSummary.attempts} color="text-ocean-400" />
                                        <SummaryCard label="Accuracy" value={`${progressSummary.accuracy}%`} color="text-emerald-400" />
                                        <SummaryCard label="Avg Time" value={`${progressSummary.avgTime}s`} color="text-amber-400" />
                                        <SummaryCard label="Avg Errors" value={progressSummary.avgErrors} color="text-red-400" />
                                    </div>

                                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-gray-600 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                                    <th className="text-left py-3 px-3">Question</th>
                                                    <th className="text-center py-3 px-3">Result</th>
                                                    <th className="text-center py-3 px-3">Time</th>
                                                    <th className="text-center py-3 px-3">Errors</th>
                                                    <th className="text-center py-3 px-3">Hints</th>
                                                    <th className="text-right py-3 px-3">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {progressAttempts.map(attempt => (
                                                    <tr key={attempt._id} className="border-b border-gray-200 dark:border-gray-800/50">
                                                        <td className="py-3 px-3 text-gray-800 dark:text-gray-300 max-w-xs truncate">
                                                            {attempt.lesson_id?.question || 'Lesson'}
                                                        </td>
                                                        <td className="text-center py-3 px-3">{attempt.score === 1 ? '✅' : '❌'}</td>
                                                        <td className="text-center py-3 px-3 text-gray-600 dark:text-gray-400">{attempt.time_spent}s</td>
                                                        <td className="text-center py-3 px-3 text-gray-600 dark:text-gray-400">{attempt.errors}</td>
                                                        <td className="text-center py-3 px-3 text-gray-600 dark:text-gray-400">{attempt.hints_used}</td>
                                                        <td className="text-right py-3 px-3 text-gray-500 text-xs">
                                                            {new Date(attempt.createdAt).toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {progressAttempts.length === 0 && (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-8 text-gray-500">
                                                            No attempts found for this user.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SummaryCard({ label, value, color }) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
        </div>
    );
}
