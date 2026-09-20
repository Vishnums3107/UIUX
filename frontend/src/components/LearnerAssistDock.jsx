import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const HELP_TOPICS = [
    {
        id: 'adaptive-modes',
        title: 'Adaptive Modes',
        body: 'Use Support when accuracy is dropping, Flow for steady work, and Challenge when recall is stable.'
    },
    {
        id: 'review',
        title: 'Review Queue',
        body: 'Open review mode daily to clear due lessons and protect long-term memory retention.'
    },
    {
        id: 'focus',
        title: 'Focus Recovery',
        body: 'If hints and retries spike, run one short support block before moving back to challenge.'
    }
];

const SHORTCUTS = [
    { key: 'Ctrl + K', action: 'Open Command Center' },
    { key: '/', action: 'Open Command Center search' },
    { key: 'Esc', action: 'Close overlays and dialogs' }
];

const normalize = (value = '') => String(value).trim().toLowerCase();
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const buildAssistantReply = ({ query = '', user = {}, pathname = '' } = {}) => {
    const text = normalize(query);

    if (!text) {
        return {
            text: 'Share what you need help with and I will suggest the next best step.',
            action: null
        };
    }

    if (text.includes('review') || text.includes('due')) {
        return {
            text: 'The fastest recovery move is to clear your due review queue first, then run one short support block.',
            action: { label: 'Open Review Queue', path: '/learn?mode=review' }
        };
    }

    if (text.includes('stage') || text.includes('mastery')) {
        return {
            text: 'For stage progression, keep sessions short and accuracy-focused before attempting mastery tests.',
            action: { label: 'Open Learn', path: '/learn' }
        };
    }

    if (text.includes('focus') || text.includes('distract') || text.includes('stuck')) {
        return {
            text: 'Try a 10-15 minute support session with pronunciation audio on. Clean attempts matter more than speed.',
            action: { label: 'Start Support Session', path: '/learn?mode=review' }
        };
    }

    if (text.includes('dashboard') || text.includes('progress')) {
        return {
            text: 'Your dashboard shows adaptive profile, topic pressure, and director plans for your next sessions.',
            action: { label: 'Open Dashboard', path: '/dashboard' }
        };
    }

    if (text.includes('leaderboard') || text.includes('rank')) {
        return {
            text: 'Leaderboard is useful for motivation, but your adaptive confidence and recovery signals matter most.',
            action: { label: 'Open Leaderboard', path: '/leaderboard' }
        };
    }

    if (text.includes('help') || text.includes('how')) {
        return {
            text: 'Use the Help tab for practical learning tips and keyboard shortcuts. I can also launch the command center.',
            action: { label: 'Open Command Center', type: 'command_center' }
        };
    }

    return {
        text: `You are currently on ${pathname}. Keep sessions focused, and switch to Support mode if error load starts climbing.`,
        action: user ? { label: 'Open Command Center', type: 'command_center' } : null
    };
};

export default function LearnerAssistDock({ onOpenCommandCenter }) {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState('assistant');
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef(null);
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'assistant',
            text: 'I am your learner assistant. Ask for help, or use quick actions to keep momentum.'
        }
    ]);

    const quickActions = useMemo(() => ([
        { id: 'command', label: 'Open Command Center', run: () => onOpenCommandCenter?.() },
        { id: 'dashboard', label: 'Dashboard', run: () => navigate('/dashboard') },
        { id: 'learn', label: 'Start Learning', run: () => navigate('/learn') },
        { id: 'review', label: 'Review Queue', run: () => navigate('/learn?mode=review') },
        { id: 'theme', label: theme === 'dark' ? 'Light Theme' : 'Dark Theme', run: () => toggleTheme() }
    ]), [navigate, onOpenCommandCenter, theme, toggleTheme]);

    useEffect(() => {
        if (!open) return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setOpen(false);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open]);

    useEffect(() => {
        if (!open || !inputRef.current) return;
        inputRef.current.focus();
    }, [open, tab]);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (!user) return;

            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'h') {
                event.preventDefault();
                setOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [user]);

    if (!user) return null;

    const submit = async () => {
        const clean = query.trim();
        if (!clean || isLoading) return;

        const userMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: clean
        };

        setMessages((prev) => [...prev, userMessage]);
        setQuery('');
        setIsLoading(true);

        try {
            const history = messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.text }]
            }));
            history.push({ role: 'user', parts: [{ text: clean }] });

            const systemInstruction = `You are a helpful learner assistant for a Tamil language learning platform. 
The user's name is ${user?.name || 'Learner'}. They are currently on the page path: ${location.pathname}.
Keep your answers brief, encouraging, and focused on helping them learn Tamil or navigate the platform.
Do not use markdown formatting like bold/italics in your response. Keep it to plain text paragraphs.`;

            if (!GEMINI_API_KEY) {
                setMessages((prev) => [...prev, {
                    id: `assistant-${Date.now() + 1}`,
                    role: 'assistant',
                    ...buildAssistantReply({ query: clean, user, pathname: location.pathname })
                }]);
                return;
            }

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    contents: history,
                })
            });

            const data = await res.json();
            
            let replyText = "I'm having trouble connecting right now. Try again later!";
            if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
                replyText = data.candidates[0].content.parts[0].text;
            }

            const assistantMessage = {
                id: `assistant-${Date.now() + 1}`,
                role: 'assistant',
                text: replyText,
                action: null
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Gemini API Error:", error);
            setMessages((prev) => [...prev, {
                id: `assistant-${Date.now() + 1}`,
                role: 'assistant',
                text: "Sorry, I ran into a network issue connecting to the brain. Please try again.",
                action: null
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMessageAction = (action) => {
        if (!action) return;
        if (action.type === 'command_center') {
            onOpenCommandCenter?.();
            return;
        }

        if (action.path) {
            navigate(action.path);
            setOpen(false);
        }
    };

    return (
        <div className="fixed bottom-5 right-5 z-[65]">
            {open && (
                <div
                    id="learner-assist-panel"
                    role="dialog"
                    aria-label="Learner Assist Panel"
                    className="mb-3 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/20 bg-slate-950/92 p-3 shadow-2xl shadow-black/45 backdrop-blur-xl"
                >
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-sky-300">Learner Assist</p>
                            <p className="text-sm font-semibold text-gray-100">{user.name}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="rounded-lg border border-white/15 px-2 py-1 text-xs text-gray-300 hover:bg-white/10"
                        >
                            Close
                        </button>
                    </div>

                    <div className="mb-3 flex gap-2">
                        <button
                            type="button"
                            onClick={() => setTab('assistant')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'assistant' ? 'bg-sky-500/25 text-sky-100' : 'bg-white/5 text-gray-300'}`}
                        >
                            Assistant
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('help')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'help' ? 'bg-sky-500/25 text-sky-100' : 'bg-white/5 text-gray-300'}`}
                        >
                            Help
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('actions')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'actions' ? 'bg-sky-500/25 text-sky-100' : 'bg-white/5 text-gray-300'}`}
                        >
                            Quick Actions
                        </button>
                    </div>

                    {tab === 'assistant' && (
                        <div className="space-y-2">
                            <div className="max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/65 p-2 space-y-2">
                                {messages.slice(-8).map((message) => (
                                    <div
                                        key={message.id}
                                        className={`rounded-lg px-2 py-1.5 text-xs ${message.role === 'assistant'
                                            ? 'bg-sky-500/12 text-sky-100'
                                            : 'bg-white/8 text-gray-200'
                                        }`}
                                    >
                                        <p>{message.text}</p>
                                        {message.action && (
                                            <button
                                                type="button"
                                                onClick={() => handleMessageAction(message.action)}
                                                className="mt-1 text-[11px] font-semibold text-ocean-200 hover:text-ocean-100"
                                            >
                                                {message.action.label}
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="rounded-lg px-2 py-2 text-xs bg-sky-500/12 text-sky-100 flex items-center gap-1 w-fit">
                                        <span className="inline-block w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce" />
                                        <span className="inline-block w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                        <span className="inline-block w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            submit();
                                        }
                                    }}
                                    placeholder="Ask for study help..."
                                    className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-gray-100 outline-none placeholder:text-gray-500 focus:border-sky-400/60"
                                />
                                <button
                                    type="button"
                                    onClick={submit}
                                    disabled={isLoading}
                                    className={`rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 px-3 py-2 text-xs font-semibold text-white ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    )}

                    {tab === 'help' && (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                {HELP_TOPICS.map((topic) => (
                                    <div key={topic.id} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                                        <p className="text-xs font-semibold text-gray-100">{topic.title}</p>
                                        <p className="mt-1 text-xs text-gray-400">{topic.body}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                                <p className="text-xs font-semibold text-gray-100">Keyboard shortcuts</p>
                                <div className="mt-2 space-y-1.5">
                                    {SHORTCUTS.map((shortcut) => (
                                        <p key={shortcut.key} className="text-xs text-gray-400">
                                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-gray-200">{shortcut.key}</span>{' '}
                                            {shortcut.action}
                                        </p>
                                    ))}
                                </div>
                                <p className="mt-2 text-[11px] text-gray-500">Ctrl + Shift + H: Toggle Learner Assist from any page</p>
                            </div>
                        </div>
                    )}

                    {tab === 'actions' && (
                        <div className="grid grid-cols-1 gap-2">
                            {quickActions.map((action) => (
                                <button
                                    key={action.id}
                                    type="button"
                                    onClick={() => {
                                        action.run();
                                        if (action.id !== 'theme') {
                                            setOpen(false);
                                        }
                                    }}
                                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-semibold text-gray-100 hover:bg-white/10"
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-label="Toggle learner assistant"
                aria-controls="learner-assist-panel"
                aria-expanded={open}
                className={`group flex items-center gap-2 rounded-full border px-4 py-3 text-xs font-semibold shadow-xl transition-all ${
                    open
                        ? 'border-sky-200/70 bg-gradient-to-r from-sky-500 to-blue-500 text-white'
                        : 'border-white/25 bg-slate-900/85 text-sky-100 hover:border-sky-300/60'
                }`}
            >
                <span className={`h-2 w-2 rounded-full ${open ? 'bg-white' : 'bg-emerald-300'} group-hover:scale-110`} />
                {open ? 'Hide Learner Assist' : 'Learner Help'}
            </button>
        </div>
    );
}
