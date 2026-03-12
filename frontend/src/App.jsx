import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Learn from './pages/Learn';
import AdminPanel from './pages/AdminPanel';
import AdminLessons from './pages/AdminLessons';
import Leaderboard from './pages/Leaderboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin h-10 w-10 border-4 border-tamil-500 border-t-transparent rounded-full" />
        </div>
    );
    return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    return user?.role === 'admin' ? children : <Navigate to="/dashboard" />;
}

function PublicRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    return !user ? children : <Navigate to="/dashboard" />;
}

function AppContent() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {/* Background decoration */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-tamil-500/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-ocean-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
                {user && <Navbar />}
                <main className="pb-12">
                    <Routes>
                        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                        <Route path="/forgotpassword" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
                        <Route path="/resetpassword/:resettoken" element={<PublicRoute><ResetPassword /></PublicRoute>} />
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
                        <Route path="/learn" element={<ProtectedRoute><Learn /></ProtectedRoute>} />
                        <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminPanel /></AdminRoute></ProtectedRoute>} />
                        <Route path="/admin/lessons" element={<ProtectedRoute><AdminRoute><AdminLessons /></AdminRoute></ProtectedRoute>} />
                        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <Router>
            <ThemeProvider>
                <AuthProvider>
                    <AppContent />
                </AuthProvider>
            </ThemeProvider>
        </Router>
    );
}
