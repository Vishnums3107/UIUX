import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';

const getStatsMock = vi.fn();
const getHistoryMock = vi.fn();
const getReviewQueueMock = vi.fn();
const updateProfileMock = vi.fn();
const refreshProfileMock = vi.fn();
const updateUserMock = vi.fn();

let authState = {
    user: {
        name: 'Priya',
        avatarId: 'avatar-1',
        skill_score: 64,
        lessons_completed: 12,
        current_streak: 4,
        badges: []
    },
    refreshProfile: refreshProfileMock,
    updateUser: updateUserMock
};

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => authState
}));

vi.mock('../../services/api', () => ({
    attemptAPI: {
        getStats: (...args) => getStatsMock(...args),
        getHistory: (...args) => getHistoryMock(...args),
        getReviewQueue: (...args) => getReviewQueueMock(...args)
    },
    authAPI: {
        updateProfile: (...args) => updateProfileMock(...args)
    }
}));

vi.mock('../../components/SkillMeter', () => ({
    default: () => <div data-testid="skill-meter-mock" />
}));

vi.mock('chart.js', () => ({
    Chart: { register: vi.fn() },
    CategoryScale: {},
    LinearScale: {},
    PointElement: {},
    LineElement: {},
    BarElement: {},
    Title: {},
    Tooltip: {},
    Legend: {},
    Filler: {},
    ArcElement: {}
}));

vi.mock('react-chartjs-2', () => ({
    Line: () => <div data-testid="line-chart-mock" />,
    Bar: () => <div data-testid="bar-chart-mock" />,
    Doughnut: () => <div data-testid="doughnut-chart-mock" />
}));

const dueLesson = {
    lesson: {
        _id: 'lesson-due',
        question: 'Due lesson',
        category: 'uyir',
        difficulty: 'Beginner'
    },
    stats: {
        dueAt: new Date(Date.now() - (60 * 60 * 1000)).toISOString(),
        reason: 'last_attempt_incorrect',
        consecutiveCorrect: 0,
        intervalHours: 0,
        avgScore: 0.4,
        avgErrors: 2,
        avgHints: 1
    }
};

const laterTodayLesson = {
    lesson: {
        _id: 'lesson-later',
        question: 'Later today lesson',
        category: 'grammar',
        difficulty: 'Intermediate'
    },
    stats: {
        dueAt: new Date(Date.now() + (2 * 60 * 60 * 1000)).toISOString(),
        reason: 'scheduled_review_due',
        consecutiveCorrect: 2,
        intervalHours: 12,
        avgScore: 0.8,
        avgErrors: 0.5,
        avgHints: 0.5
    }
};

const tomorrowDate = new Date();
tomorrowDate.setHours(24, 0, 0, 0);
tomorrowDate.setHours(10, 0, 0, 0);

const tomorrowLesson = {
    lesson: {
        _id: 'lesson-tomorrow',
        question: 'Tomorrow lesson',
        category: 'sentences',
        difficulty: 'Intermediate'
    },
    stats: {
        dueAt: tomorrowDate.toISOString(),
        reason: 'scheduled_review_due',
        consecutiveCorrect: 3,
        intervalHours: 24,
        avgScore: 0.9,
        avgErrors: 0,
        avgHints: 0
    }
};

describe('Dashboard review schedule panel', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        authState = {
            user: {
                name: 'Priya',
                avatarId: 'avatar-1',
                skill_score: 64,
                lessons_completed: 12,
                current_streak: 4,
                badges: []
            },
            refreshProfile: refreshProfileMock,
            updateUser: updateUserMock
        };

        getStatsMock.mockResolvedValue({
            data: {
                summary: {
                    avgScore: 0.8,
                    avgTime: 18,
                    avgErrors: 0.5,
                    avgHints: 0.2,
                    totalCorrect: 8
                },
                recentTrend: []
            }
        });

        getHistoryMock.mockResolvedValue({
            data: { attempts: [] }
        });

        getReviewQueueMock.mockResolvedValue({
            data: {
                total: 1,
                items: [dueLesson],
                weeklyTimeline: [
                    { date: new Date().toISOString(), label: 'Today', dueCount: 2 },
                    { date: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(), label: 'Fri', dueCount: 1 }
                ],
                completionStats: {
                    clearedToday: 3,
                    currentStreak: 2,
                    longestStreak: 4,
                    lastClearedAt: new Date().toISOString()
                },
                reviewBuckets: {
                    dueNow: { count: 1, items: [dueLesson] },
                    laterToday: { count: 1, items: [laterTodayLesson] },
                    tomorrow: { count: 1, items: [tomorrowLesson] }
                }
            }
        });
    });

    test('renders grouped upcoming review buckets', async () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(getReviewQueueMock).toHaveBeenCalledTimes(1);
        });

        expect((await screen.findAllByText(/Due Now/i)).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Later Today/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Tomorrow/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Due lesson/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Later today lesson/i)).toBeInTheDocument();
        expect(screen.getByText(/Tomorrow lesson/i)).toBeInTheDocument();
        expect(screen.getByText(/Review Calendar/i)).toBeInTheDocument();
        expect(screen.getAllByText(/3 reviews cleared today/i).length).toBeGreaterThan(0);
    });
});
