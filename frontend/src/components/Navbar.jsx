import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getAvatar } from '../utils/avatars';

export default function Navbar() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navLink = (to, label) => (
        <Link
            to={to}
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
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tamil-500 to-ocean-500 flex items-center justify-center">
                            <span className="font-tamil text-white font-bold text-lg">த</span>
                        </div>
                        <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-tamil-400 to-ocean-400 hidden sm:block">
                            தமிழ் கற்போம்
                        </span>
                    </Link>

                    {/* Nav links */}
                    {user && (
                        <div className="flex items-center gap-2">
                            {navLink('/dashboard', '📊 Dashboard')}
                            {navLink('/leaderboard', '🏆 Leaderboard')}
                            {navLink('/learn', '📚 Learn')}
                            {user.role === 'admin' && navLink('/admin', '⚙️ Admin')}

                            {/* User info */}
                            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-300 dark:border-gray-700">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm ${getAvatar(user.avatarId).bg}`}>
                                    {getAvatar(user.avatarId).icon}
                                </div>
                                <div className="text-right hidden sm:block">
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
            </div>
        </nav>
    );
}
