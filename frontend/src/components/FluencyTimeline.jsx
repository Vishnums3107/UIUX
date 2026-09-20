import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const STAGE_META = [
    { stage: 1, en: 'Uyir Letters', ta: 'உயிர்', icon: '🔤' },
    { stage: 2, en: 'Mei Letters', ta: 'மெய்', icon: '🔡' },
    { stage: 3, en: 'Uyir-Mei Grid', ta: 'உயிர்மெய்', icon: '✏️' },
    { stage: 4, en: 'Numbers & Time', ta: 'எண்கள்', icon: '🔢' },
    { stage: 5, en: 'Core Words', ta: 'சொற்கள்', icon: '📖' },
    { stage: 6, en: 'Sentence Basics', ta: 'வாக்கியம்', icon: '💬' },
    { stage: 7, en: 'Dialogues', ta: 'உரையாடல்', icon: '🗣️' },
    { stage: 8, en: 'Reading', ta: 'படிப்பு', icon: '📚' },
    { stage: 9, en: 'Writing', ta: 'எழுத்து', icon: '📝' },
    { stage: 10, en: 'Fluency Test', ta: 'தேர்ச்சி', icon: '🏆' },
];

/**
 * FluencyTimeline — a cinematic horizontal stage progress track.
 *
 * @param {object[]} stageProgress — from lessonAPI.getStageProgress()
 * @param {number}   activeStage  — current active stage number
 */
export default function FluencyTimeline({ stageProgress = [], activeStage = 1 }) {
    const [animated, setAnimated] = useState(false);
    const [hoveredStage, setHoveredStage] = useState(null);
    const trackRef = useRef(null);

    useEffect(() => {
        // Trigger fill animation after mount
        const timer = setTimeout(() => setAnimated(true), 120);
        return () => clearTimeout(timer);
    }, []);

    const getStageData = (stageNum) => {
        const progress = stageProgress.find(s => s.stage === stageNum) || {};
        const total = progress.totalLessons || 0;
        const completed = progress.completedLessons || 0;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
            unlocked: progress.unlocked || stageNum === 1,
            masteryPassed: Boolean(progress.masteryPassed),
            percent,
            total,
            completed,
        };
    };

    // Compute overall fill: how far along we are among unlocked stages
    const unlockedCount = STAGE_META.filter(m => getStageData(m.stage).unlocked).length;
    const fillPercent = ((unlockedCount - 1) / (STAGE_META.length - 1)) * 100;

    const hovered = hoveredStage ? getStageData(hoveredStage) : null;
    const hoveredMeta = STAGE_META.find(m => m.stage === hoveredStage);

    return (
        <div className="relative">
            {/* Track container — horizontal scroll on mobile */}
            <div
                ref={trackRef}
                className="overflow-x-auto pb-4 select-none"
                style={{ scrollbarWidth: 'none' }}
            >
                <div className="relative min-w-[600px] px-6 pt-12 pb-4">
                    {/* Background track line */}
                    <div className="absolute left-6 right-6 top-[2.35rem] h-1 rounded-full bg-gray-800/80" />

                    {/* Animated fill line */}
                    <div
                        className="absolute left-6 top-[2.35rem] h-1 rounded-full origin-left transition-all"
                        style={{
                            width: animated ? `calc(${fillPercent}% * (100% - 48px) / 100)` : '0%',
                            background: 'linear-gradient(to right, #0ea5e9, #6366f1)',
                            transitionDuration: '1400ms',
                            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                            right: 'auto',
                            maxWidth: 'calc(100% - 48px)',
                        }}
                    />

                    {/* Stage nodes */}
                    <div className="relative flex items-start justify-between">
                        {STAGE_META.map((meta, index) => {
                            const data = getStageData(meta.stage);
                            const isActive = meta.stage === activeStage;
                            const isPast = data.masteryPassed;
                            const isUnlocked = data.unlocked;
                            const isLocked = !isUnlocked;

                            let nodeClass = '';
                            let glowClass = '';
                            if (isPast) {
                                nodeClass = 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/40';
                                glowClass = 'shadow-lg';
                            } else if (isActive) {
                                nodeClass = 'bg-sky-500 border-sky-300 text-white shadow-sky-500/50';
                                glowClass = 'shadow-lg shadow-sky-500/40';
                            } else if (isUnlocked) {
                                nodeClass = 'bg-gray-800 border-sky-500/50 text-sky-300';
                            } else {
                                nodeClass = 'bg-gray-900 border-gray-700 text-gray-600';
                            }

                            return (
                                <div
                                    key={meta.stage}
                                    className="flex flex-col items-center gap-2 w-[10%] relative"
                                    onMouseEnter={() => setHoveredStage(meta.stage)}
                                    onMouseLeave={() => setHoveredStage(null)}
                                >
                                    {/* Node */}
                                    {isUnlocked ? (
                                        <Link
                                            to={`/learn?stage=${meta.stage}`}
                                            className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 text-lg transition-all duration-300 hover:scale-110 ${nodeClass} ${glowClass}`}
                                            title={`Stage ${meta.stage}: ${meta.en}`}
                                        >
                                            {isPast ? '✓' : meta.icon}
                                            {/* Active beacon pulse */}
                                            {isActive && (
                                                <span className="absolute inset-0 rounded-full animate-ping bg-sky-400/30 pointer-events-none" />
                                            )}
                                        </Link>
                                    ) : (
                                        <div
                                            className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 text-lg opacity-40 cursor-not-allowed ${nodeClass}`}
                                        >
                                            🔒
                                        </div>
                                    )}

                                    {/* Stage number */}
                                    <span className={`text-[10px] font-bold ${isActive ? 'text-sky-300' : isPast ? 'text-emerald-400' : isLocked ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {meta.stage}
                                    </span>

                                    {/* Progress micro-bar */}
                                    {isUnlocked && !isPast && data.total > 0 && (
                                        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-sky-400/70 transition-all"
                                                style={{
                                                    width: animated ? `${data.percent}%` : '0%',
                                                    transitionDelay: `${300 + index * 80}ms`,
                                                    transitionDuration: '900ms',
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Hover tooltip */}
            {hoveredStage && hoveredMeta && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-gray-900/80 px-4 py-3 backdrop-blur-sm animate-fade-in">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{hoveredMeta.icon}</span>
                        <div className="flex-1">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Stage {hoveredStage}</p>
                            <p className="font-bold text-gray-100">{hoveredMeta.en}</p>
                            <p className="text-sm text-gray-400 font-tamil">{hoveredMeta.ta}</p>
                        </div>
                        <div className="text-right">
                            {hovered?.masteryPassed ? (
                                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">✓ Mastered</span>
                            ) : hovered?.unlocked ? (
                                <div>
                                    <p className="text-xl font-black text-sky-300">{hovered.percent}%</p>
                                    <p className="text-xs text-gray-500">{hovered.completed}/{hovered.total} done</p>
                                </div>
                            ) : (
                                <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-bold text-gray-500">🔒 Locked</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Mastered
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-500 inline-block animate-pulse" /> Active
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full border border-sky-500/50 bg-gray-800 inline-block" /> Unlocked
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-700 inline-block opacity-40" /> Locked
                </span>
            </div>
        </div>
    );
}
