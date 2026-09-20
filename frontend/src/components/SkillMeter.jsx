import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Animated circular skill meter with gradient arc
 */
export default function SkillMeter({ score = 0, size = 180, strokeWidth = 12 }) {
    const canvasRef = useRef(null);
    const animRef = useRef(null);
    const currentRef = useRef(0);
    const { theme } = useTheme();

    const isDark = theme === 'dark';

    const level = score <= 30 ? 'Beginner' : score <= 70 ? 'Intermediate' : 'Advanced';
    const levelColor = score <= 30 ? '#38bdf8' : score <= 70 ? '#2563eb' : '#1d4ed8';

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        const center = size / 2;
        const radius = center - strokeWidth;
        const startAngle = -Math.PI * 0.75;
        const totalArc = Math.PI * 1.5;

        const animate = () => {
            // Smooth animation toward target
            currentRef.current += (score - currentRef.current) * 0.06;
            if (Math.abs(currentRef.current - score) < 0.5) currentRef.current = score;

            ctx.clearRect(0, 0, size, size);

            // Background arc
            ctx.beginPath();
            ctx.arc(center, center, radius, startAngle, startAngle + totalArc);
            ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Active arc with gradient
            const endAngle = startAngle + (totalArc * currentRef.current / 100);
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#60a5fa');
            gradient.addColorStop(0.5, '#0ea5e9');
            gradient.addColorStop(1, levelColor);

            ctx.beginPath();
            ctx.arc(center, center, radius, startAngle, endAngle);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Center text - Score
            ctx.fillStyle = isDark ? '#f3f4f6' : '#111827';
            ctx.font = `bold ${size * 0.22}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(Math.round(currentRef.current), center, center - 8);

            // Label
            ctx.fillStyle = isDark ? 'rgba(156,163,175,0.8)' : '#4b5563';
            ctx.font = `500 ${size * 0.08}px Inter, sans-serif`;
            ctx.fillText('SKILL SCORE', center, center + size * 0.15);

            if (currentRef.current !== score) {
                animRef.current = requestAnimationFrame(animate);
            }
        };

        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, [score, size, strokeWidth, levelColor, isDark]);

    return (
        <div className="flex flex-col items-center gap-3">
            <canvas
                ref={canvasRef}
                style={{ width: size, height: size }}
                className="drop-shadow-lg"
            />
            <span className={`level-${level.toLowerCase()}`}>
                {level === 'Beginner' ? '🌱' : level === 'Intermediate' ? '🔥' : '⭐'} {level}
            </span>
        </div>
    );
}
