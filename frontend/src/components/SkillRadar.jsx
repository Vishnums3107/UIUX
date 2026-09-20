import { useEffect, useRef } from 'react';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const CATEGORY_DISPLAY = [
    { key: 'uyir', label: 'Uyir', ta: 'உயிர்' },
    { key: 'mei', label: 'Mei', ta: 'மெய்' },
    { key: 'uyir-mei', label: 'Uyir-Mei', ta: 'உயிர்மெய்' },
    { key: 'grammar', label: 'Grammar', ta: 'இலக்கணம்' },
    { key: 'sentences', label: 'Sentences', ta: 'வாக்கியம்' },
];

/**
 * SkillRadar — animated radar chart showing per-category mastery vs target.
 *
 * @param {object[]} attempts  - recent lesson attempt records with lesson_id.category and score
 * @param {string}   userLevel - 'Beginner' | 'Intermediate' | 'Advanced'
 */
export default function SkillRadar({ attempts = [], userLevel = 'Intermediate' }) {
    const chartRef = useRef(null);

    // Compute per-category accuracy from real attempt data
    const categoryAccuracy = CATEGORY_DISPLAY.map(({ key }) => {
        const catAttempts = attempts.filter(a => a.lesson_id?.category === key);
        if (catAttempts.length === 0) return 0;
        const correct = catAttempts.filter(a => a.score === 1).length;
        return Math.round((correct / catAttempts.length) * 100);
    });

    // Target based on level
    const targetScore = userLevel === 'Advanced' ? 90 : userLevel === 'Beginner' ? 60 : 75;
    const targetData = CATEGORY_DISPLAY.map(() => targetScore);

    const hasAnyData = categoryAccuracy.some(v => v > 0);

    const data = {
        labels: CATEGORY_DISPLAY.map(c => `${c.label}\n${c.ta}`),
        datasets: [
            {
                label: 'Your Mastery',
                data: hasAnyData ? categoryAccuracy : CATEGORY_DISPLAY.map(() => 0),
                backgroundColor: 'rgba(14, 165, 233, 0.18)',
                borderColor: 'rgba(14, 165, 233, 0.85)',
                borderWidth: 2.5,
                pointBackgroundColor: 'rgba(14, 165, 233, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
            },
            {
                label: 'Fluency Target',
                data: targetData,
                backgroundColor: 'rgba(139, 92, 246, 0.06)',
                borderColor: 'rgba(139, 92, 246, 0.45)',
                borderWidth: 1.5,
                borderDash: [5, 4],
                pointBackgroundColor: 'rgba(139, 92, 246, 0.6)',
                pointBorderColor: '#fff',
                pointBorderWidth: 1,
                pointRadius: 3,
                fill: true,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: true,
        animation: {
            duration: 1100,
            easing: 'easeOutQuart',
        },
        scales: {
            r: {
                min: 0,
                max: 100,
                beginAtZero: true,
                ticks: {
                    display: false,
                    stepSize: 25,
                },
                grid: {
                    color: 'rgba(148, 163, 184, 0.12)',
                    circular: true,
                },
                pointLabels: {
                    color: '#94a3b8',
                    font: { size: 11, family: 'Sora, sans-serif', weight: '600' },
                    padding: 12,
                },
                angleLines: {
                    color: 'rgba(148, 163, 184, 0.1)',
                },
            },
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: '#94a3b8',
                    font: { size: 11 },
                    boxWidth: 12,
                    padding: 16,
                    usePointStyle: true,
                },
            },
            tooltip: {
                backgroundColor: '#0f172a',
                borderColor: 'rgba(14,165,233,0.25)',
                borderWidth: 1,
                titleColor: '#e2e8f0',
                bodyColor: '#94a3b8',
                callbacks: {
                    label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.r}%`,
                    title: items => items[0].label.replace('\n', ' '),
                },
            },
        },
    };

    return (
        <div className="relative">
            {/* Glow behind chart */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />
            </div>

            {!hasAnyData && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                    <p className="text-xs text-gray-500 bg-gray-900/80 px-3 py-1 rounded-full backdrop-blur-sm">
                        Complete lessons to unlock your skill radar
                    </p>
                </div>
            )}

            <Radar ref={chartRef} data={data} options={options} />

            {/* Category quick stats below chart */}
            {hasAnyData && (
                <div className="mt-3 grid grid-cols-5 gap-1 text-center">
                    {CATEGORY_DISPLAY.map((cat, i) => (
                        <div key={cat.key} className="flex flex-col items-center gap-0.5">
                            <span
                                className="text-[10px] font-bold"
                                style={{
                                    color: categoryAccuracy[i] >= 75
                                        ? '#34d399'
                                        : categoryAccuracy[i] >= 50
                                            ? '#fbbf24'
                                            : '#f87171'
                                }}
                            >
                                {categoryAccuracy[i]}%
                            </span>
                            <span className="text-[9px] text-gray-500 truncate w-full">{cat.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
