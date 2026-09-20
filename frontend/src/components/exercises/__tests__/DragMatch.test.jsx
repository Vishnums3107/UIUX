import { fireEvent, render, screen } from '@testing-library/react';
import DragMatch from '../DragMatch';

describe('DragMatch', () => {
    test('submits correct item-target mapping', () => {
        const onSubmit = vi.fn();

        render(
            <DragMatch
                dragItems={['கண்', 'கை']}
                dragTargets={['eye', 'hand']}
                onSubmit={onSubmit}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'கண்' }));
        fireEvent.click(screen.getByRole('button', { name: 'eye' }));
        fireEvent.click(screen.getByRole('button', { name: 'கை' }));
        fireEvent.click(screen.getByRole('button', { name: 'hand' }));
        fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
            isCorrect: true
        }));
    });
});
