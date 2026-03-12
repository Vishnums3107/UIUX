import { useEffect, useRef, useState } from 'react';

/**
 * AdaptiveLesson renders a lesson question with UI adapted to the user's level.
 *
 * Beginner: Large text, visible hints, spacious layout, step-by-step guidance
 * Intermediate: Hidden hints, moderate density, standard layout
 * Advanced: Compact UI, no auto-hints, timed challenges
 */
export default function AdaptiveLesson({
    lesson,
    level = 'Intermediate',
    onSubmit,
    onAnswerChange,
    onHintUsed,
    onError,
    onRetry,
    onActivity,
    isSubmitting = false,
    timeLeft,
}) {
    const [answer, setAnswer] = useState('');
    const [showHint, setShowHint] = useState(level === 'Beginner');
    const [feedback, setFeedback] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);
    const audioContextRef = useRef(null);

    if (!lesson) return null;

    const isBeginner = level === 'Beginner';
    const isAdvanced = level === 'Advanced';
    const controlsDisabled = submitted || isSubmitting;

    const normalizeAnswer = (value = '') => String(value).trim().toLowerCase();

    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    };

    const playFeedbackTone = (type) => {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContextClass();
        }

        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = type === 'success' ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(type === 'success' ? 660 : 220, ctx.currentTime);

        if (type === 'error') {
            oscillator.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.18);
        }

        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);

        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.2);
    };

    const speakWithTTS = () => {
        if (!('speechSynthesis' in window)) {
            alert('Audio is not supported in your browser.');
            return;
        }

        const textToSpeak = lesson.question_tamil || lesson.question;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'ta-IN';
        utterance.rate = 0.9;

        const voices = window.speechSynthesis.getVoices();
        const tamilVoice = voices.find((voice) => voice.lang.includes('ta'));
        if (tamilVoice) utterance.voice = tamilVoice;

        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);

        setIsPlaying(true);
        window.speechSynthesis.speak(utterance);
    };

    const toggleAudio = () => {
        if (isPlaying) {
            stopAudio();
            setIsPlaying(false);
            return;
        }

        onActivity?.();

        if (lesson.audio_url) {
            const audio = new Audio(lesson.audio_url);
            audioRef.current = audio;
            setIsPlaying(true);

            audio.onended = () => setIsPlaying(false);
            audio.onerror = () => {
                setIsPlaying(false);
                speakWithTTS();
            };

            audio.play().catch(() => {
                setIsPlaying(false);
                speakWithTTS();
            });
            return;
        }

        speakWithTTS();
    };

    useEffect(() => {
        return () => {
            stopAudio();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, []);

    // Handle submit
    const handleSubmit = () => {
        if (!answer.trim() || controlsDisabled) return;
        onActivity?.();

        const isCorrect = normalizeAnswer(answer) === normalizeAnswer(lesson.correct_answer);

        if (isCorrect) {
            setFeedback({ type: 'success', message: '✅ Correct! Well done! / சரி! நன்று!' });
            setSubmitted(true);
            playFeedbackTone('success');
            onSubmit?.({ isCorrect: true, answer: answer.trim(), timedOut: false });
        } else {
            setFeedback({ type: 'error', message: `❌ Incorrect. ${isBeginner ? 'Try again! / மீண்டும் முயற்சி செய்யுங்கள்!' : 'Try again!'}` });
            playFeedbackTone('error');
            onError?.();
        }
    };

    const handleRetry = () => {
        if (controlsDisabled) return;
        setAnswer('');
        setFeedback(null);
        setSubmitted(false);
        onAnswerChange?.('');
        onRetry?.();
        onActivity?.();
    };

    const handleHint = () => {
        if (controlsDisabled) return;
        setShowHint(true);
        onHintUsed?.();
        onActivity?.();
    };

    const handleSelectOption = (optionValue) => {
        if (controlsDisabled) return;
        setAnswer(optionValue);
        onAnswerChange?.(optionValue);
        onActivity?.();
    };

    // Layout classes based on level
    const containerClass = isBeginner
        ? 'max-w-2xl mx-auto space-y-8'
        : isAdvanced
            ? 'max-w-xl mx-auto space-y-4'
            : 'max-w-2xl mx-auto space-y-6';

    const questionTextClass = isBeginner
        ? 'tamil-text-xl'
        : isAdvanced
            ? 'text-lg font-medium text-gray-200'
            : 'tamil-text-lg';

    return (
        <div className={`animate-fade-in ${containerClass}`}>
            {/* Timer for Advanced */}
            {isAdvanced && timeLeft !== undefined && (
                <div className="flex items-center justify-end gap-2">
                    <span className={`text-sm font-mono font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
                        ⏱️ {timeLeft}s
                    </span>
                    <div className="w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-tamil-500 to-ocean-500 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, (timeLeft / 60) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Category badge */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider text-gray-500 bg-gray-800 px-3 py-1 rounded-full">
                    {lesson.category.replace('-', ' ')}
                </span>
                <span className={`text-xs px-3 py-1 rounded-full ${lesson.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-400' :
                    lesson.difficulty === 'Intermediate' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-rose-500/10 text-rose-400'
                    }`}>
                    {lesson.difficulty}
                </span>
            </div>

            {/* Question */}
            <div className={`card ${isBeginner ? 'p-8' : isAdvanced ? 'p-4' : 'p-6'}`}>
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <h2 className={questionTextClass}>{lesson.question}</h2>
                        {lesson.question_tamil && (
                            <p className={`mt-2 font-tamil ${isBeginner ? 'text-2xl text-tamil-300' : 'text-lg text-gray-400'}`}>
                                {lesson.question_tamil}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={toggleAudio}
                        className={`flex-shrink-0 p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-2xl transition-colors border border-gray-700 ${isPlaying ? 'ring-2 ring-tamil-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]' : ''}`}
                        title={lesson.audio_url ? 'Play pronunciation audio' : 'Listen to Tamil pronunciation'}
                    >
                        {isPlaying ? '⏸️' : '🔈'}
                    </button>
                </div>
            </div>

            {/* Answer area */}
            <div className={`card ${isBeginner ? 'p-8' : isAdvanced ? 'p-4' : 'p-6'}`}>
                {lesson.type === 'mcq' && lesson.options?.length > 0 ? (
                    <div className={`grid gap-3 ${isBeginner ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {lesson.options.map((optionValue, i) => (
                            <button
                                key={i}
                                disabled={controlsDisabled}
                                data-testid={`option-${i}`}
                                onClick={() => handleSelectOption(optionValue)}
                                className={`text-left p-4 rounded-xl border-2 transition-all duration-200 font-tamil ${isBeginner ? 'text-2xl py-5' : isAdvanced ? 'text-base py-3' : 'text-xl py-4'
                                    } ${answer === optionValue
                                        ? 'border-tamil-500 bg-tamil-500/10 text-tamil-300'
                                        : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600 hover:bg-gray-800'
                                    } ${controlsDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <span className="text-gray-500 mr-2 text-sm">{String.fromCharCode(65 + i)}.</span>
                                {optionValue}
                            </button>
                        ))}
                    </div>
                ) : (
                    <input
                        type="text"
                        value={answer}
                        onChange={(event) => {
                            const value = event.target.value;
                            setAnswer(value);
                            onAnswerChange?.(value);
                            onActivity?.();
                        }}
                        disabled={controlsDisabled}
                        placeholder={isBeginner ? 'Type your answer here / உங்கள் பதிலை இங்கே தட்டச்சு செய்யுங்கள்' : 'Type your answer...'}
                        className={`input-field font-tamil ${isBeginner ? 'text-2xl py-5' : isAdvanced ? 'text-base' : 'text-xl py-4'}`}
                    />
                )}
            </div>

            {/* Hint */}
            {lesson.hint && (
                <div>
                    {!showHint && !isAdvanced && (
                        <button onClick={handleHint} className="btn-secondary text-sm">
                            💡 {isBeginner ? 'Show Hint / குறிப்பு காட்டு' : 'Show Hint'}
                        </button>
                    )}
                    {showHint && (
                        <div className={`glass p-4 animate-slide-up ${isBeginner ? 'text-lg' : 'text-sm'}`}>
                            <p className="text-amber-400">
                                💡 <span className="font-medium">Hint:</span> {lesson.hint}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Beginner step-by-step guidance */}
            {isBeginner && !submitted && !feedback && (
                <div className="glass p-5 text-emerald-400/80 text-sm space-y-1">
                    <p>📖 <strong>Steps:</strong></p>
                    <p>1. Read the question carefully / கேள்வியை கவனமாக படியுங்கள்</p>
                    <p>2. {lesson.type === 'mcq' ? 'Select your answer / பதிலைத் தேர்ந்தெடுங்கள்' : 'Type your answer / பதிலை தட்டச்சு செய்யுங்கள்'}</p>
                    <p>3. Click Submit / சமர்ப்பி என்பதை கிளிக் செய்யுங்கள்</p>
                </div>
            )}

            {/* Feedback */}
            {feedback && (
                <div className={`glass p-5 animate-scale-in ${feedback.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-red-500/30 bg-red-500/5'
                    }`}>
                    <p className={`font-semibold ${isBeginner ? 'text-lg' : 'text-base'} ${feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                        {feedback.message}
                    </p>
                    {submitted && lesson.explanation && (
                        <p className="text-gray-400 mt-2 text-sm">
                            {lesson.explanation}
                        </p>
                    )}
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
                {!submitted && !feedback && (
                    <button
                        onClick={handleSubmit}
                        disabled={!answer.trim() || controlsDisabled}
                        data-testid="lesson-submit"
                        className={`btn-primary ${isBeginner ? 'text-lg py-4 w-full' : ''}`}
                    >
                        {isBeginner ? '✅ Submit / சமர்ப்பி' : '✅ Submit'}
                    </button>
                )}

                {feedback && !submitted && (
                    <>
                        <button
                            onClick={handleSubmit}
                            disabled={!answer.trim() || controlsDisabled}
                            data-testid="lesson-submit"
                            className="btn-primary"
                        >
                            {isBeginner ? '✅ Submit / சமர்ப்பி' : '✅ Submit'}
                        </button>
                        <button onClick={handleRetry} className="btn-secondary" disabled={controlsDisabled} data-testid="lesson-retry">
                            🔄 {isBeginner ? 'Try Again / மீண்டும் முயற்சி' : 'Retry'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
