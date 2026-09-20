import { useEffect, useMemo, useState } from 'react';

const DEFAULT_TIME = 60;

export default function SpeedRound({ questions = [], onComplete }) {
    const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME);
    const [index, setIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [done, setDone] = useState(false);

    const roundQuestions = useMemo(() => questions.slice(0, 10), [questions]);
    const current = roundQuestions[index];

    useEffect(() => {
        if (done) return undefined;
        const timer = window.setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setDone(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, [done]);

    useEffect(() => {
        if (!done) return;
        const total = roundQuestions.length || 1;
        onComplete?.({
            score,
            total,
            scorePercent: Math.round((score / total) * 100)
        });
    }, [done, onComplete, roundQuestions.length, score]);

    const answer = (option) => {
        if (done) return;
        if (option === current?.correctAnswer) {
            setScore((prev) => prev + 1);
        }

        if (index >= roundQuestions.length - 1) {
            setDone(true);
            return;
        }
        setIndex((prev) => prev + 1);
    };

    if (!current && !done) {
        return <p className="text-gray-400">No speed questions configured.</p>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100">Speed Round</h3>
                <span className={`font-mono ${timeLeft <= 10 ? 'text-red-400' : 'text-amber-300'}`}>{timeLeft}s</span>
            </div>

            {!done && current && (
                <div className="space-y-3">
                    <p className="text-gray-100">{current.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(current.options || []).map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => answer(option)}
                                className="rounded-lg border border-gray-700 bg-gray-900/40 px-3 py-2 text-left text-gray-200 hover:border-gray-500"
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400">Question {index + 1} / {roundQuestions.length}</p>
                </div>
            )}

            {done && (
                <div className="rounded-xl border border-ocean-400/40 bg-ocean-500/10 p-4 text-center">
                    <p className="text-xl font-semibold text-ocean-100">Final Score</p>
                    <p className="text-3xl font-bold text-ocean-200">{score} / {roundQuestions.length || 1}</p>
                </div>
            )}
        </div>
    );
}
