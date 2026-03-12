import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md animate-fade-in">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-tamil-500 to-ocean-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-tamil-500/30">
                        <span className="font-tamil text-white font-bold text-3xl">த</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-100">Welcome Back</h1>
                    <p className="text-gray-400 mt-2">Sign in to continue learning Tamil</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="card space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm animate-scale-in">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field"
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field"
                            placeholder="••••••••"
                            required
                        />
                        <div className="text-right mt-2">
                            <Link to="/forgotpassword" className="text-sm font-medium text-tamil-500 hover:text-tamil-400 transition-colors">
                                Forgot password?
                            </Link>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary w-full">
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                Signing in...
                            </span>
                        ) : 'Sign In'}
                    </button>

                    <p className="text-center text-gray-500 text-sm">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-tamil-400 hover:text-tamil-300 font-medium">
                            Sign up
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
