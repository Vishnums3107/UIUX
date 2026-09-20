import { fireEvent, render, screen } from '@testing-library/react';
import AudioMCQ from '../AudioMCQ';

describe('AudioMCQ', () => {
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

    test('submits selected answer', () => {
        const onSubmit = vi.fn();
        render(
            <AudioMCQ
                audioText="அ"
                options={['அ', 'ஆ', 'இ', 'ஈ']}
                correctAnswer="அ"
                onSubmit={onSubmit}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'அ' }));
        fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
            isCorrect: true,
            answer: 'அ'
        }));
    });
});
