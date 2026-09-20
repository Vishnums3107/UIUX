import { useMemo, useState } from 'react';

export default function DragMatch({
    dragItems = [],
    dragTargets = [],
    onSubmit
}) {
    const [activeIndex, setActiveIndex] = useState(null);
    const [matches, setMatches] = useState({});
    const [submitted, setSubmitted] = useState(false);

    const complete = useMemo(
        () => dragItems.length > 0 && Object.keys(matches).length === dragItems.length,
        [dragItems.length, matches]
    );

    const assignTarget = (targetIndex) => {
        if (activeIndex === null || submitted) return;
        setMatches((prev) => ({ ...prev, [activeIndex]: targetIndex }));
        setActiveIndex(null);
    };

    const handleSubmit = () => {
        const isCorrect = dragItems.every((_, itemIndex) => Number(matches[itemIndex]) === itemIndex);
        setSubmitted(true);
        onSubmit?.({ isCorrect, matches, timedOut: false });
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-100">Match Pairs</h3>
            <p className="text-sm text-gray-400">Select a Tamil item, then select its matching target.</p>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    {dragItems.map((item, index) => (
                        <button
                            key={`${item}-${index}`}
                            type="button"
                            onClick={() => setActiveIndex(index)}
                            disabled={submitted}
                            className={`w-full rounded-lg border px-3 py-2 text-left ${
                                activeIndex === index
                                    ? 'border-tamil-400 bg-tamil-500/20 text-tamil-100'
                                    : 'border-gray-700 bg-gray-900/40 text-gray-200'
                            }`}
                        >
                            {item}
                            {matches[index] !== undefined && (
                                <span className="ml-2 text-emerald-300">✓</span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="space-y-2">
                    {dragTargets.map((target, index) => (
                        <button
                            key={`${target}-${index}`}
                            type="button"
                            onClick={() => assignTarget(index)}
                            disabled={submitted}
                            className="w-full rounded-lg border border-gray-700 bg-gray-900/40 px-3 py-2 text-left text-gray-200 hover:border-gray-500"
                        >
                            {target}
                        </button>
                    ))}
                </div>
            </div>

            <button
                type="button"
                onClick={handleSubmit}
                disabled={!complete || submitted}
                className="btn-primary"
            >
                Submit
            </button>
        </div>
    );
}
