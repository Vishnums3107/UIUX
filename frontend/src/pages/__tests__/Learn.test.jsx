import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Learn from '../Learn';

const updateUserMock = vi.fn();
const lessonGetAllMock = vi.fn();
const attemptSubmitMock = vi.fn();
const attemptGetReviewQueueMock = vi.fn();

let authState = {
    user: { level: 'Intermediate', skill_score: 50, lessons_completed: 0, name: 'Priya' },
    updateUser: updateUserMock
};

let trackerState = {
    startTracking: vi.fn(),
    completeTracking: vi.fn(() => ({
        time_spent: 12,
        errors: 0,
        hints_used: 0,
        retries: 0,
        idle_time: 0
    })),
    recordHint: vi.fn(),
    recordError: vi.fn(),
    recordRetry: vi.fn(),
    recordActivity: vi.fn()
};

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => authState
}));

vi.mock('../../services/api', () => ({
    lessonAPI: {
        getAll: (...args) => lessonGetAllMock(...args)
    },
    attemptAPI: {
        submit: (...args) => attemptSubmitMock(...args),
        getReviewQueue: (...args) => attemptGetReviewQueueMock(...args)
    }
}));

vi.mock('../../hooks/useInteractionTracker', () => ({
    useInteractionTracker: () => trackerState
}));

vi.mock('../../components/AdaptiveLesson', () => ({
    default: (props) => (
        <div data-testid="adaptive-lesson-mock">
            <div data-testid="time-left">{props.timeLeft ?? 'none'}</div>
            <button onClick={() => props.onAnswerChange?.('அ')}>set-answer</button>
            <button onClick={() => props.onSubmit?.({ isCorrect: true, answer: 'அ', timedOut: false })}>submit-correct</button>
            <button onClick={() => props.onSubmit?.({ isCorrect: false, answer: 'X', timedOut: false })}>submit-wrong</button>
            <button onClick={() => props.onRetry?.()}>retry</button>
        </div>
    )
}));

const lessonFixture = {
    _id: '65b2c3d4e5f6a7b8c9d0e1f2',
    category: 'uyir',
    difficulty: 'Beginner',
    type: 'mcq',
    question: 'What is first Tamil vowel?',
    correct_answer: 'அ',
    options: ['அ', 'ஆ', 'இ']
};

const skillUpdateFixture = {
    skill_score: 61,
    level: 'Intermediate',
    lessons_completed: 1,
    current_streak: 1
};

function primeSuccessfulLoad() {
    lessonGetAllMock.mockResolvedValue({ data: [lessonFixture] });
    attemptGetReviewQueueMock.mockResolvedValue({
        data: { total: 1, items: [{ lesson: lessonFixture, stats: { avgScore: 0.2, incorrectCount: 1, avgErrors: 2, avgHints: 1 } }] }
    });
    attemptSubmitMock.mockResolvedValue({
        data: { skillUpdate: skillUpdateFixture }
    });
}

describe('Learn flow behaviors', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.history.replaceState({}, '', '/learn');

        authState = {
            user: { level: 'Intermediate', skill_score: 50, lessons_completed: 0, name: 'Priya' },
            updateUser: updateUserMock
        };

        trackerState = {
            startTracking: vi.fn(),
            completeTracking: vi.fn(() => ({
                time_spent: 12,
                errors: 0,
                hints_used: 0,
                retries: 0,
                idle_time: 0
            })),
            recordHint: vi.fn(),
            recordError: vi.fn(),
            recordRetry: vi.fn(),
            recordActivity: vi.fn()
        };
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('submit flow sends payload and completes session', async () => {
        primeSuccessfulLoad();
        render(<Learn />);

        fireEvent.click(screen.getByText(/Uyir Ezhuthukkal/i));
        await screen.findByTestId('adaptive-lesson-mock');

        fireEvent.click(screen.getByText('submit-correct'));

        await waitFor(() => {
            expect(attemptSubmitMock).toHaveBeenCalledTimes(1);
        });

        expect(attemptSubmitMock).toHaveBeenCalledWith(expect.objectContaining({
            lesson_id: lessonFixture._id,
            score: 1,
            answer_given: 'அ'
        }));
        expect(updateUserMock).toHaveBeenCalledWith(expect.objectContaining({
            skill_score: 61,
            lessons_completed: 1
        }));

        expect(await screen.findByText(/Session Complete!/i, {}, { timeout: 3000 })).toBeInTheDocument();
    });

    test('retry action does not submit but records retry interaction', async () => {
        primeSuccessfulLoad();
        render(<Learn />);

        fireEvent.click(screen.getByText(/Uyir Ezhuthukkal/i));
        await screen.findByTestId('adaptive-lesson-mock');

        fireEvent.click(screen.getByText('retry'));
        expect(trackerState.recordRetry).toHaveBeenCalledTimes(1);
        expect(attemptSubmitMock).not.toHaveBeenCalled();
    });

    test('shows badge notification when backend returns new badges', async () => {
        lessonGetAllMock.mockResolvedValue({ data: [lessonFixture] });
        attemptSubmitMock.mockResolvedValue({
            data: {
                skillUpdate: {
                    ...skillUpdateFixture,
                    new_badges: [{ name: 'First Step', icon: '🌱' }]
                }
            }
        });

        render(<Learn />);
        fireEvent.click(screen.getByText(/Uyir Ezhuthukkal/i));
        await screen.findByTestId('adaptive-lesson-mock');

        fireEvent.click(screen.getByText('submit-correct'));

        expect(await screen.findByText(/New Badge Unlocked!/i)).toBeInTheDocument();
        expect(screen.getByText(/First Step/i)).toBeInTheDocument();
    });

    test('advanced timeout auto-submits current answer and marks timeout in summary', async () => {
        vi.useFakeTimers();

        authState = {
            user: { level: 'Advanced', skill_score: 80, lessons_completed: 0, name: 'Priya' },
            updateUser: updateUserMock
        };
        primeSuccessfulLoad();

        render(<Learn />);
        fireEvent.click(screen.getByText(/Uyir Ezhuthukkal/i));
        await act(async () => {
            await Promise.resolve();
        });
        expect(screen.getByTestId('adaptive-lesson-mock')).toBeInTheDocument();

        fireEvent.click(screen.getByText('set-answer'));

        await act(async () => {
            vi.advanceTimersByTime(60000);
            await Promise.resolve();
        });

        expect(attemptSubmitMock).toHaveBeenCalledTimes(1);

        expect(attemptSubmitMock).toHaveBeenCalledWith(expect.objectContaining({
            score: 1,
            answer_given: 'அ'
        }));

        await act(async () => {
            vi.advanceTimersByTime(1600);
            await Promise.resolve();
        });

        expect(screen.getByText(/Timed out on 1 question/i)).toBeInTheDocument();
        vi.useRealTimers();
    }, 10000);

    test('review mode loads review queue lessons from query string', async () => {
        window.history.replaceState({}, '', '/learn?mode=review');
        primeSuccessfulLoad();

        render(<Learn />);

        await waitFor(() => {
            expect(attemptGetReviewQueueMock).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByText(/Review Queue/i)).toBeInTheDocument();
        expect(screen.queryByText(/Choose a Category/i)).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('submit-correct'));

        await waitFor(() => {
            expect(attemptSubmitMock).toHaveBeenCalledWith(expect.objectContaining({
                lesson_id: lessonFixture._id
            }));
        });
    });
});
