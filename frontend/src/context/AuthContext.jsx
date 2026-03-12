import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load user from localStorage on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch { /* ignore parse errors */ }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const res = await authAPI.login({ email, password });
        const { token, user: userData } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    const register = async (name, email, password) => {
        const res = await authAPI.register({ name, email, password });
        const { token, user: userData } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const updateUser = (updates) => {
        setUser(prevUser => {
            const updated = { ...(prevUser || {}), ...updates };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
    };

    const refreshProfile = async () => {
        try {
            const res = await authAPI.getProfile();
            const userData = res.data;
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
        } catch {
            // If refresh fails, keep current user data
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
