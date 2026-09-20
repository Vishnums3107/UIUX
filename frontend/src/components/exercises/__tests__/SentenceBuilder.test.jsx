import { fireEvent, render, screen } from '@testing-library/react';
import SentenceBuilder from '../SentenceBuilder';

describe('SentenceBuilder', () => {
    test('builds and submits ordered sentence', () => {
        const onSubmit = vi.fn();
        render(
            <SentenceBuilder
                sentenceParts={['சாதம்', 'சாப்பிடுகிறேன்', 'நான்']}
                correctOrder={[2, 0, 1]}
                onSubmit={onSubmit}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'நான்' }));
        fireEvent.click(screen.getByRole('button', { name: 'சாதம்' }));
        fireEvent.click(screen.getByRole('button', { name: 'சாப்பிடுகிறேன்' }));
        fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
            isCorrect: true
        }));
    });
});
