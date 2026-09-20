import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_DURATION_SECONDS = 600;

const formatClock = (seconds) => {
    const safe = Math.max(0, Number(seconds) || 0);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

function buildCertificateDataUrl(userName = 'Learner') {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 8;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.font = 'bold 54px serif';
    ctx.fillText('Tamil Fluency Certificate', canvas.width / 2, 190);

    ctx.font = '28px serif';
    ctx.fillText('This certifies that', canvas.width / 2, 280);

    ctx.font = 'bold 46px serif';
    ctx.fillText(userName, canvas.width / 2, 360);

    ctx.font = '26px serif';
    ctx.fillText('has successfully passed the Tamil mastery program.', canvas.width / 2, 430);

    ctx.font = '20px serif';
    ctx.fillText(new Date().toLocaleDateString(), canvas.width / 2, 520);
    ctx.fillText('Tamil Learning Platform Seal', canvas.width / 2, 565);

    return canvas.toDataURL('image/png');
}

export default function MasteryTest({
    questions = [],
    stageNumber = 1,
    userName = 'Learner',
    durationSeconds = DEFAULT_DURATION_SECONDS,
    onComplete
}) {
    const normalizedQuestions = useMemo(() => {
        if (Array.isArray(questions) && questions.length > 0) return questions;
        return [{
            question: `Stage ${stageNumber} mastery checkpoint`,
            options: ['Ready', 'Not ready', 'Need review', 'Skip'],
            correctAnswer: 'Ready'
        }];
    }, [questions, stageNumber]);

    const [index, setIndex] = useState(0);
    const [selected, setSelected] = useState('');
    const [score, setScore] = useState(0);
    const [done, setDone] = useState(false);
    const [certificateUrl, setCertificateUrl] = useState('');
    const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
    const [result, setResult] = useState(null);
    const answersRef = useRef([]);

    const current = normalizedQuestions[index];
    const total = normalizedQuestions.length;
    const percent = result?.scorePercent ?? Math.round((score / total) * 100);

    const completeTest = (finalScore, timedOut = false) => {
        if (done) return;

        const safeTotal = Math.max(1, total);
        const scorePercent = Math.round((finalScore / safeTotal) * 100);
        const passed = scorePercent >= 70;
        const timeSpent = timedOut
            ? durationSeconds
            : Math.max(0, durationSeconds - remainingSeconds);

        const finalResult = {
            passed,
            score: finalScore,
            total,
            scorePercent,
            timedOut,
            timeSpent,
            questions: [...answersRef.current]
        };

        setScore(finalScore);
        setResult(finalResult);
        setDone(true);

        if (passed && stageNumber === 10) {
            setCertificateUrl(buildCertificateDataUrl(userName));
        }

        onComplete?.(finalResult);
    };

    useEffect(() => {
        if (done) return undefined;

        const timerId = window.setInterval(() => {
            setRemainingSeconds((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => window.clearInterval(timerId);
    }, [done]);

    useEffect(() => {
        if (!done && remainingSeconds <= 0) {
            completeTest(score, true);
        }
    }, [done, remainingSeconds, score]);

    const submitAnswer = () => {
        if (!selected || done) return;

        const isCorrect = selected === current.correctAnswer;
        const nextScore = isCorrect ? score + 1 : score;
        answersRef.current.push({
            question: current.question,
            questionTamil: current.questionTamil || '',
            selectedAnswer: selected,
            correctAnswer: current.correctAnswer,
            isCorrect,
            exerciseType: current.exerciseType || 'text_mcq'
        });
        setScore(nextScore);

        if (index >= total - 1) {
            completeTest(nextScore, false);
            return;
        }

        setSelected('');
        setIndex((prev) => prev + 1);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-100">Mastery Test (Advanced)</h3>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-500 to-blue-400" style={{ width: `${((index + 1) / total) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-gray-400">
                <p>Q {Math.min(index + 1, total)} of {total}</p>
                <p className={`${remainingSeconds <= 30 ? 'text-red-300' : 'text-sky-200'}`}>
                    Time left: {formatClock(remainingSeconds)}
                </p>
            </div>

            {!done && (
                <div className="space-y-3">
                    <p className="text-gray-100">{current.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(current.options || []).map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setSelected(option)}
                                className={`rounded-lg border px-3 py-2 text-left ${
                                    selected === option
                                        ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                                        : 'border-gray-700 bg-gray-900/40 text-gray-200'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                    <button type="button" onClick={submitAnswer} disabled={!selected} className="btn-primary">
                        Submit
                    </button>
                </div>
            )}

            {done && (
                <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-4 space-y-3">
                    <p className={`text-xl font-semibold ${percent >= 70 ? 'text-sky-300' : 'text-red-300'}`}>
                        {percent >= 70 ? 'Pass' : 'Fail'} - {percent}%
                    </p>
                    {result?.timedOut && (
                        <p className="text-sm text-sky-300">Time is up. Unanswered questions were counted as incorrect.</p>
                    )}
                    <p className="text-sm text-gray-300">
                        {percent >= 70
                            ? `Stage ${stageNumber} mastery cleared.`
                            : `Stage ${stageNumber} needs another attempt.`}
                    </p>
                    {percent >= 70 && <p className="text-sky-300">🏅 Unlock badge earned</p>}
                    {certificateUrl && (
                        <a href={certificateUrl} download="tamil-fluency-certificate.png" className="btn-secondary inline-block">
                            Download Certificate
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}
