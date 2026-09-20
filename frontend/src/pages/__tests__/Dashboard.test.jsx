import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';

const getStatsMock = vi.fn();
const getHistoryMock = vi.fn();
const getReviewQueueMock = vi.fn();
const getStageProgressMock = vi.fn();
const getAdaptiveProfileInsightsMock = vi.fn();
const getTopicIntelligenceMock = vi.fn();
const getLearningDirectorInsightsMock = vi.fn();
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
        badges: [],
        adaptivePreferences: { modePreference: 'auto', immersiveModeDefault: false },
        adaptiveProfile: {
            recommendedMode: 'balanced',
            recommendedDifficulty: 'Intermediate',
            supportNeed: 42,
            challengeReadiness: 58,
            stabilityScore: 61,
            confidenceScore: 70,
            lastUpdatedAt: '2026-04-20T10:00:00.000Z'
        }
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
    lessonAPI: {
        getStageProgress: (...args) => getStageProgressMock(...args)
    },
    authAPI: {
        getAdaptiveProfileInsights: (...args) => getAdaptiveProfileInsightsMock(...args),
        getTopicIntelligence: (...args) => getTopicIntelligenceMock(...args),
        getLearningDirectorInsights: (...args) => getLearningDirectorInsightsMock(...args),
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
    RadialLinearScale: {},
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
    ,
    Radar: () => <div data-testid="radar-chart-mock" />
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
                badges: [],
                adaptivePreferences: { modePreference: 'auto', immersiveModeDefault: false },
                adaptiveProfile: {
                    recommendedMode: 'balanced',
                    recommendedDifficulty: 'Intermediate',
                    supportNeed: 42,
                    challengeReadiness: 58,
                    stabilityScore: 61,
                    confidenceScore: 70,
                    lastUpdatedAt: '2026-04-20T10:00:00.000Z'
                }
            },
            refreshProfile: refreshProfileMock,
            updateUser: updateUserMock
        };

        updateProfileMock.mockResolvedValue({
            data: authState.user
        });

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

        getStageProgressMock.mockResolvedValue({
            data: [
                { stage: 1, totalLessons: 2, completedLessons: 1, unlocked: true, masteryPassed: false },
                { stage: 2, totalLessons: 2, completedLessons: 0, unlocked: false, masteryPassed: false }
            ]
        });

        getAdaptiveProfileInsightsMock.mockResolvedValue({
            data: {
                adaptivePreferences: { modePreference: 'auto', immersiveModeDefault: false },
                adaptiveProfile: {
                    recommendedMode: 'balanced',
                    recommendedDifficulty: 'Intermediate',
                    supportNeed: 42,
                    challengeReadiness: 58,
                    stabilityScore: 61,
                    confidenceScore: 70,
                    lastUpdatedAt: '2026-04-20T10:00:00.000Z'
                },
                categoryRecommendations: [
                    {
                        category: 'uyir',
                        recommendedMode: 'support',
                        recommendedDifficulty: 'Beginner',
                        supportNeed: 78,
                        challengeReadiness: 30,
                        confidenceScore: 44,
                        reason: 'Needs support: 42% accuracy with 1.7 avg errors and 1.0 avg hints.'
                    },
                    {
                        category: 'grammar',
                        recommendedMode: 'challenge',
                        recommendedDifficulty: 'Advanced',
                        supportNeed: 24,
                        challengeReadiness: 81,
                        confidenceScore: 52,
                        reason: 'Ready to stretch: 90% accuracy with low friction in this category.'
                    }
                ],
                generatedAt: '2026-04-21T00:00:00.000Z',
                attemptWindowSize: 24
            }
        });

        getTopicIntelligenceMock.mockResolvedValue({
            data: {
                activeStage: 2,
                pendingMasteryStages: [2],
                categoryMasteryMap: [
                    {
                        category: 'uyir',
                        attemptCount: 10,
                        masteryScore: 38,
                        weaknessPressure: 82,
                        confidenceScore: 44,
                        recommendedMode: 'support',
                        recommendedDifficulty: 'Beginner',
                        reason: 'Topic needs reinforcement before progression.'
                    },
                    {
                        category: 'grammar',
                        attemptCount: 8,
                        masteryScore: 76,
                        weaknessPressure: 29,
                        confidenceScore: 67,
                        recommendedMode: 'challenge',
                        recommendedDifficulty: 'Advanced',
                        reason: 'Grammar is stable enough for additional stretch.'
                    }
                ],
                stageCategoryRecommendations: [
                    {
                        stage: 2,
                        category: 'uyir',
                        recommendedMode: 'support',
                        recommendedDifficulty: 'Beginner',
                        weaknessPressure: 82,
                        confidenceScore: 44,
                        priorityScore: 86,
                        reason: 'Stage 2 should focus uyir with support guidance due to high weakness pressure.'
                    }
                ],
                sequencingPlan: [
                    {
                        rank: 1,
                        sessionMode: 'category',
                        category: 'uyir',
                        stage: 2,
                        recommendedMode: 'support',
                        recommendedDifficulty: 'Beginner',
                        priorityScore: 86,
                        estimatedMinutes: 15,
                        reason: 'Highest weakness pressure for active stage.'
                    }
                ],
                generatedAt: '2026-04-21T00:00:00.000Z',
                attemptWindowSize: 24
            }
        });

        getLearningDirectorInsightsMock.mockResolvedValue({
            data: {
                activeStage: 2,
                stageConfidenceBands: [
                    {
                        stage: 2,
                        attemptCount: 12,
                        accuracy: 62,
                        avgErrors: 1.4,
                        avgHints: 1.1,
                        avgRetries: 0.8,
                        confidenceScore: 56,
                        readinessScore: 61,
                        confidenceBand: 'developing',
                        recommendedMode: 'support'
                    }
                ],
                nextBestSessions: [
                    {
                        rank: 1,
                        sessionMode: 'category',
                        stage: 2,
                        category: 'uyir',
                        recommendedMode: 'support',
                        recommendedDifficulty: 'Beginner',
                        estimatedMinutes: 14,
                        priorityScore: 84,
                        objective: 'Stabilize accuracy in uyir for Stage 2 with guided repetition.',
                        reason: 'Weakness pressure remains high in uyir.',
                        actionPath: '/learn?category=uyir'
                    }
                ],
                recoveryPlan: {
                    required: true,
                    triggerReason: 'Recovery triggered by repeated struggle signatures in recent attempts.',
                    focusAreas: [
                        {
                            category: 'uyir',
                            weaknessPressure: 82,
                            recommendedMode: 'support'
                        }
                    ],
                    plan: [
                        {
                            order: 1,
                            title: 'Reset with guided accuracy blocks',
                            action: 'Run support sessions first.',
                            successMetric: 'Reach 72% accuracy.'
                        }
                    ],
                    signalSummary: {
                        windowSize: 8,
                        incorrectCount: 5,
                        hintHeavyCount: 6,
                        retryHeavyCount: 4,
                        highFrictionCount: 5
                    },
                    targetOutcomes: {
                        accuracyTarget: 72,
                        maxAvgHints: 1.2,
                        maxAvgRetries: 1
                    },
                    horizonDays: 7
                },
                workloadPlan: {
                    recommendedSessionsPerDay: 1,
                    sessionMinutesRange: { min: 10, max: 18 },
                    restDaySuggested: false,
                    streakWeight: 52,
                    reason: 'Workload reduced to protect confidence while recovery plan runs.'
                },
                masteryForecast: {
                    stage: 2,
                    confidenceBand: 'developing',
                    readinessPercent: 61,
                    masteryLikelyInDays: 6,
                    isReadyForMasteryTest: false,
                    blockingFactors: ['Recovery plan is active due to recent struggle signatures.'],
                    greenFlags: ['No acute recovery blockers detected.']
                },
                learningArc: {
                    arcName: 'Flow To Fluency Arc',
                    currentPhase: 'Pattern Consolidation',
                    nextMilestone: 'Raise Stage 2 readiness to 76+',
                    milestones: [
                        {
                            order: 1,
                            label: 'Stabilize Active Stage',
                            targetStage: 2,
                            successSignal: 'Confidence band reaches stable.'
                        }
                    ],
                    fluencyOutcome: 'Learner is building toward reliable stage mastery with structured confidence growth.',
                    narrative: 'Priya is currently in Pattern Consolidation.'
                },
                generatedAt: '2026-04-21T00:00:00.000Z',
                attemptWindowSize: 24
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
        expect(getStageProgressMock).toHaveBeenCalledTimes(1);
        expect(getAdaptiveProfileInsightsMock).toHaveBeenCalledTimes(1);
        expect(getTopicIntelligenceMock).toHaveBeenCalledTimes(1);
        expect(getLearningDirectorInsightsMock).toHaveBeenCalledTimes(1);

        expect((await screen.findAllByText(/Due Now/i)).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Later Today/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Tomorrow/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Due lesson/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Later today lesson/i)).toBeInTheDocument();
        expect(screen.getByText(/Tomorrow lesson/i)).toBeInTheDocument();
        expect(screen.getByText(/Review Calendar/i)).toBeInTheDocument();
        expect(screen.getAllByText(/3 reviews cleared today/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Learning Path/i)).toBeInTheDocument();
        expect(screen.getByText(/Adaptive Profile/i)).toBeInTheDocument();
        expect(screen.getByText(/Persistent learning posture/i)).toBeInTheDocument();
        expect(screen.getByText(/Category Guidance/i)).toBeInTheDocument();
        expect(screen.getByText(/Needs support: 42% accuracy/i)).toBeInTheDocument();
        expect(screen.getByText(/Ready to stretch: 90% accuracy/i)).toBeInTheDocument();
        expect(screen.getByText(/Phase 3 Topic Intelligence/i)).toBeInTheDocument();
        expect(screen.getByText(/Mastery pressure and next-best sequencing/i)).toBeInTheDocument();
        expect(screen.getByText(/Highest weakness pressure for active stage./i)).toBeInTheDocument();
        expect(screen.getByText(/Phase 5 Learning Director/i)).toBeInTheDocument();
        expect(screen.getByText(/Directed sessions and mastery forecasting/i)).toBeInTheDocument();
        expect(screen.getByText(/Recovery triggered by repeated struggle signatures/i)).toBeInTheDocument();
    });
});
