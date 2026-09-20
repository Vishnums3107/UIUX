import { fireEvent, render, screen } from '@testing-library/react';
import FillBlank from '../FillBlank';

describe('FillBlank', () => {
    test('supports option-based submission', () => {
        const onSubmit = vi.fn();
        render(
            <FillBlank
                sentence="எனக்கு [___] வேண்டும்."
                options={['தோசை', 'பால்', 'சோறு', 'நீர்']}
                correctAnswer="தோசை"
                onSubmit={onSubmit}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'தோசை' }));
        fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
            isCorrect: true,
            answer: 'தோசை'
        }));
    });
});
