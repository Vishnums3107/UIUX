import { useMemo, useState } from 'react';

const transliterateWord = (word = '') => word;

export default function ReadingPassage({
    passage = '',
    passageTitle = '',
    question = '',
    exerciseType = 'comprehension_mcq',
    options = [],
    correctAnswer = '',
    onSubmit
}) {
    const [selected, setSelected] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const paragraphs = useMemo(() => passage.split('\n').filter(Boolean), [passage]);

    const handleSubmit = () => {
        if (!selected) return;
        const isCorrect = selected === correctAnswer;
        setSubmitted(true);
        onSubmit?.({ isCorrect, answer: selected, timedOut: false });
    };

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-100">{passageTitle || 'Reading Passage'}</h3>
                <p className="text-xs text-gray-400">Tap any word to view transliteration tooltip.</p>
            </div>

            <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-4 space-y-2">
                {paragraphs.map((paragraph, index) => (
                    <p key={`${paragraph}-${index}`} className="font-tamil leading-8 text-gray-100">
                        {paragraph.split(' ').map((word, wordIndex) => (
                            <button
                                key={`${word}-${wordIndex}`}
                                type="button"
                                className="mr-1 rounded px-1 hover:bg-gray-700/60"
                                title={transliterateWord(word)}
                            >
                                {word}
                            </button>
                        ))}
                    </p>
                ))}
            </div>

            <div className="space-y-3">
                <p className="text-gray-100">{question}</p>
                {(exerciseType.includes('mcq') || exerciseType === 'true_false') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {options.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setSelected(option)}
                                disabled={submitted}
                                className={`rounded-lg border px-3 py-2 text-left ${
                                    selected === option
                                        ? 'border-tamil-400 bg-tamil-500/20 text-tamil-100'
                                        : 'border-gray-700 bg-gray-900/40 text-gray-200'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                )}
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
