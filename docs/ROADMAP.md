# 🗺️ Development Roadmap — Adaptive Tamil Learning Platform

> Full 10-phase development roadmap from concept to production deployment.

> LEGACY NOTE: This roadmap is a historical implementation timeline and includes earlier content-count snapshots.
> For active launch scope, release gates, and sign-off criteria, use [DEPLOYMENT_READY_IMPLEMENTATION_PLAN.md](DEPLOYMENT_READY_IMPLEMENTATION_PLAN.md).
> Current curriculum baseline is 333 lessons (see `backend/seed.js` and `backend/tests/seed.validation.test.js`).

---

## Phase 1: Project Foundation & Architecture Design ✅

**Timeline:** Week 1  
**Milestone:** Project scaffold with tech stack configured

### Tasks
- [x] Define project requirements and feature scope
- [x] Select tech stack (React/Vite, Node/Express, MongoDB, Tailwind CSS)
- [x] Initialize project structure (`frontend/` + `backend/`)
- [x] Configure Vite with React plugin and API proxy
- [x] Configure Tailwind CSS with custom color palette (tamil/ocean themes)
- [x] Set up Google Fonts (Inter + Noto Sans Tamil)
- [x] Create `.env.example` files for both frontend and backend
- [x] Set up `.gitignore`

### Key Deliverables
| Deliverable | File |
|---|---|
| Frontend scaffold | `frontend/package.json`, `vite.config.js` |
| Tailwind config | `frontend/tailwind.config.js` |
| Design system | `frontend/src/index.css` |
| Backend scaffold | `backend/package.json`, `server.js` |

---

## Phase 2: Database Schema & Models ✅

**Timeline:** Week 1  
**Milestone:** All 3 Mongoose models with validation and indexes

### Tasks
- [x] Design User schema (name, email, password, skill_score, level, lessons_completed, role)
- [x] Implement password hashing middleware (bcrypt, 12 rounds)
- [x] Add `comparePassword` and `updateLevel` instance methods
- [x] Design Lesson schema (category, difficulty, type, question, options, correct_answer, hint, explanation)
- [x] Design LessonAttempt schema (user_id, lesson_id, time_spent, errors, hints_used, retries, idle_time, score)
- [x] Add compound indexes for performance (`category+difficulty+order`, `user_id+createdAt`)

### Key Deliverables
| Model | Fields | File |
|---|---|---|
| User | 7 fields + timestamps | `backend/models/User.js` |
| Lesson | 9 fields + timestamps | `backend/models/Lesson.js` |
| LessonAttempt | 9 fields + timestamps | `backend/models/LessonAttempt.js` |

---

## Phase 3: Authentication System ✅

**Timeline:** Week 2  
**Milestone:** Complete JWT-based auth with protected routes

### Tasks
- [x] Implement registration endpoint with express-validator
- [x] Implement login endpoint with JWT token generation
- [x] Implement profile retrieval endpoint
- [x] Create JWT auth middleware (token verification + user attachment)
- [x] Create admin role check middleware
- [x] Configure rate limiting (200 req / 15 min)
- [x] Configure CORS with configurable frontend URL

### Key Deliverables
| Endpoint | Method | Auth | File |
|---|---|---|---|
| `/api/auth/register` | POST | Public | `authController.js` |
| `/api/auth/login` | POST | Public | `authController.js` |
| `/api/auth/profile` | GET | JWT | `authController.js` |

---

## Phase 4: Tamil Learning Content ✅

**Timeline:** Week 2–3  
**Milestone:** 50+ lessons across 5 categories × 3 difficulty levels

### Tasks
- [x] Create Uyir (vowel) lessons — Beginner, Intermediate, Advanced
- [x] Create Mei (consonant) lessons — Beginner, Intermediate, Advanced
- [x] Create Uyir-Mei (combined) lessons — Beginner, Intermediate, Advanced
- [x] Create Grammar lessons — Beginner, Intermediate, Advanced
- [x] Create Sentence Formation lessons — Beginner, Intermediate, Advanced
- [x] Add pronunciation guidance questions across categories
- [x] Include bilingual content (English + Tamil) for all questions
- [x] Add hints and explanations for every lesson
- [x] Build database seeder script (`npm run seed`)

### Content Breakdown
| Category | Beginner | Intermediate | Advanced | Total |
|---|---|---|---|---|
| Uyir (Vowels) | 7 | 4 | 2 | 13 |
| Mei (Consonants) | 5 | 4 | 1 | 10 |
| Uyir-Mei (Combined) | 4 | 3 | 1 | 8 |
| Grammar | 4 | 5 | 4 | 13 |
| Sentences | 3 | 3 | 3 | 9 |
| **Total** | **23** | **19** | **11** | **53** |

---

## Phase 5: Lesson API & Attempt Tracking ✅

**Timeline:** Week 3  
**Milestone:** Full CRUD lesson API + attempt submission with skill recalculation

### Tasks
- [x] Implement lesson listing with query filters (difficulty, category)
- [x] Implement single lesson retrieval
- [x] Implement category summary aggregation
- [x] Implement attempt submission endpoint
- [x] Integrate skill score recalculation on each attempt
- [x] Implement paginated attempt history
- [x] Implement aggregated stats endpoint (daily averages for last 30 days)
- [x] Track level changes and adaptation direction in attempt response

### Key Deliverables
| Endpoint | Method | Purpose | File |
|---|---|---|---|
| `/api/lessons` | GET | List/filter lessons | `lessonController.js` |
| `/api/lessons/categories` | GET | Category summary | `lessonController.js` |
| `/api/lessons/:id` | GET | Single lesson | `lessonController.js` |
| `/api/attempts` | POST | Submit + recalculate | `attemptController.js` |
| `/api/attempts/history` | GET | Paginated history | `attemptController.js` |
| `/api/attempts/stats` | GET | Dashboard stats | `attemptController.js` |

---

## Phase 6: Skill Estimation Engine ✅

**Timeline:** Week 3–4  
**Milestone:** Real-time proficiency score with smoothed transitions

### Tasks
- [x] Implement success rate calculation (% correct in rolling window of 20)
- [x] Implement time efficiency score (30s expected, linear degradation to 3×)
- [x] Implement error rate normalization (max 5 errors/question)
- [x] Implement hint dependency score (max 3 hints/question)
- [x] Apply weighted multi-signal formula with recency weighting and retry/idle signals
- [x] Implement confidence-aware score smoothing (higher trust with larger sample size)
- [x] Clamp final score to 0–100 range
- [x] Map score to levels: 0–30 Beginner, 31–70 Intermediate, 71–100 Advanced

### Key Deliverable
| File | Function | Output |
|---|---|---|
| `backend/utils/skillEngine.js` | `calculateSkillScore()` | `{ skillScore, level, details }` |

---

## Phase 7: Frontend — Authentication & Context ✅

**Timeline:** Week 4  
**Milestone:** Complete auth flow with persistent session

### Tasks
- [x] Create Axios API client with JWT interceptors
- [x] Implement auto-redirect on 401 responses
- [x] Build AuthContext with login, register, logout, updateUser, refreshProfile
- [x] Persist auth state in localStorage
- [x] Create ProtectedRoute, AdminRoute, PublicRoute wrapper components
- [x] Build Login page with error handling and loading states
- [x] Build Register page with password confirmation
- [x] Build responsive Navbar with skill display and navigation

### Key Deliverables
| Component | File |
|---|---|
| API Service | `frontend/src/services/api.js` |
| Auth Context | `frontend/src/context/AuthContext.jsx` |
| Route Guards | `frontend/src/App.jsx` |
| Login Page | `frontend/src/pages/Login.jsx` |
| Register Page | `frontend/src/pages/Register.jsx` |
| Navbar | `frontend/src/components/Navbar.jsx` |

---

## Phase 8: Frontend — Adaptive Learning Interface ✅

**Timeline:** Week 5  
**Milestone:** Fully adaptive lesson UI with interaction tracking

### Tasks
- [x] Build `useInteractionTracker` hook (start time, errors, hints, retries, idle detection)
- [x] Implement 30-second idle time threshold detection
- [x] Build `AdaptiveLesson` component with 3 rendering modes
- [x] Implement Beginner mode: large Tamil text, visible hints, bilingual labels, step-by-step guidance, spacious layout
- [x] Implement Intermediate mode: moderate layout, hints hidden by default, standard density
- [x] Implement Advanced mode: compact UI, no auto-hints, 60-second countdown timer, auto-submit on timeout
- [x] Build category selection screen with icons and descriptions
- [x] Build lesson progress bar
- [x] Build session completion screen with score summary
- [x] Implement MCQ and text input question types
- [x] Build feedback animations (success/error with scale-in effect)
- [x] Connect attempt submission to backend with skill update propagation

### Key Deliverables
| Component | File |
|---|---|
| Interaction Tracker | `frontend/src/hooks/useInteractionTracker.js` |
| Adaptive Lesson | `frontend/src/components/AdaptiveLesson.jsx` |
| Learn Page | `frontend/src/pages/Learn.jsx` |

---

## Phase 9: Frontend — Dashboard & Admin ✅

**Timeline:** Week 5–6  
**Milestone:** Rich analytics dashboards for users and admins

### Tasks
- [x] Build animated circular SkillMeter (canvas-based with gradient arc)
- [x] Build Dashboard with stat cards (lessons, accuracy, avg time, errors, hints, correct count)
- [x] Integrate Chart.js — performance trend line chart
- [x] Integrate Chart.js — error trend bar chart
- [x] Integrate Chart.js — daily activity bar chart
- [x] Build recent activity table with populated lesson data
- [x] Build Admin Panel with overview cards (total users, avg skill, avg lessons)
- [x] Build Admin level distribution doughnut chart
- [x] Build Admin weekly activity chart
- [x] Build Admin users table with search and level filtering
- [x] Style all charts with dark theme (gray backgrounds, colored datasets)

### Key Deliverables
| Component | File |
|---|---|
| Skill Meter | `frontend/src/components/SkillMeter.jsx` |
| Dashboard | `frontend/src/pages/Dashboard.jsx` |
| Admin Panel | `frontend/src/pages/AdminPanel.jsx` |

---

## Phase 10: Deployment & Documentation ✅

**Timeline:** Week 6–7  
**Milestone:** Production deployment + complete documentation suite

### Tasks
- [x] Set up MongoDB Atlas cluster
- [x] Configure backend for production (env variables, CORS)
- [x] Deploy backend to Render/Railway
- [x] Build frontend production bundle
- [x] Deploy frontend to Vercel/Netlify
- [x] Configure HTTPS
- [x] Write comprehensive README.md
- [x] Write ROADMAP.md (this document)
- [x] Write CHECKLIST.md
- [x] Write ARCHITECTURE.md
- [x] Write API_DOCUMENTATION.md
- [x] Write DEPLOYMENT.md
- [x] Write ENV_CONFIGURATION.md

---

## Phase 11: CMS & UI Enhancements ✅

**Timeline:** Week 7  
**Milestone:** Admin Content Management System + UI Polish

### Tasks
- [x] Implement Light/Dark mode toggling via `ThemeContext`
- [x] Add interactive audio pronunciations (Web Audio API)
- [x] Implement Daily Streak counter tracking
- [x] Design Admin "Manage Lessons" portal
- [x] Build adaptive `LessonFormModal` with dynamic MCQ options
- [x] Implement backend CRUD API for lessons (admin-only)
- [x] Refactor existing Dashboard UI to support new metrics

### Key Deliverables
| Component/API | File |
|---|---|
| CMS Component | `frontend/src/pages/AdminLessons.jsx` |
| Lesson API Endpoints | `backend/routes/lessonRoutes.js` |
| Theme Provider | `frontend/src/context/ThemeContext.jsx` |

---

## 📊 Summary

| Phase | Status | Key Outcome |
|---|---|---|
| 1. Foundation | ✅ | Project scaffold, design system |
| 2. Database | ✅ | 3 Mongoose models with indexes |
| 3. Authentication | ✅ | JWT auth + role-based access |
| 4. Content | ✅ | 53 Tamil lessons with seed script |
| 5. API | ✅ | 12 REST endpoints with validation |
| 6. Skill Engine | ✅ | Weighted proficiency algorithm |
| 7. Auth Frontend | ✅ | Auth context, route guards, forms |
| 8. Learning UI | ✅ | Adaptive 3-mode lesson interface |
| 9. Dashboards | ✅ | Chart.js analytics for users + admins |
| 10. Deployment | ✅ | Cloud hosting + documentation suite |
| 11. CMS & Polish | ✅ | Admin content editor + Light/Dark themes |

> **Total development time:** ~8 weeks  
> **Total source files:** 30+  
> **Total lesson content:** 54+ questions (Dynamic via CMS)
