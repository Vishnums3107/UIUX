import { useEffect, useRef, useState } from 'react';
import AudioMCQ from './exercises/AudioMCQ';
import DragMatch from './exercises/DragMatch';
import SentenceBuilder from './exercises/SentenceBuilder';
import FillBlank from './exercises/FillBlank';
import ReadingPassage from './exercises/ReadingPassage';
import WritingInput from './exercises/WritingInput';
import SpeedRound from './exercises/SpeedRound';
import FlashCard from './exercises/FlashCard';
import MasteryTest from './exercises/MasteryTest';
import AutoHintCascade from './AutoHintCascade';
import useTamilSpeech from '../hooks/useTamilSpeech';

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
    userName = 'Learner',
    adaptiveUi,
    onSubmit,
    onAnswerChange,
    onHintUsed,
    onError,
    onRetry,
    onActivity,
    isSubmitting = false,
    timeLeft,
    studyMode = 'classic',
}) {
    const [answer, setAnswer] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);
    const audioContextRef = useRef(null);

    if (!lesson) return null;

    const isBeginner = level === 'Beginner';
    const isAdvanced = level === 'Advanced';
    const uiConfig = adaptiveUi?.ui || {};
    const experienceMode = adaptiveUi?.mode || (isBeginner ? 'support' : isAdvanced ? 'challenge' : 'balanced');
    const showHintsByDefault = uiConfig.showHintsByDefault ?? isBeginner;
    const showGuidance = uiConfig.showStepGuidance ?? isBeginner;
    const singleColumnOptions = uiConfig.singleColumnOptions ?? isBeginner;
    const compactMode = uiConfig.compactMode ?? isAdvanced;
    const typographyScale = uiConfig.typographyScale || 'balanced';
    const motionIntensity = uiConfig.motionIntensity || 'balanced';
    const panelDensity = uiConfig.panelDensityDesktop || uiConfig.density || 'balanced';
    const audioPrompt = uiConfig.audioPrompt || {
        speakRate: 0.95,
        pitch: 1,
        pronunciationNudge: 'Use the pronunciation cue before submitting.'
    };
    const coach = adaptiveUi?.coach;
    const [showHint, setShowHint] = useState(showHintsByDefault);
    const isImmersive = studyMode === 'immersive';
    const controlsDisabled = submitted || isSubmitting;

    if (lesson.exerciseType) {
        return (
            <ExerciseMode
                lesson={lesson}
                level={level}
                userName={userName}
                adaptiveUi={adaptiveUi}
                onSubmit={onSubmit}
                onError={onError}
                onHintUsed={onHintUsed}
                onActivity={onActivity}
                timeLeft={timeLeft}
                isSubmitting={isSubmitting}
                studyMode={studyMode}
            />
        );
    }

    const normalizeAnswer = (value = '') => String(value).trim().toLowerCase();

    const { speak, stop: stopTTS, isSpeaking } = useTamilSpeech();

    useEffect(() => {
        setIsPlaying(isSpeaking);
    }, [isSpeaking]);

    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }

        stopTTS();
        setIsPlaying(false);
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
        // Prioritize fields that always contain Tamil text.
        // audioKey may be English (e.g. "mastery-1") for some stages,
        // so only use it if it actually contains Tamil characters.
        const tamilText = lesson.tamilScript || lesson.question_tamil;
        const audioKeyIsTamil = lesson.audioKey && /[\u0B80-\u0BFF]/.test(lesson.audioKey);
        const textToSpeak = tamilText || (audioKeyIsTamil ? lesson.audioKey : '') || lesson.question_tamil || lesson.question;
        speak(textToSpeak, audioPrompt.speakRate || 0.95, audioPrompt.pitch || 1, lesson.transliteration || '');
    };

    const toggleAudio = () => {
        if (isPlaying) {
            stopAudio();
            return;
        }

        onActivity?.();

        const isValidAudioUrl = lesson.audio_url && (lesson.audio_url.startsWith('http') || lesson.audio_url.includes('/'));

        if (isValidAudioUrl) {
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
        setShowHint(showHintsByDefault);
    }, [showHintsByDefault, lesson?._id]);

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

    const containerClass = experienceMode === 'support'
        ? 'max-w-3xl mx-auto space-y-7'
        : compactMode
            ? 'max-w-xl mx-auto space-y-4'
            : 'max-w-2xl mx-auto space-y-6';

    const questionTextClass = experienceMode === 'support'
        ? 'tamil-text-xl'
        : compactMode
            ? (isImmersive ? 'text-lg font-semibold text-sky-100' : 'text-lg font-medium text-gray-200')
            : (isImmersive ? 'tamil-text-lg drop-shadow-[0_0_12px_rgba(125,211,252,0.25)]' : 'tamil-text-lg');

    const lessonCardClass = isImmersive
        ? 'border-sky-400/35 bg-gradient-to-br from-sky-500/15 via-blue-500/10 to-transparent shadow-[0_0_28px_rgba(59,130,246,0.2)]'
        : experienceMode === 'support'
            ? 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-transparent to-ocean-500/8 shadow-[0_0_24px_rgba(16,185,129,0.1)]'
            : experienceMode === 'challenge'
                ? 'border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-transparent to-amber-500/8 shadow-[0_0_24px_rgba(244,63,94,0.1)]'
                : '';

    const selectedOptionClass = isImmersive
        ? 'border-sky-300 bg-sky-500/15 text-sky-100 shadow-[0_0_16px_rgba(56,189,248,0.18)]'
        : experienceMode === 'support'
            ? 'border-emerald-400 bg-emerald-500/12 text-emerald-100'
            : experienceMode === 'challenge'
                ? 'border-rose-400 bg-rose-500/12 text-rose-100'
                : 'border-tamil-500 bg-tamil-500/10 text-tamil-300';

    const idleOptionClass = isImmersive
        ? 'border-sky-900/45 bg-slate-900/60 text-gray-200 hover:border-sky-500/60 hover:bg-sky-500/10'
        : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600 hover:bg-gray-800';

    const submitLabel = experienceMode === 'challenge' ? 'Lock Answer' : 'Submit';
    const hintButtonLabel = experienceMode === 'challenge' ? 'Need a clue?' : 'Show Hint';

    return (
        <div className={`animate-fade-in ${containerClass} adaptive-type-${typographyScale} adaptive-motion-${motionIntensity} adaptive-panel-${panelDensity} ${isImmersive ? 'relative' : ''}`}>
            {isImmersive && (
                <div className="pointer-events-none absolute -top-10 right-0 h-32 w-32 rounded-full bg-sky-400/20 blur-3xl" />
            )}

            {coach && (
                <div className={`adaptive-panel rounded-2xl border px-4 py-3 ${
                    experienceMode === 'support'
                        ? 'border-emerald-400/25 bg-emerald-500/10'
                        : experienceMode === 'challenge'
                            ? 'border-rose-400/25 bg-rose-500/10'
                            : 'border-ocean-400/25 bg-ocean-500/10'
                }`}>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-gray-300">{coach.eyebrow}</p>
                            <p className="adaptive-body mt-1 text-sm text-gray-100">{coach.microcopy}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-white/10 px-3 py-1 text-gray-100">{adaptiveUi?.recommendedDifficulty || level}</span>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-gray-100">{coach.pacingLabel}</span>
                        </div>
                    </div>
                </div>
            )}

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

            {isImmersive && (
                <div className="adaptive-panel rounded-xl border border-sky-300/30 bg-gradient-to-r from-sky-500/15 via-blue-500/15 to-transparent px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.15em] text-sky-200 font-semibold">Immersive Study Mode</p>
                    <p className="text-sm text-sky-100/90">Focused visuals are enabled. Keep your rhythm and finish this step cleanly.</p>
                </div>
            )}

            {/* Category badge */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs uppercase tracking-wider px-3 py-1 rounded-full ${isImmersive ? 'text-sky-100 bg-sky-500/20 border border-sky-400/30' : 'text-gray-500 bg-gray-800'}`}>
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
            <div className={`card adaptive-panel ${lessonCardClass} ${isBeginner ? 'p-8' : isAdvanced ? 'p-4' : 'p-6'}`}>
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
                        className={`flex-shrink-0 p-3 rounded-full text-2xl transition-colors border ${isImmersive
                            ? 'bg-gradient-to-br from-sky-500/30 to-blue-500/25 border-sky-300/35 hover:from-sky-500/40 hover:to-blue-500/35'
                            : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                        } ${isPlaying ? 'ring-2 ring-tamil-500 shadow-[0_0_15px_rgba(37,99,235,0.42)]' : ''}`}
                        title={lesson.audio_url ? 'Play pronunciation audio' : 'Listen to Tamil pronunciation'}
                    >
                        {isPlaying ? '⏸️' : '🔈'}
                    </button>
                </div>
                <p className="adaptive-body mt-3 text-xs text-gray-400">{audioPrompt.pronunciationNudge}</p>
            </div>

            {/* Answer area */}
            <div className={`card adaptive-panel ${lessonCardClass} ${isBeginner ? 'p-8' : isAdvanced ? 'p-4' : 'p-6'}`}>
                {lesson.type === 'mcq' && lesson.options?.length > 0 ? (
                    <div className={`grid gap-3 ${singleColumnOptions ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {lesson.options.map((optionValue, i) => (
                            <button
                                key={i}
                                disabled={controlsDisabled}
                                data-testid={`option-${i}`}
                                onClick={() => handleSelectOption(optionValue)}
                                className={`text-left p-4 rounded-xl border-2 transition-all duration-200 font-tamil ${isBeginner ? 'text-2xl py-5' : isAdvanced ? 'text-base py-3' : 'text-xl py-4'
                                    } ${answer === optionValue
                                        ? selectedOptionClass
                                        : idleOptionClass
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
                    {!showHint && (
                        <button onClick={handleHint} className="btn-secondary text-sm">
                            💡 {hintButtonLabel}
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

            {/* Adaptive step-by-step guidance */}
            {showGuidance && !submitted && !feedback && (
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
                        ✅ {submitLabel}
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
                            ✅ {submitLabel}
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

function ExerciseMode({
    lesson,
    level,
    userName,
    adaptiveUi,
    onSubmit,
    onError,
    onHintUsed,
    onActivity,
    timeLeft,
    isSubmitting,
    studyMode = 'classic'
}) {
    const [feedback, setFeedback] = useState(null);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const { speak, stop, isSpeaking } = useTamilSpeech();
    const isImmersive = studyMode === 'immersive';
    const uiConfig = adaptiveUi?.ui || {};
    const experienceMode = adaptiveUi?.mode || (level === 'Beginner' ? 'support' : level === 'Advanced' ? 'challenge' : 'balanced');
    const typographyScale = uiConfig.typographyScale || 'balanced';
    const motionIntensity = uiConfig.motionIntensity || 'balanced';
    const panelDensity = uiConfig.panelDensityDesktop || uiConfig.density || 'balanced';
    const audioPrompt = uiConfig.audioPrompt || {
        speakRate: 0.95,
        pitch: 1,
        pronunciationNudge: 'Use the pronunciation cue before submitting.'
    };
    const coach = adaptiveUi?.coach;
    const surfaceClass = isImmersive
        ? 'border-sky-400/35 bg-gradient-to-br from-sky-500/15 via-blue-500/10 to-transparent shadow-[0_0_24px_rgba(59,130,246,0.18)]'
        : experienceMode === 'support'
            ? 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-transparent to-ocean-500/8'
            : experienceMode === 'challenge'
                ? 'border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-transparent to-amber-500/8'
                : '';

    const correctAnswer = lesson.correct_answer || lesson.correctAnswer || lesson.modelAnswer || '';
    const stageNumber = lesson.unlocksStage ? lesson.unlocksStage - 1 : (lesson.stage || 1);

    const finalize = (payload = {}) => {
        onActivity?.();
        const rawAnswer = String(payload.answer || '').trim();
        const isMastery = lesson.exerciseType === 'mastery_test' || lesson.isMasteryTest;
        const isCorrect = typeof payload.isCorrect === 'boolean'
            ? payload.isCorrect
            : rawAnswer.toLowerCase() === String(correctAnswer).trim().toLowerCase();

        if (isMastery) {
            const masteryPayload = payload.masteryPayload || {
                stageNumber,
                scorePercent: payload.scorePercent || (isCorrect ? 100 : 0),
                correctCount: payload.correctCount || (isCorrect ? 1 : 0),
                totalQuestions: payload.totalQuestions || 1,
                timeSpent: payload.timeSpent || 0,
                errors: payload.errors || 0,
                hintsUsed: payload.hintsUsed || 0,
                questions: payload.questions || []
            };
            onSubmit?.({
                isCorrect,
                answer: rawAnswer,
                timedOut: false,
                masteryPayload
            });
            return;
        }

        if (isCorrect) {
            setFeedback({ type: 'success', message: 'Correct!' });
            onSubmit?.({ isCorrect: true, answer: rawAnswer || correctAnswer, timedOut: false });
        } else {
            setFeedback({ type: 'error', message: 'Incorrect. Try again.' });
            setWrongAttempts((prev) => prev + 1);
            onError?.();
        }
    };

    const renderExercise = () => {
        switch (lesson.exerciseType) {
        case 'audio_mcq':
        case 'image_mcq':
        case 'text_mcq':
        case 'role_play_mcq':
            return (
                <AudioMCQ
                    audioText={lesson.tamilScript || lesson.question_tamil || (/[\u0B80-\u0BFF]/.test(lesson.audioKey) ? lesson.audioKey : '') || lesson.question}
                    transliteration={lesson.transliteration}
                    options={lesson.options || []}
                    correctAnswer={correctAnswer}
                    onSubmit={finalize}
                />
            );
        case 'drag_match':
        case 'dialogue_sequence':
            return (
                <DragMatch
                    dragItems={lesson.dragItems || []}
                    dragTargets={lesson.dragTargets || []}
                    onSubmit={finalize}
                />
            );
        case 'sentence_builder':
            return (
                <SentenceBuilder
                    sentenceParts={lesson.sentenceParts || []}
                    correctOrder={lesson.correctOrder || []}
                    translation={lesson.question}
                    onSubmit={finalize}
                />
            );
        case 'fill_blank':
        case 'error_spot':
        case 'sequence_order':
            return (
                <FillBlank
                    sentence={lesson.question_tamil || lesson.question}
                    options={lesson.options?.length ? lesson.options : null}
                    correctAnswer={correctAnswer}
                    onSubmit={finalize}
                />
            );
        case 'tense_transform':
        case 'translation_input':
        case 'trace_type':
        case 'free_write':
            return (
                <WritingInput
                    writingPrompt={lesson.writingPrompt || lesson.question}
                    modelAnswer={lesson.modelAnswer || correctAnswer}
                    acceptedAnswers={lesson.acceptedAnswers || []}
                    onSubmit={finalize}
                />
            );
        case 'comprehension_mcq':
        case 'true_false':
            return (
                <ReadingPassage
                    passage={lesson.passage || ''}
                    passageTitle={lesson.passageTitle || 'Reading'}
                    question={lesson.question}
                    exerciseType={lesson.exerciseType}
                    options={lesson.options || []}
                    correctAnswer={correctAnswer}
                    onSubmit={finalize}
                />
            );
        case 'flashcard':
            return (
                <FlashCard
                    tamilScript={lesson.tamilScript || correctAnswer}
                    transliteration={lesson.transliteration || ''}
                    meaning={lesson.explanation || ''}
                    example={lesson.culturalNote || ''}
                    audioText={lesson.tamilScript || (/[\u0B80-\u0BFF]/.test(lesson.audioKey) ? lesson.audioKey : '') || ''}
                    onSubmit={finalize}
                />
            );
        case 'speed_round':
            return (
                <SpeedRound
                    questions={lesson.questions || []}
                    onComplete={(result) => finalize({
                        isCorrect: result.scorePercent >= 70,
                        answer: String(result.scorePercent),
                        scorePercent: result.scorePercent,
                        totalQuestions: result.total,
                        correctCount: result.score,
                        questions: result.questions || []
                    })}
                />
            );
        case 'mastery_test':
            return (
                <MasteryTest
                    questions={lesson.questions || []}
                    stageNumber={stageNumber}
                    userName={userName}
                    onComplete={(result) => finalize({
                        isCorrect: result.passed,
                        answer: String(result.scorePercent),
                        masteryPayload: {
                            stageNumber,
                            scorePercent: result.scorePercent,
                            correctCount: result.score,
                            totalQuestions: result.total,
                            timeSpent: typeof result.timeSpent === 'number'
                                ? result.timeSpent
                                : (timeLeft ? Math.max(0, 60 - timeLeft) : 0),
                            errors: 0,
                            hintsUsed: 0,
                            questions: result.questions || []
                        }
                    })}
                />
            );
        default:
            return (
                <FillBlank
                    sentence={lesson.question_tamil || lesson.question}
                    options={lesson.options?.length ? lesson.options : null}
                    correctAnswer={correctAnswer}
                    onSubmit={finalize}
                />
            );
        }
    };

    return (
        <div className={`max-w-3xl mx-auto space-y-5 animate-fade-in adaptive-type-${typographyScale} adaptive-motion-${motionIntensity} adaptive-panel-${panelDensity} ${isImmersive ? 'relative' : ''}`}>
            {isImmersive && (
                <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-sky-400/20 blur-3xl" />
            )}
            {coach && (
                <div className={`adaptive-panel rounded-2xl border px-4 py-3 ${
                    experienceMode === 'support'
                        ? 'border-emerald-400/25 bg-emerald-500/10'
                        : experienceMode === 'challenge'
                            ? 'border-rose-400/25 bg-rose-500/10'
                            : 'border-ocean-400/25 bg-ocean-500/10'
                }`}>
                    <p className="text-xs uppercase tracking-[0.16em] text-gray-300">{coach.eyebrow}</p>
                    <p className="adaptive-body mt-1 text-sm text-gray-100">{coach.microcopy}</p>
                </div>
            )}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs uppercase tracking-wider px-3 py-1 rounded-full ${isImmersive ? 'text-sky-100 bg-sky-500/20 border border-sky-400/30' : 'text-gray-500 bg-gray-800'}`}>
                        stage {lesson.stage || '-'}
                    </span>
                    <span className={`text-xs px-3 py-1 rounded-full ${
                        level === 'Beginner'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : level === 'Intermediate'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-rose-500/10 text-rose-400'
                    }`}>
                        {level}
                    </span>
                    <span className="text-xs px-3 py-1 rounded-full bg-ocean-500/10 text-ocean-300">
                        {lesson.exerciseType}
                    </span>
                    {adaptiveUi?.recommendedDifficulty && (
                        <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-gray-100">
                            target {adaptiveUi.recommendedDifficulty}
                        </span>
                    )}
                    {isImmersive && (
                        <span className="text-xs px-3 py-1 rounded-full bg-sky-500/20 text-sky-100 border border-sky-300/30">
                            immersive
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => (isSpeaking
                        ? stop()
                        : speak(
                            lesson.tamilScript || lesson.question_tamil || (/[\u0B80-\u0BFF]/.test(lesson.audioKey) ? lesson.audioKey : '') || lesson.question,
                            audioPrompt.speakRate,
                            audioPrompt.pitch,
                            lesson.transliteration
                        ))}
                    className="btn-secondary px-3 py-2 text-sm"
                    disabled={isSubmitting}
                >
                    {isSpeaking ? 'Stop' : '🔈 Speak'}
                </button>
            </div>
            <p className="adaptive-body text-xs text-gray-400">{audioPrompt.pronunciationNudge}</p>

            <div className={`card adaptive-panel ${surfaceClass}`}>
                <h2 className="adaptive-heading text-xl text-gray-100">{lesson.question}</h2>
                {lesson.question_tamil && <p className="mt-2 font-tamil text-2xl text-tamil-200">{lesson.question_tamil}</p>}
            </div>

            <div className={`card adaptive-panel ${surfaceClass}`}>
                {renderExercise()}
                {feedback && (
                    <p className={`mt-3 ${feedback.type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
                        {feedback.message}
                    </p>
                )}
                {!!lesson.hint && (
                    <button
                        type="button"
                        onClick={() => onHintUsed?.()}
                        className="mt-3 text-sm text-amber-300 underline"
                    >
                        {experienceMode === 'challenge' ? 'Hint available if needed' : 'Hint available'}
                    </button>
                )}
                <AutoHintCascade
                    lesson={lesson}
                    level={level}
                    wrongAttempts={wrongAttempts}
                    onHintUsed={onHintUsed}
                    isSubmitting={isSubmitting}
                />
            </div>
        </div>
    );
}


