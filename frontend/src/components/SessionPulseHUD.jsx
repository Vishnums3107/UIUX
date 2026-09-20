import { useEffect, useRef, useState } from 'react';

const MODE_CONFIG = {
    support: {
        label: 'Support',
        color: 'text-emerald-300',
        border: 'border-emerald-500/40',
        bg: 'bg-emerald-500/10',
        dot: 'bg-emerald-400',
        glow: 'shadow-emerald-500/20',
    },
    balanced: {
        label: 'Flow',
        color: 'text-sky-300',
        border: 'border-sky-500/40',
        bg: 'bg-sky-500/10',
        dot: 'bg-sky-400',
        glow: 'shadow-sky-500/20',
    },
    challenge: {
        label: 'Challenge',
        color: 'text-rose-300',
        border: 'border-rose-500/40',
        bg: 'bg-rose-500/10',
        dot: 'bg-rose-400',
        glow: 'shadow-rose-500/20',
    },
};

/**
 * SessionPulseHUD — a floating real-time session performance overlay.
 *
 * @param {object[]} sessionResults     — array of { isCorrect, lesson, metrics }
 * @param {number}   sessionAccuracy    — 0-100
 * @param {string}   adaptiveMode       — 'support' | 'balanced' | 'challenge'
 * @param {number}   focusScore         — 0-100
 * @param {number}   sessionEtaMinutes  — estimated minutes remaining
 * @param {boolean}  visible            — whether session is active
 */
export default function SessionPulseHUD({
    sessionResults = [],
    sessionAccuracy = 0,
    adaptiveMode = 'balanced',
    focusScore = 70,
    sessionEtaMinutes = 5,
    visible = false,
}) {
    const [collapsed, setCollapsed] = useState(false);
    const [displayedAccuracy, setDisplayedAccuracy] = useState(0);
    const [displayedFocus, setDisplayedFocus] = useState(0);
    const animFrameRef = useRef(null);

    // Smooth counter animation for accuracy
    useEffect(() => {
        if (!visible) return;
        const target = sessionAccuracy;
        const start = displayedAccuracy;
        const duration = 600;
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplayedAccuracy(Math.round(start + (target - start) * eased));
            if (t < 1) animFrameRef.current = requestAnimationFrame(animate);
        };

        animFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [sessionAccuracy, visible]);

    // Smooth counter for focus
    useEffect(() => {
        if (!visible) return;
        const target = focusScore;
        const start = displayedFocus;
        const duration = 500;
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplayedFocus(Math.round(start + (target - start) * eased));
            if (t < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }, [focusScore, visible]);

    if (!visible) return null;

    const mode = MODE_CONFIG[adaptiveMode] || MODE_CONFIG.balanced;
    const recent8 = sessionResults.slice(-8);
    const answeredCount = sessionResults.length;

    // Circular arc math (SVG)
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const arcOffset = circumference - (displayedAccuracy / 100) * circumference;

    return (
        <div
            className={`fixed bottom-20 right-4 z-30 transition-all duration-300 ${collapsed ? 'w-14' : 'w-52'}`}
            style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.45))' }}
        >
            <div
                className={`rounded-2xl border backdrop-blur-xl ${mode.border} ${mode.bg} shadow-lg ${mode.glow}`}
                style={{ background: 'rgba(9,18,36,0.88)' }}
            >
                {/* Header bar */}
                <button
                    type="button"
                    onClick={() => setCollapsed(p => !p)}
                    className="flex w-full items-center justify-between px-3 py-2 rounded-t-2xl"
                >
                    <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full animate-pulse ${mode.dot}`} />
                        {!collapsed && (
                            <span className={`text-xs font-bold uppercase tracking-wider ${mode.color}`}>
                                Live · {mode.label}
                            </span>
                        )}
                    </div>
                    {!collapsed && (
                        <span className="text-gray-500 text-xs">—</span>
                    )}
                </button>

                {!collapsed && (
                    <div className="px-3 pb-3 space-y-3">
                        {/* Circular accuracy arc */}
                        <div className="flex items-center justify-between gap-3">
                            <svg width="56" height="56" viewBox="0 0 56 56" className="flex-shrink-0">
                                {/* Background ring */}
                                <circle
                                    cx="28" cy="28" r={radius}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.06)"
                                    strokeWidth="5"
                                />
                                {/* Progress arc */}
                                <circle
                                    cx="28" cy="28" r={radius}
                                    fill="none"
                                    stroke={
                                        displayedAccuracy >= 75 ? '#34d399'
                                            : displayedAccuracy >= 50 ? '#fbbf24'
                                                : '#f87171'
                                    }
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={arcOffset}
                                    transform="rotate(-90 28 28)"
                                    style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                                />
                                <text x="28" y="32" textAnchor="middle" className="fill-white font-bold" fontSize="11" fontFamily="Sora, sans-serif">
                                    {displayedAccuracy}%
                                </text>
                            </svg>

                            <div className="flex-1 space-y-2">
                                {/* Focus bar */}
                                <div>
                                    <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                        <span>Focus</span>
                                        <span>{displayedFocus}</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${displayedFocus}%`,
                                                background: displayedFocus >= 70
                                                    ? 'linear-gradient(to right, #34d399, #0ea5e9)'
                                                    : 'linear-gradient(to right, #fbbf24, #f87171)',
                                                transitionDuration: '500ms',
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-1 text-center">
                                    <div className="rounded-lg bg-white/5 px-1 py-1">
                                        <p className="text-[9px] text-gray-500 uppercase">Done</p>
                                        <p className="text-xs font-bold text-gray-200">{answeredCount}</p>
                                    </div>
                                    <div className="rounded-lg bg-white/5 px-1 py-1">
                                        <p className="text-[9px] text-gray-500 uppercase">ETA</p>
                                        <p className="text-xs font-bold text-gray-200">~{sessionEtaMinutes}m</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sparkline — last 8 answers */}
                        {recent8.length > 0 && (
                            <div>
                                <p className="text-[9px] uppercase tracking-wider text-gray-600 mb-1">Recent answers</p>
                                <div className="flex gap-1">
                                    {recent8.map((r, i) => (
                                        <div
                                            key={i}
                                            className={`flex-1 h-5 rounded flex items-center justify-center text-[9px] transition-all ${r.isCorrect
                                                ? 'bg-emerald-500/20 text-emerald-300'
                                                : 'bg-rose-500/20 text-rose-300'
                                            }`}
                                            style={{
                                                opacity: 0.4 + (i / recent8.length) * 0.6,
                                            }}
                                        >
                                            {r.isCorrect ? '✓' : '✗'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
