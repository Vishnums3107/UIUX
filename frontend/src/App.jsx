import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import CommandCenter from './components/CommandCenter';
import LearnerAssistDock from './components/LearnerAssistDock';
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
    const location = useLocation();
    const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);

    useEffect(() => {
        const isTypingTarget = (target) => {
            if (!target) return false;
            const tag = target.tagName?.toLowerCase();
            return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
        };

        const onKeyDown = (event) => {
            if (!user) return;

            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setIsCommandCenterOpen((prev) => !prev);
            }

            if (event.key === '/' && !event.metaKey && !event.ctrlKey && !isTypingTarget(event.target)) {
                event.preventDefault();
                setIsCommandCenterOpen(true);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [user]);

    return (
        <div className="app-shell min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {/* Background decoration */}
            <div className="ambient-grid fixed inset-0 pointer-events-none overflow-hidden">
                <div className="ambient-glow ambient-glow-a" />
                <div className="ambient-glow ambient-glow-b" />
                <div className="ambient-glow ambient-glow-c" />
            </div>

            <div className="relative z-10">
                {user && <Navbar onOpenCommandCenter={() => setIsCommandCenterOpen(true)} />}
                <main key={`${location.pathname}${location.search}`} className="pb-12 route-transition-stage">
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

            <CommandCenter
                isOpen={isCommandCenterOpen}
                onClose={() => setIsCommandCenterOpen(false)}
            />
            <LearnerAssistDock onOpenCommandCenter={() => setIsCommandCenterOpen(true)} />
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
