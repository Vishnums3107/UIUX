import { fireEvent, render, screen } from '@testing-library/react';
import FlashCard from '../FlashCard';

describe('FlashCard', () => {
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
            }
        };
    });

    test('marks flashcard as learned', () => {
        const onSubmit = vi.fn();
        render(
            <FlashCard
                tamilScript="அ"
                transliteration="a"
                meaning="first vowel"
                example="அ என்பது முதல் உயிர்."
                audioText="அ"
                onSubmit={onSubmit}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Mark Learned/i }));
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
            isCorrect: true
        }));
    });
});
