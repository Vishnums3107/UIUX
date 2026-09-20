import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Learn from '../Learn';

const updateUserMock = vi.fn();
const lessonGetAllMock = vi.fn();
const lessonGetStageMock = vi.fn();
const lessonGetNextInStageMock = vi.fn();
const attemptSubmitMock = vi.fn();
const attemptSubmitMasteryMock = vi.fn();
const attemptGetReviewQueueMock = vi.fn();
const authUpdateProfileMock = vi.fn();

let authState = {
    user: {
        level: 'Intermediate',
        skill_score: 50,
        lessons_completed: 0,
        name: 'Priya',
        adaptivePreferences: { modePreference: 'auto', immersiveModeDefault: false },
        adaptiveProfile: { recommendedMode: 'balanced', recommendedDifficulty: 'Intermediate' }
    },
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
        getAll: (...args) => lessonGetAllMock(...args),
        getStage: (...args) => lessonGetStageMock(...args),
        getNextInStage: (...args) => lessonGetNextInStageMock(...args)
    },
    attemptAPI: {
        submit: (...args) => attemptSubmitMock(...args),
        submitMastery: (...args) => attemptSubmitMasteryMock(...args),
        getReviewQueue: (...args) => attemptGetReviewQueueMock(...args)
    },
    authAPI: {
        updateProfile: (...args) => authUpdateProfileMock(...args)
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
    current_streak: 1,
    adaptiveProfile: {
        recommendedMode: 'balanced',
        recommendedDifficulty: 'Intermediate'
    }
};

function primeSuccessfulLoad() {
    lessonGetAllMock.mockResolvedValue({ data: [lessonFixture] });
    lessonGetStageMock.mockResolvedValue({ data: [lessonFixture] });
    lessonGetNextInStageMock.mockResolvedValue({ data: { lesson: lessonFixture } });
    authUpdateProfileMock.mockResolvedValue({
        data: {
            ...authState.user,
            adaptivePreferences: {
                modePreference: 'auto',
                immersiveModeDefault: false
            }
        }
    });
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
            user: {
                level: 'Intermediate',
                skill_score: 50,
                lessons_completed: 0,
                name: 'Priya',
                adaptivePreferences: { modePreference: 'auto', immersiveModeDefault: false },
                adaptiveProfile: { recommendedMode: 'balanced', recommendedDifficulty: 'Intermediate' }
            },
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
            user: {
                level: 'Advanced',
                skill_score: 80,
                lessons_completed: 0,
                name: 'Priya',
                adaptivePreferences: { modePreference: 'auto', immersiveModeDefault: false },
                adaptiveProfile: { recommendedMode: 'challenge', recommendedDifficulty: 'Advanced' }
            },
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

    test('stage mode loads stage lessons from query string', async () => {
        window.history.replaceState({}, '', '/learn?stage=2');
        primeSuccessfulLoad();

        render(<Learn />);

        await waitFor(() => {
            expect(lessonGetStageMock).toHaveBeenCalledWith(2);
        });

        expect(await screen.findByText(/Stage Mode/i)).toBeInTheDocument();
    });

    test('category mode from query string auto-loads selected category', async () => {
        window.history.replaceState({}, '', '/learn?category=grammar');
        primeSuccessfulLoad();

        render(<Learn />);

        await waitFor(() => {
            expect(lessonGetAllMock).toHaveBeenCalledWith({
                category: 'grammar',
                difficulty: 'Intermediate'
            });
        });

        expect(screen.queryByText(/Choose a Category/i)).not.toBeInTheDocument();
    });

    test('stage flow submits mastery checkpoint and shows unlocked stage banner', async () => {
        window.history.replaceState({}, '', '/learn?stage=1');

        const stageLesson = { ...lessonFixture, _id: 'lesson-1' };
        const masteryLesson = {
            ...lessonFixture,
            _id: 'mastery-1',
            question: 'Mastery Checkpoint',
            isMasteryTest: true,
            exerciseType: 'mastery_test',
            unlocksStage: 2
        };

        lessonGetStageMock.mockResolvedValue({ data: [stageLesson, masteryLesson] });
        lessonGetNextInStageMock.mockResolvedValue({ data: { lesson: stageLesson } });
        attemptSubmitMock.mockResolvedValue({
            data: { skillUpdate: skillUpdateFixture }
        });
        attemptSubmitMasteryMock.mockResolvedValue({
            data: {
                passed: true,
                unlockedStage: 2,
                user: {
                    xp: 210,
                    totalXP: 210,
                    xpEarned: 200,
                    unlockedStages: [1, 2],
                    masteryPassedStages: [1]
                },
                newBadges: [{ name: 'Mastery Stage 1', icon: '🏅' }]
            }
        });

        render(<Learn />);
        expect(await screen.findByText(/Stage Mode/i)).toBeInTheDocument();

        fireEvent.click(screen.getByText('submit-correct'));
        await waitFor(() => {
            expect(attemptSubmitMock).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(screen.getByText(/Question 2 of 2/i)).toBeInTheDocument();
        }, { timeout: 3000 });

        await waitFor(() => {
            expect(screen.getByTestId('adaptive-lesson-mock')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('submit-correct'));
        await waitFor(() => {
            expect(attemptSubmitMasteryMock).toHaveBeenCalledTimes(1);
        });

        expect(attemptSubmitMasteryMock).toHaveBeenCalledWith(expect.objectContaining({
            stageNumber: 1
        }));

        expect(await screen.findByText(/New stage unlocked: Stage 2/i, {}, { timeout: 4000 })).toBeInTheDocument();
    }, 10000);

    test('manual support mode lowers requested lesson difficulty on category launch', async () => {
        authState = {
            user: {
                level: 'Intermediate',
                skill_score: 40,
                lessons_completed: 0,
                name: 'Priya',
                adaptivePreferences: { modePreference: 'auto', immersiveModeDefault: false },
                adaptiveProfile: { recommendedMode: 'support', recommendedDifficulty: 'Beginner' }
            },
            updateUser: updateUserMock
        };

        primeSuccessfulLoad();
        render(<Learn />);

        fireEvent.click(screen.getByRole('button', { name: /^Support$/i }));
        fireEvent.click(screen.getByText(/Uyir Ezhuthukkal/i));

        await waitFor(() => {
            expect(lessonGetAllMock).toHaveBeenCalledWith({
                category: 'uyir',
                difficulty: 'Beginner'
            });
        });
    });
});
