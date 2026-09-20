import { fireEvent, render, screen } from '@testing-library/react';
import ReadingPassage from '../ReadingPassage';

describe('ReadingPassage', () => {
    test('submits selected comprehension answer', () => {
        const onSubmit = vi.fn();
        render(
            <ReadingPassage
                passageTitle="Reading 1"
                passage={'ரவி காலை எழுகிறார்.\nஅவர் புத்தகம் படிக்கிறார்.'}
                question="Best summary?"
                exerciseType="comprehension_mcq"
                options={['ரவி காலை எழுகிறார்.', 'ரவி தூங்குகிறார்.', 'ரவி போகவில்லை.', 'தெரியாது']}
                correctAnswer="ரவி காலை எழுகிறார்."
                onSubmit={onSubmit}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'ரவி காலை எழுகிறார்.' }));
        fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
            isCorrect: true
        }));
    });
});
