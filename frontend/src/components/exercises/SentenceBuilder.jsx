import { useMemo, useState } from 'react';

export default function SentenceBuilder({
    sentenceParts = [],
    correctOrder = [],
    translation = '',
    onSubmit
}) {
    const [picked, setPicked] = useState([]);
    const [shake, setShake] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const pickedSet = useMemo(() => new Set(picked), [picked]);
    const orderedSentence = picked.map((index) => sentenceParts[index]).join(' ');

    const addPart = (index) => {
        if (submitted || pickedSet.has(index)) return;
        setPicked((prev) => [...prev, index]);
    };

    const clearPart = (index) => {
        if (submitted) return;
        setPicked((prev) => prev.filter((value) => value !== index));
    };

    const handleSubmit = () => {
        if (picked.length !== correctOrder.length) return;
        const isCorrect = picked.every((value, idx) => value === correctOrder[idx]);
        setSubmitted(true);
        if (!isCorrect) {
            setShake(true);
            setTimeout(() => setShake(false), 400);
        }
        onSubmit?.({ isCorrect, answer: orderedSentence, timedOut: false });
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-100">Sentence Builder</h3>
            {translation && <p className="text-sm text-gray-400">{translation}</p>}

            <div className={`min-h-[56px] rounded-xl border border-gray-700 bg-gray-900/40 p-3 ${shake ? 'animate-shake' : ''}`}>
                <div className="flex flex-wrap gap-2">
                    {picked.map((index) => (
                        <button
                            key={`picked-${index}`}
                            type="button"
                            onClick={() => clearPart(index)}
                            disabled={submitted}
                            className="rounded-full bg-tamil-500/25 px-3 py-1 text-tamil-100"
                        >
                            {sentenceParts[index]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {sentenceParts.map((part, index) => (
                    <button
                        key={`${part}-${index}`}
                        type="button"
                        onClick={() => addPart(index)}
                        disabled={submitted || pickedSet.has(index)}
                        className={`rounded-full px-3 py-1 ${
                            pickedSet.has(index)
                                ? 'bg-gray-700 text-gray-400'
                                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                        }`}
                    >
                        {part}
                    </button>
                ))}
            </div>

            <button
                type="button"
                onClick={handleSubmit}
                disabled={submitted || picked.length !== correctOrder.length}
                className="btn-primary"
            >
                Submit
            </button>
        </div>
    );
}
