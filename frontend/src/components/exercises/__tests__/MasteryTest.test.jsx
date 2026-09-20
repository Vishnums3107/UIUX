import { act, fireEvent, render, screen } from '@testing-library/react';
import MasteryTest from '../MasteryTest';

describe('MasteryTest', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    test('reports pass result at completion', () => {
        const onComplete = vi.fn();
        render(
            <MasteryTest
                stageNumber={1}
                questions={[{
                    question: 'Choose correct',
                    options: ['A', 'B', 'C', 'D'],
                    correctAnswer: 'A'
                }]}
                onComplete={onComplete}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'A' }));
        fireEvent.click(screen.getByRole('button', { name: /^Submit$/i }));

        expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
            passed: true,
            scorePercent: 100
        }));
    });

    test('auto-completes as failed when timer expires', () => {
        vi.useFakeTimers();
        const onComplete = vi.fn();

        render(
            <MasteryTest
                stageNumber={1}
                durationSeconds={1}
                questions={[{
                    question: 'Choose correct',
                    options: ['A', 'B', 'C', 'D'],
                    correctAnswer: 'A'
                }]}
                onComplete={onComplete}
            />
        );

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
            passed: false,
            scorePercent: 0,
            timedOut: true,
            timeSpent: 1
        }));
        expect(screen.getByText(/Time is up/i)).toBeInTheDocument();
    });
});
