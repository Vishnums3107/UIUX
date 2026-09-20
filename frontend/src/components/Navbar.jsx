import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getAvatar } from '../utils/avatars';

export default function Navbar({ onOpenCommandCenter }) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        setMobileOpen(false);
        navigate('/login');
    };

    const navLink = (to, label, onNavigate) => (
        <Link
            to={to}
            onClick={onNavigate}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${location.pathname === to
                ? 'bg-tamil-500/20 text-tamil-600 dark:text-tamil-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
        >
            {label}
        </Link>
    );

    return (
        <nav className="sticky top-0 z-50 glass border-b border-gray-200 dark:border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between min-h-16 py-2">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tamil-500 to-ocean-500 flex items-center justify-center">
                            <span className="font-tamil text-white font-bold text-lg">த</span>
                        </div>
                        <div className="hidden sm:block">
                            <span className="block text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-tamil-400 to-ocean-400">
                                தமிழ் கற்போம்
                            </span>
                            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Language Intelligence Studio</span>
                        </div>
                    </Link>

                    <div className="flex items-center gap-2 md:hidden">
                        <button
                            onClick={onOpenCommandCenter}
                            className="rounded-lg border border-gray-300/80 px-3 py-2 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            title="Open command center"
                        >
                            CmdK
                        </button>
                        <button
                            onClick={() => setMobileOpen((prev) => !prev)}
                            className="rounded-lg border border-gray-300/80 p-2 text-gray-700 transition-all hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            aria-label="Toggle menu"
                        >
                            {mobileOpen ? 'X' : '≡'}
                        </button>
                    </div>

                    {/* Nav links */}
                    {user && (
                        <div className="hidden md:flex items-center gap-2">
                            {navLink('/dashboard', '📊 Dashboard')}
                            {navLink('/leaderboard', '🏆 Leaderboard')}
                            {navLink('/learn', '📚 Learn')}
                            {user.role === 'admin' && navLink('/admin', '⚙️ Admin')}

                            <button
                                onClick={onOpenCommandCenter}
                                className="rounded-lg border border-gray-300/80 bg-white/80 px-3 py-2 text-xs font-semibold text-gray-600 transition-all hover:border-ocean-400 hover:text-ocean-600 dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-300 dark:hover:border-ocean-500 dark:hover:text-ocean-300"
                                title="Open command center"
                            >
                                Ctrl+K
                            </button>

                            {/* User info */}
                            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-300 dark:border-gray-700">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm ${getAvatar(user.avatarId).bg}`}>
                                    {getAvatar(user.avatarId).icon}
                                </div>
                                <div className="text-right hidden lg:block">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{user.name}</p>
                                    <p className={`text-xs ${user.level === 'Beginner' ? 'text-emerald-400' :
                                        user.level === 'Intermediate' ? 'text-amber-400' : 'text-rose-400'
                                        }`}>
                                        {user.level} • Score: {user.skill_score}
                                    </p>
                                </div>
                                <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-xl" title="Toggle Theme">
                                    {theme === 'dark' ? '☀️' : '🌙'}
                                </button>
                                <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-3">
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {user && mobileOpen && (
                    <div className="md:hidden pb-4 animate-fade-in border-t border-gray-200 dark:border-gray-800">
                        <div className="grid grid-cols-2 gap-2 pt-4">
                            {navLink('/dashboard', '📊 Dashboard', () => setMobileOpen(false))}
                            {navLink('/leaderboard', '🏆 Leaderboard', () => setMobileOpen(false))}
                            {navLink('/learn', '📚 Learn', () => setMobileOpen(false))}
                            {user.role === 'admin' && navLink('/admin', '⚙️ Admin', () => setMobileOpen(false))}
                        </div>
                        <div className="mt-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white/70 p-3 dark:border-gray-700 dark:bg-gray-900/70">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm ${getAvatar(user.avatarId).bg}`}>
                                    {getAvatar(user.avatarId).icon}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{user.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.level} • Score: {user.skill_score}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-lg" title="Toggle Theme">
                                    {theme === 'dark' ? '☀️' : '🌙'}
                                </button>
                                <button onClick={handleLogout} className="btn-secondary text-xs py-2 px-3">
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
