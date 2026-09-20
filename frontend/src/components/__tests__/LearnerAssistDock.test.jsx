import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LearnerAssistDock from '../LearnerAssistDock';

const toggleThemeMock = vi.fn();

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

describe('LearnerAssistDock', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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

    test('sends message to Gemini API and displays response', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({
                    candidates: [{ content: { parts: [{ text: 'Here is your help from Gemini!' }] } }]
                })
            })
        );

        render(
            <MemoryRouter initialEntries={['/learn']}>
                <LearnerAssistDock onOpenCommandCenter={vi.fn()} />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: /toggle learner assistant/i }));
        fireEvent.change(screen.getByPlaceholderText(/Ask for study help/i), { target: { value: 'how to start' } });
        fireEvent.click(screen.getByRole('button', { name: /^Send$/i }));

        expect(await screen.findByText('Here is your help from Gemini!')).toBeInTheDocument();
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
