import { fireEvent, render, screen } from '@testing-library/react';
import SpeedRound from '../SpeedRound';

describe('SpeedRound', () => {
    test('completes and reports score', () => {
        const onComplete = vi.fn();
        render(
            <SpeedRound
                questions={[{
                    question: 'Pick vowel',
                    options: ['அ', 'ஆ', 'இ', 'ஈ'],
                    correctAnswer: 'அ'
                }]}
                onComplete={onComplete}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'அ' }));

        expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
            score: 1,
            scorePercent: 100
        }));
    });
});
