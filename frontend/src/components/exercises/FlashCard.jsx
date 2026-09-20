import { useState } from 'react';
import useTamilSpeech from '../../hooks/useTamilSpeech';

export default function FlashCard({
    tamilScript,
    transliteration,
    meaning = '',
    example = '',
    audioText = '',
    onSubmit
}) {
    const [flipped, setFlipped] = useState(false);
    const { speak, stop, isSpeaking } = useTamilSpeech();

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-100">Flashcard</h3>
            <div className="relative h-56 perspective-1000">
                <button
                    type="button"
                    onClick={() => setFlipped((prev) => !prev)}
                    className={`absolute inset-0 w-full rounded-2xl border border-gray-700 bg-gray-900/50 p-4 transition-transform duration-500 preserve-3d ${flipped ? 'rotate-y-180' : ''}`}
                >
                    <div className={`absolute inset-0 flex flex-col items-center justify-center backface-hidden ${flipped ? 'opacity-0' : 'opacity-100'}`}>
                        <p className="font-tamil text-4xl text-tamil-200">{tamilScript}</p>
                        <span className="mt-3 text-xs text-gray-400">Tap to flip</span>
                    </div>
                    <div className={`absolute inset-0 flex flex-col items-center justify-center backface-hidden rotate-y-180 ${flipped ? 'opacity-100' : 'opacity-0'}`}>
                        <p className="text-xl text-ocean-200">{transliteration}</p>
                        <p className="mt-2 text-gray-200">{meaning}</p>
                        <p className="mt-2 text-sm text-gray-400">{example}</p>
                    </div>
                </button>
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => (isSpeaking ? stop() : speak(audioText || tamilScript, 0.95, 1, transliteration))}
                    className="btn-secondary"
                >
                    {isSpeaking ? 'Stop' : '🔈 Listen'}
                </button>
                <button
                    type="button"
                    onClick={() => onSubmit?.({ isCorrect: true, answer: tamilScript, timedOut: false })}
                    className="btn-primary"
                >
                    Mark Learned
                </button>
            </div>
        </div>
    );
}
