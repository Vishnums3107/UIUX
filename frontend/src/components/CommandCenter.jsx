import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const isTypingTarget = (target) => {
    if (!target) return false;
    const tag = target.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
};

export default function CommandCenter({ isOpen, onClose }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const inputRef = useRef(null);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);

    const actions = useMemo(() => {
        if (!user) return [];

        const common = [
            { id: 'dashboard', label: 'Open Dashboard', hint: 'G D', run: () => navigate('/dashboard'), keywords: 'home progress overview' },
            { id: 'learn', label: 'Start Learning Session', hint: 'G L', run: () => navigate('/learn'), keywords: 'study lesson practice' },
            { id: 'review', label: 'Launch Review Queue', hint: 'R V', run: () => navigate('/learn?mode=review'), keywords: 'spaced repetition due practice' },
            { id: 'leaderboard', label: 'View Leaderboard', hint: 'G B', run: () => navigate('/leaderboard'), keywords: 'ranking score competition' },
            {
                id: 'theme',
                label: theme === 'dark' ? 'Switch To Light Theme' : 'Switch To Dark Theme',
                hint: 'T H',
                run: () => toggleTheme(),
                keywords: 'color mode appearance'
            },
            { id: 'logout', label: 'Log Out Securely', hint: 'L O', run: () => { logout(); navigate('/login'); }, keywords: 'exit signout account' }
        ];

        if (user.role === 'admin') {
            common.push({
                id: 'admin',
                label: 'Open Admin Console',
                hint: 'A D',
                run: () => navigate('/admin'),
                keywords: 'manage lessons users moderation'
            });
        }

        return common;
    }, [navigate, logout, theme, toggleTheme, user]);

    const filtered = useMemo(() => {
        const token = query.trim().toLowerCase();
        if (!token) return actions;
        return actions.filter((item) => (`${item.label} ${item.keywords}`).toLowerCase().includes(token));
    }, [actions, query]);

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setActiveIndex(0);
            return;
        }

        const timer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 10);

        return () => window.clearTimeout(timer);
    }, [isOpen]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            if (isTypingTarget(event.target) && event.key === '/' && !event.metaKey && !event.ctrlKey) {
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
            }

            if (event.key === 'Enter' && filtered[activeIndex]) {
                event.preventDefault();
                filtered[activeIndex].run();
                onClose();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [activeIndex, filtered, isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        onClose();
    }, [location.pathname]);

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 sm:p-8">
            <button
                type="button"
                className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
                aria-label="Close command center"
                onClick={onClose}
            />

            <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-white/25 bg-white/85 shadow-2xl shadow-black/20 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90">
                <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-800/80">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search commands, pages, and actions..."
                        className="w-full rounded-xl border border-slate-300/80 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition-all placeholder:text-slate-400 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-500/20 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
                    />
                </div>

                <div className="max-h-[55vh] overflow-y-auto p-2">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                            No matching commands. Try terms like "review", "dashboard", or "theme".
                        </div>
                    ) : (
                        filtered.map((item, index) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    item.run();
                                    onClose();
                                }}
                                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-all ${
                                    index === activeIndex
                                        ? 'bg-gradient-to-r from-tamil-500/20 to-ocean-500/20 text-slate-900 dark:text-slate-50'
                                        : 'text-slate-700 hover:bg-slate-100/70 dark:text-slate-200 dark:hover:bg-slate-800/60'
                                }`}
                            >
                                <span className="font-medium">{item.label}</span>
                                <span className="rounded-lg border border-slate-300/90 bg-white/80 px-2 py-1 text-[11px] tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                                    {item.hint}
                                </span>
                            </button>
                        ))
                    )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/80 px-4 py-2 text-xs text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
                    <span>Use ↑ ↓ to navigate, Enter to run</span>
                    <span>Esc to close</span>
                </div>
            </div>
        </div>
    );
}