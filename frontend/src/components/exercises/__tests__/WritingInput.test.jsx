import { fireEvent, render, screen } from '@testing-library/react';
import WritingInput from '../WritingInput';

describe('WritingInput', () => {
    test('accepts model answer and submits', () => {
        const onSubmit = vi.fn();
        render(
            <WritingInput
                writingPrompt="Write a Tamil sentence."
                modelAnswer="என் பெயர் அருண்."
                acceptedAnswers={['என் பேர் அருண்.']}
                onSubmit={onSubmit}
            />
        );

        fireEvent.change(screen.getByPlaceholderText(/தமிழில் தட்டச்சு செய்/i), {
            target: { value: 'என் பெயர் அருண்.' }
        });
        fireEvent.click(screen.getByRole('button', { name: /^Submit$/i }));

        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
            isCorrect: true
        }));
    });
});
