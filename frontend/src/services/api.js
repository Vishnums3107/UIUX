import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses (expired/invalid token)
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// --- Auth ---
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getProfile: () => api.get('/auth/profile'),
    getAdaptiveProfileInsights: () => api.get('/auth/adaptive-profile'),
    getTopicIntelligence: () => api.get('/auth/topic-intelligence'),
    getLearningDirectorInsights: () => api.get('/auth/learning-director'),
    updateProfile: (data) => api.put('/auth/profile', data),
    forgotPassword: (data) => api.post('/auth/forgotpassword', data),
    resetPassword: (token, data) => api.put(`/auth/resetpassword/${token}`, data)
};

// --- Lessons ---
export const lessonAPI = {
    getAll: (params) => api.get('/lessons', { params }),
    getById: (id) => api.get(`/lessons/${id}`),
    getCategories: () => api.get('/lessons/categories'),
    getStage: (stageNumber) => api.get(`/lessons/stage/${stageNumber}`),
    getStageProgress: () => api.get('/lessons/stages/progress'),
    getNextInStage: (stageNumber) => api.get(`/lessons/stage/${stageNumber}/next`),
    create: (data) => api.post('/lessons', data),
    update: (id, data) => api.put(`/lessons/${id}`, data),
    delete: (id) => api.delete(`/lessons/${id}`),
};

// --- Attempts ---
export const attemptAPI = {
    submit: (data) => api.post('/attempts', data),
    submitMastery: (data) => api.post('/attempts/mastery', data),
    getHistory: (params) => api.get('/attempts/history', { params }),
    getStats: () => api.get('/attempts/stats'),
    getReviewQueue: (params) => api.get('/attempts/review-queue', { params }),
};

// --- Admin ---
export const adminAPI = {
    getUsers: () => api.get('/admin/users'),
    getAnalytics: () => api.get('/admin/analytics'),
    getUserProgress: (id) => api.get(`/admin/users/${id}/progress`),
};

// --- Leaderboard ---
export const leaderboardAPI = {
    getTopUsers: () => api.get('/leaderboard'),
};

// --- Learner assistant ---
export const assistantAPI = {
    reply: (data) => api.post('/assistant/reply', data)
};

export default api;
