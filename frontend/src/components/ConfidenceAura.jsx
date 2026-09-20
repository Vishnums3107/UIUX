import { useMemo } from 'react';

/**
 * ConfidenceAura — Live pulsing ring + stats overlay that morphs in real-time
 * based on rolling session performance. Wraps lesson content.
 *
 * Band thresholds:
 *   fire     ≥ 85%  (gold/amber glow, fast pulse)
 *   momentum ≥ 65%  (emerald glow, medium pulse)
 *   steady   ≥ 40%  (ocean/blue glow, calm pulse)
 *   struggle < 40%  (rose glow, slow breathe)
 */

const BANDS = [
    { id: 'fire',     min: 85, color: 'amber',   emoji: '🔥', label: 'On Fire' },
    { id: 'momentum', min: 65, color: 'emerald',  emoji: '🚀', label: 'Momentum' },
    { id: 'steady',   min: 40, color: 'ocean',    emoji: '🧘', label: 'Steady' },
    { id: 'struggle', min: 0,  color: 'rose',     emoji: '💪', label: 'Building' },
];

const GLOW_MAP = {
    fire:     { border: 'border-amber-400/50',  shadow: 'shadow-[0_0_40px_rgba(245,158,11,0.35)]', bg: 'from-amber-500/18 via-orange-500/10 to-transparent',  ring: 'bg-amber-400',   text: 'text-amber-200',  pulse: 'animate-pulse' },
    momentum: { border: 'border-emerald-400/45', shadow: 'shadow-[0_0_35px_rgba(52,211,153,0.3)]',  bg: 'from-emerald-500/15 via-teal-500/8 to-transparent',   ring: 'bg-emerald-400', text: 'text-emerald-200', pulse: 'animate-pulse' },
    steady:   { border: 'border-sky-400/35',     shadow: 'shadow-[0_0_28px_rgba(56,189,248,0.25)]', bg: 'from-sky-500/12 via-ocean-500/8 to-transparent',      ring: 'bg-sky-400',     text: 'text-sky-200',    pulse: '' },
    struggle: { border: 'border-rose-400/40',    shadow: 'shadow-[0_0_32px_rgba(251,113,133,0.28)]',bg: 'from-rose-500/14 via-pink-500/8 to-transparent',      ring: 'bg-rose-400',    text: 'text-rose-200',   pulse: '' },
};

export function useConfidenceBand(sessionResults = []) {
    return useMemo(() => {
        const total = sessionResults.length;
        if (total === 0) return { band: BANDS[2], glow: GLOW_MAP.steady, accuracy: 0, streak: 0, total: 0 };

        const correct = sessionResults.filter(r => r.isCorrect).length;
        const accuracy = Math.round((correct / total) * 100);

        // Calculate current streak
        let streak = 0;
        for (let i = sessionResults.length - 1; i >= 0; i--) {
            if (sessionResults[i].isCorrect) streak++;
            else break;
        }

        const band = BANDS.find(b => accuracy >= b.min) || BANDS[3];
        const glow = GLOW_MAP[band.id];

        return { band, glow, accuracy, streak, total, correct };
    }, [sessionResults]);
}

export default function ConfidenceAura({ sessionResults = [], children }) {
    const { band, glow, accuracy, streak, total } = useConfidenceBand(sessionResults);

    if (total === 0) return <>{children}</>;

    return (
        <div className="relative">
            {/* Pulsing aura ring */}
            <div
                className={`absolute -inset-1 rounded-3xl opacity-60 blur-sm transition-all duration-700 ${glow.ring} ${glow.pulse}`}
                style={{ opacity: total > 0 ? 0.15 + (accuracy / 500) : 0 }}
            />

            {/* Live confidence badge — floats top-right */}
            <div className={`absolute -top-3 -right-3 z-10 flex items-center gap-1.5 rounded-full border ${glow.border} bg-gray-950/90 backdrop-blur-sm px-3 py-1.5 shadow-lg transition-all duration-500`}>
                <span className="text-sm">{band.emoji}</span>
                <span className={`text-xs font-bold ${glow.text}`}>{accuracy}%</span>
                {streak >= 3 && (
                    <span className="text-[10px] font-bold text-amber-300 animate-bounce">🔥{streak}</span>
                )}
            </div>

            {/* Confidence micro-bar under badge */}
            <div className="absolute -top-1 left-4 right-16 z-10 h-[3px] rounded-full bg-gray-800/60 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                        band.id === 'fire' ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                            : band.id === 'momentum' ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : band.id === 'steady' ? 'bg-gradient-to-r from-sky-500 to-blue-400'
                                    : 'bg-gradient-to-r from-rose-500 to-pink-400'
                    }`}
                    style={{ width: `${accuracy}%` }}
                />
            </div>

            {/* Wrapped content with morphing border */}
            <div className={`relative rounded-3xl border ${glow.border} ${glow.shadow} bg-gradient-to-br ${glow.bg} p-1 transition-all duration-700`}>
                {children}
            </div>
        </div>
    );
}
