import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LearnerAssistDock from '../LearnerAssistDock';

const toggleThemeMock = vi.fn();
const assistantReplyMock = vi.fn();

let authState = {
    user: {
        name: 'Priya',
        level: 'Intermediate',
        current_streak: 4
    }
};

let themeState = {
    theme: 'dark',
    toggleTheme: toggleThemeMock
};

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => authState
}));

vi.mock('../../context/ThemeContext', () => ({
    useTheme: () => themeState
}));

vi.mock('../../services/api', () => ({
    assistantAPI: { reply: (...args) => assistantReplyMock(...args) }
}));

describe('LearnerAssistDock', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        assistantReplyMock.mockRejectedValue(new Error('Assistant unavailable'));
        authState = {
            user: {
                name: 'Priya',
                level: 'Intermediate',
                current_streak: 4
            }
        };
        themeState = {
            theme: 'dark',
            toggleTheme: toggleThemeMock
        };
    });

    test('opens assistant panel and shows help content', () => {
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <LearnerAssistDock onOpenCommandCenter={vi.fn()} />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: /toggle learner assistant/i }));
        expect(screen.getByRole('dialog', { name: /learner assist panel/i })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /^Help$/i }));
        expect(screen.getByText(/Keyboard shortcuts/i)).toBeInTheDocument();
        expect(screen.getByText(/Adaptive Modes/i)).toBeInTheDocument();
    });

    test('quick actions tab can trigger command center action', () => {
        const onOpenCommandCenter = vi.fn();
        render(
            <MemoryRouter initialEntries={['/learn']}>
                <LearnerAssistDock onOpenCommandCenter={onOpenCommandCenter} />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: /toggle learner assistant/i }));
        fireEvent.click(screen.getByRole('button', { name: /^Quick Actions$/i }));

        fireEvent.click(screen.getByRole('button', { name: /Open Command Center/i }));
        expect(onOpenCommandCenter).toHaveBeenCalledTimes(1);
    });

    test('uses the local learning helper when no Gemini key is configured', async () => {
        render(
            <MemoryRouter initialEntries={['/learn']}>
                <LearnerAssistDock onOpenCommandCenter={vi.fn()} />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: /toggle learner assistant/i }));
        fireEvent.change(screen.getByPlaceholderText(/Ask for study help/i), { target: { value: 'how to start' } });
        fireEvent.click(screen.getByRole('button', { name: /^Send$/i }));

        expect(await screen.findByText(/Use the Help tab for practical learning tips/i)).toBeInTheDocument();
    });

    test('global keyboard shortcut toggles dock and escape closes it', () => {
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <LearnerAssistDock onOpenCommandCenter={vi.fn()} />
            </MemoryRouter>
        );

        fireEvent.keyDown(window, { key: 'H', ctrlKey: true, shiftKey: true });
        expect(screen.getByRole('dialog', { name: /learner assist panel/i })).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByRole('dialog', { name: /learner assist panel/i })).not.toBeInTheDocument();
    });
});
