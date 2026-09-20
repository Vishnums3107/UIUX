import { useMemo, useState } from 'react';

const normalize = (value = '') => String(value).normalize('NFC').trim();

export default function WritingInput({
    writingPrompt = '',
    modelAnswer = '',
    acceptedAnswers = [],
    onSubmit
}) {
    const [value, setValue] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [showModel, setShowModel] = useState(false);

    const allAccepted = useMemo(() => {
        const set = new Set([modelAnswer, ...acceptedAnswers].filter(Boolean).map((item) => normalize(item)));
        return [...set];
    }, [acceptedAnswers, modelAnswer]);

    const handleSubmit = () => {
        const normalizedValue = normalize(value);
        if (!normalizedValue) return;
        const isCorrect = allAccepted.includes(normalizedValue);
        setSubmitted(true);
        onSubmit?.({ isCorrect, answer: value, timedOut: false });
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-100">Writing Practice</h3>
            <p className="text-sm text-gray-300">{writingPrompt || 'Write your Tamil response.'}</p>

            <textarea
                value={value}
                onChange={(event) => setValue(event.target.value)}
                disabled={submitted}
                className="input-field min-h-32 font-tamil text-lg"
                style={{ fontFamily: "'Noto Sans Tamil', sans-serif" }}
                placeholder="தமிழில் தட்டச்சு செய்..."
            />

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitted || !value.trim()}
                    className="btn-primary"
                >
                    Submit
                </button>
                <button
                    type="button"
                    onClick={() => setShowModel((prev) => !prev)}
                    disabled={!submitted}
                    className="btn-secondary"
                >
                    {showModel ? 'Hide Model' : 'Reveal Model'}
                </button>
            </div>

            {showModel && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-emerald-100">
                    {modelAnswer}
                </div>
            )}
        </div>
    );
}
