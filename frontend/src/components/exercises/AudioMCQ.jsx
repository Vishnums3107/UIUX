import { useState } from 'react';
import useTamilSpeech from '../../hooks/useTamilSpeech';

export default function AudioMCQ({
    audioText,
    transliteration = '',
    options = [],
    correctAnswer,
    onSubmit
}) {
    const [selected, setSelected] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const { speak, stop, isSpeaking } = useTamilSpeech();

    const handleSubmit = () => {
        if (!selected) return;
        const isCorrect = selected === correctAnswer;
        setSubmitted(true);
        onSubmit?.({ isCorrect, answer: selected, timedOut: false });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-100">Audio Choice</h3>
                <button
                    type="button"
                    onClick={() => (isSpeaking ? stop() : speak(audioText, 0.95, 1, transliteration))}
                    className="btn-secondary text-sm px-3 py-2"
                >
                    {isSpeaking ? 'Stop' : '🔈 Play'}
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.map((option) => {
                    const isSelected = selected === option;
                    const isCorrect = submitted && option === correctAnswer;
                    const isWrong = submitted && isSelected && option !== correctAnswer;

                    return (
                        <button
                            key={option}
                            type="button"
                            onClick={() => setSelected(option)}
                            disabled={submitted}
                            className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                                isCorrect
                                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                                    : isWrong
                                        ? 'border-red-400 bg-red-500/20 text-red-200'
                                        : isSelected
                                            ? 'border-tamil-400 bg-tamil-500/15 text-tamil-100'
                                            : 'border-gray-700 bg-gray-900/40 text-gray-200 hover:border-gray-500'
                            }`}
                        >
                            {option}
                        </button>
                    );
                })}
            </div>

            <button
                type="button"
                onClick={handleSubmit}
                disabled={!selected || submitted}
                className="btn-primary"
            >
                Submit
            </button>
        </div>
    );
}
