import { fireEvent, render, screen } from '@testing-library/react';
import AdaptiveLesson from '../AdaptiveLesson';

describe('AdaptiveLesson exerciseType rendering', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'speechSynthesis', {
            configurable: true,
            value: {
                speak: vi.fn(),
                cancel: vi.fn(),
                getVoices: vi.fn(() => [{ lang: 'ta-IN', name: 'Tamil' }])
            }
        });
        global.SpeechSynthesisUtterance = class {
            constructor(text) {
                this.text = text;
                this.lang = '';
                this.rate = 1;
                this.pitch = 1;
            }
        };
    });

    test('renders exercise component by exerciseType and submits', () => {
        const onSubmit = vi.fn();
        render(
            <AdaptiveLesson
                level="Intermediate"
                onSubmit={onSubmit}
                lesson={{
                    stage: 1,
                    stageOrder: 1,
                    exerciseType: 'text_mcq',
                    question: 'Pick first vowel',
                    question_tamil: 'முதல் உயிரை தேர்வு செய்',
                    options: ['அ', 'ஆ', 'இ', 'ஈ'],
                    correct_answer: 'அ',
                    transliteration: 'a'
                }}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'அ' }));
        fireEvent.click(screen.getByRole('button', { name: /^Submit$/i }));

        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
            isCorrect: true
        }));
    });
});
