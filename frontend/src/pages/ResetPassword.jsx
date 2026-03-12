import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function ResetPassword() {
    const { resettoken } = useParams();
    const navigate = useNavigate();
    const { updateUser } = useAuth(); // or login if we extract token logic

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password !== confirmPassword) {
            return setError('Passwords do not match.');
        }

        setLoading(true);

        try {
            const res = await authAPI.resetPassword(resettoken, { password });
            const { token, user: userData } = res.data;

            // Login user with new credentials
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));

            setMessage('Password reset successfully! Redirecting...');

            setTimeout(() => {
                // Force a page reload to contextually sync AuthProvider state, or navigate home
                window.location.href = '/dashboard';
            }, 1500);

        } catch (err) {
            setError(err.response?.data?.error || 'Invalid or expired token.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 animate-fade-in">
            <div className="card max-w-md w-full p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-ocean-500/5 dark:shadow-ocean-500/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ocean-500 to-emerald-500"></div>

                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-ocean-600 to-emerald-600 dark:from-ocean-400 dark:to-emerald-400">
                        Reset Password
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Enter your new password below.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm border border-red-100 dark:border-red-500/20 animate-slide-up flex items-center gap-2">
                        <span>⚠️</span> {error}
                    </div>
                )}

                {message && (
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl mb-6 text-sm border border-emerald-100 dark:border-emerald-500/20 animate-slide-up flex items-center gap-2">
                        <span>✅</span> {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            New Password
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field font-mono"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input-field font-mono"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !!message}
                        className={`w-full bg-gradient-to-r from-ocean-500 to-emerald-500 hover:from-ocean-600 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-ocean-500/25 active:scale-95 flex justify-center items-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                            'Set New Password'
                        )}
                    </button>
                </form>

                <div className="text-center mt-6">
                    <Link to="/login" className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
