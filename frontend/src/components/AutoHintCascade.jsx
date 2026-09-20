import { useCallback, useEffect, useRef, useState } from 'react';
import useTamilSpeech from '../hooks/useTamilSpeech';

/**
 * AutoHintCascade — Intelligent progressive hint system.
 *
 * Watches for struggle signals (idle time, wrong answers) and reveals
 * hints in escalating stages WITHOUT the learner needing to ask:
 *
 *   Stage 0: Nothing (learner is fine)
 *   Stage 1: Transliteration shimmer (subtle text glow)
 *   Stage 2: Auto-plays Tamil pronunciation audio
 *   Stage 3: Full hint text revealed with pulse animation
 *
 * Timing adapts based on difficulty level:
 *   Beginner:     fast cascade (5s → 10s → 15s)
 *   Intermediate:  medium       (8s → 16s → 24s)
 *   Advanced:      slow/minimal (15s → 30s → never auto)
 */

const TIMINGS = {
    Beginner:     { stage1: 5000,  stage2: 10000, stage3: 15000 },
    Intermediate: { stage1: 8000,  stage2: 16000, stage3: 24000 },
    Advanced:     { stage1: 15000, stage2: 30000, stage3: null },
};

export default function AutoHintCascade({
    lesson,
    level = 'Intermediate',
    wrongAttempts = 0,
    onHintUsed,
    isSubmitting = false,
}) {
    const [cascadeStage, setCascadeStage] = useState(0);
    const [dismissed, setDismissed] = useState(false);
    const startTimeRef = useRef(Date.now());
    const timerRef = useRef(null);
    const { speak, isSpeaking } = useTamilSpeech();

    const transliteration = lesson?.transliteration || '';
    const tamilScript = lesson?.tamilScript || '';
    const hint = lesson?.hint || '';
    const explanation = lesson?.explanation || '';

    const timings = TIMINGS[level] || TIMINGS.Intermediate;

    // Reset on lesson change
    useEffect(() => {
        setCascadeStage(0);
        setDismissed(false);
        startTimeRef.current = Date.now();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [lesson?._id]);

    // Wrong attempts accelerate cascade
    useEffect(() => {
        if (wrongAttempts >= 3 && cascadeStage < 3) {
            setCascadeStage(3);
            onHintUsed?.();
        } else if (wrongAttempts >= 2 && cascadeStage < 2) {
            setCascadeStage(2);
        } else if (wrongAttempts >= 1 && cascadeStage < 1) {
            setCascadeStage(1);
        }
    }, [wrongAttempts, cascadeStage, onHintUsed]);

    // Time-based cascade
    useEffect(() => {
        if (isSubmitting || dismissed) return;

        timerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;

            if (timings.stage3 && elapsed >= timings.stage3 && cascadeStage < 3) {
                setCascadeStage(3);
                onHintUsed?.();
            } else if (elapsed >= timings.stage2 && cascadeStage < 2) {
                setCascadeStage(2);
            } else if (elapsed >= timings.stage1 && cascadeStage < 1) {
                setCascadeStage(1);
            }
        }, 1000);

        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [cascadeStage, timings, isSubmitting, dismissed, onHintUsed]);

    // Auto-play audio at stage 2
    const hasPlayedRef = useRef(false);
    useEffect(() => {
        if (cascadeStage >= 2 && tamilScript && !hasPlayedRef.current) {
            hasPlayedRef.current = true;
            speak(tamilScript, 0.8, 1, transliteration);
        }
    }, [cascadeStage, tamilScript, transliteration, speak]);

    const handleReplay = useCallback(() => {
        if (tamilScript) speak(tamilScript, 0.8, 1, transliteration);
    }, [tamilScript, transliteration, speak]);

    if (cascadeStage === 0 || dismissed) return null;

    return (
        <div className="mt-4 space-y-2 animate-fade-in">
            {/* Stage 1: Transliteration shimmer */}
            {cascadeStage >= 1 && transliteration && (
                <div className="flex items-center gap-2 rounded-xl border border-sky-400/25 bg-sky-500/8 px-3 py-2 animate-fade-in">
                    <span className="text-sky-300 text-xs font-bold uppercase tracking-wider">Pronunciation</span>
                    <span className="text-sky-100 text-sm font-tamil italic tracking-wide">
                        {transliteration}
                    </span>
                </div>
            )}

            {/* Stage 2: Audio auto-played + replay button */}
            {cascadeStage >= 2 && tamilScript && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/8 px-3 py-2 animate-fade-in">
                    <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">Listen</span>
                    <span className="text-amber-100 text-lg font-tamil font-bold">{tamilScript}</span>
                    <button
                        type="button"
                        onClick={handleReplay}
                        className="ml-auto rounded-lg border border-amber-400/30 bg-amber-500/15 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/25 transition-colors"
                    >
                        {isSpeaking ? '🔊 Playing...' : '🔈 Replay'}
                    </button>
                </div>
            )}

            {/* Stage 3: Full hint revealed */}
            {cascadeStage >= 3 && (hint || explanation) && (
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">💡 Hint</span>
                        <button
                            type="button"
                            onClick={() => setDismissed(true)}
                            className="text-xs text-gray-500 hover:text-gray-300"
                        >
                            dismiss
                        </button>
                    </div>
                    <p className="mt-1 text-sm text-emerald-100">{hint || explanation}</p>
                </div>
            )}

            {/* Cascade progress indicator */}
            <div className="flex items-center gap-1.5 px-1">
                {[1, 2, 3].map((s) => (
                    <div
                        key={s}
                        className={`h-1 rounded-full transition-all duration-500 ${
                            cascadeStage >= s
                                ? s === 1 ? 'w-8 bg-sky-400' : s === 2 ? 'w-8 bg-amber-400' : 'w-8 bg-emerald-400'
                                : 'w-4 bg-gray-700'
                        }`}
                    />
                ))}
                <span className="ml-1 text-[10px] text-gray-600">
                    {cascadeStage === 1 ? 'pronunciation cue' : cascadeStage === 2 ? 'audio assist' : 'full hint'}
                </span>
            </div>
        </div>
    );
}
