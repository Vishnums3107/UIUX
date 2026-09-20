import { useState } from 'react';

export default function FillBlank({
    sentence = '',
    blankIndex = null,
    options = null,
    correctAnswer = '',
    onSubmit
}) {
    const [value, setValue] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const renderedSentence = (() => {
        if (!sentence) return '[___]';
        if (blankIndex === null || blankIndex === undefined) return sentence;
        const parts = sentence.split(' ');
        if (blankIndex < 0 || blankIndex >= parts.length) return sentence;
        parts[blankIndex] = '[___]';
        return parts.join(' ');
    })();

    const handleSubmit = () => {
        if (!value) return;
        const isCorrect = value.trim() === correctAnswer;
        setSubmitted(true);
        onSubmit?.({ isCorrect, answer: value.trim(), timedOut: false });
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-100">Fill In The Blank</h3>
            <p className="font-tamil text-xl text-gray-100">{renderedSentence}</p>

            {Array.isArray(options) && options.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {options.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => setValue(option)}
                            disabled={submitted}
                            className={`rounded-lg border px-3 py-2 text-left ${
                                value === option
                                    ? 'border-tamil-400 bg-tamil-500/20 text-tamil-100'
                                    : 'border-gray-700 bg-gray-900/40 text-gray-200'
                            }`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            ) : (
                <input
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    disabled={submitted}
                    className="input-field font-tamil"
                    placeholder="Type answer"
                />
            )}

            <button
                type="button"
                onClick={handleSubmit}
                disabled={submitted || !value}
                className="btn-primary"
            >
                Submit
            </button>
        </div>
    );
}
