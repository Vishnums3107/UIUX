import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [demoToken, setDemoToken] = useState(''); // For local testing

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const res = await authAPI.forgotPassword({ email });
            setMessage(res.data.message);
            if (res.data.resetToken) {
                setDemoToken(res.data.resetToken);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send reset email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 animate-fade-in">
            <div className="card max-w-md w-full p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-tamil-500/5 dark:shadow-tamil-500/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-tamil-500 to-ocean-500"></div>

                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-tamil-600 to-ocean-600 dark:from-tamil-400 dark:to-ocean-400">
                        Forgot Password
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Enter your email to receive a password reset link.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm border border-red-100 dark:border-red-500/20 animate-slide-up flex items-center gap-2">
                        <span>⚠️</span> {error}
                    </div>
                )}

                {message && (
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl mb-6 text-sm border border-emerald-100 dark:border-emerald-500/20 animate-slide-up space-y-3">
                        <div className="flex items-center gap-2"><span>✅</span> {message}</div>
                        {demoToken && (
                            <div className="bg-white dark:bg-gray-900 p-3 rounded border border-emerald-200 dark:border-emerald-800 break-all text-xs font-mono select-all">
                                <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">Local Development Token:</p>
                                {demoToken}
                                <div className="mt-3">
                                    <Link to={`/resetpassword/${demoToken}`} className="text-tamil-600 dark:text-tamil-400 underline font-sans text-sm font-semibold">
                                        Test Reset Link →
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!message && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                placeholder="you@example.com"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full btn-primary py-3 flex justify-center items-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                                'Send Reset Link'
                            )}
                        </button>
                    </form>
                )}

                <div className="text-center mt-6">
                    <Link to="/login" className="text-sm font-medium text-tamil-600 dark:text-tamil-400 hover:text-ocean-600 dark:hover:text-ocean-400 transition-colors">
                        Remembered your password? Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
