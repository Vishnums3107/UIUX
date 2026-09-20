# 🏗 System Architecture — Adaptive Tamil Learning Platform

> Complete architecture documentation covering components, data flows, database schema, and engine algorithms.

> Launch Readiness Governance: [DEPLOYMENT_READY_IMPLEMENTATION_PLAN.md](DEPLOYMENT_READY_IMPLEMENTATION_PLAN.md) is the canonical execution and sign-off source.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Auth Pages  │  │  Learn Page  │  │ Dashboard / Admin      │  │
│  │ Login       │  │  Category    │  │ SkillMeter  Charts     │  │
│  │ Register    │  │  Adaptive    │  │ StatCards   UserTable  │  │
│  │             │  │  Lesson      │  │ History     Analytics  │  │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬─────────────┘  │
│         │                │                     │                │
│  ┌──────▼────────────────▼─────────────────────▼─────────────┐  │
│  │              AuthContext (Global State)                    │  │
│  │   user | login | logout | updateUser | refreshProfile     │  │
│  └──────────────────────┬────────────────────────────────────┘  │
│                         │                                       │
│  ┌──────────────────────▼────────────────────────────────────┐  │
│  │                API Service (Axios)                         │  │
│  │   JWT Interceptor | 401 Auto-redirect | Base URL Config   │  │
│  └──────────────────────┬────────────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────────┘
                          │ HTTP/JSON + Bearer Token
┌─────────────────────────┼───────────────────────────────────────┐
│                    API LAYER                                    │
│                         │                                       │
│  ┌──────────────────────▼────────────────────────────────────┐  │
│  │              Express.js Server                            │  │
│  │   CORS | Rate Limiter | JSON Parser | Error Handler       │  │
│  └──────────────────────┬────────────────────────────────────┘  │
│                         │                                       │
│  ┌──────────────────────▼────────────────────────────────────┐  │
│  │              Middleware Pipeline                           │  │
│  │   auth (JWT verify) → adminOnly (role check) → handler    │  │
│  └──────────────────────┬────────────────────────────────────┘  │
│                         │                                       │
│  ┌───────┬──────────────┼───────────────┬────────────────────┐  │
│  │ Auth  │   Lessons    │   Attempts    │   Admin            │  │
│  │Routes │   Routes     │   Routes      │   Routes           │  │
│  └───┬───┘  └─────┬─────┘   └─────┬─────┘   └──────┬────────┘  │
│      │            │               │                 │           │
│  ┌───▼────┐ ┌─────▼─────┐  ┌─────▼───────┐  ┌─────▼────────┐  │
│  │ Auth   │ │  Lesson   │  │  Attempt    │  │  Admin       │  │
│  │Control.│ │  Control. │  │  Control.   │  │  Control.    │  │
│  └────────┘ └───────────┘  └──────┬──────┘  └──────────────┘  │
│                                   │                            │
│  ┌────────────────────────────────▼──────────────────────────┐  │
│  │           Skill Estimation Engine                         │  │
│  │   calculateSkillScore(attempts, currentScore)             │  │
│  │   → { skillScore, level, details }                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ Mongoose ODM
┌─────────────────────────┼───────────────────────────────────────┐
│                    DATA LAYER                                   │
│                         │                                       │
│  ┌──────────────────────▼────────────────────────────────────┐  │
│  │                  MongoDB                                  │  │
│  │  ┌────────┐  ┌──────────┐  ┌───────────────┐             │  │
│  │  │ Users  │  │ Lessons  │  │ LessonAttempts│             │  │
│  │  └────────┘  └──────────┘  └───────────────┘             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack Detail

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend** | React | 18.2 | Component-based UI |
| | Vite | 5.0 | Build tool + dev server |
| | Tailwind CSS | 3.3 | Utility-first styling |
| | Chart.js | 4.4 | Dashboard visualizations |
| | react-chartjs-2 | 5.2 | React Chart.js wrapper |
| | react-router-dom | 6.20 | Client-side routing |
| | Axios | 1.6 | HTTP client |
| **Backend** | Node.js | 18+ | Runtime |
| | Express | 4.18 | HTTP framework |
| | Mongoose | 7.6 | MongoDB ODM |
| | jsonwebtoken | 9.0 | JWT auth |
| | bcryptjs | 2.4 | Password hashing |
| | express-validator | 7.0 | Input validation |
| | express-rate-limit | 7.1 | Rate limiting |
| **Database** | MongoDB | 6+ | Document database |
| **Fonts** | Inter | latest | Display typography |
| | Noto Sans Tamil | latest | Tamil script rendering |

---

## Database Schema

### Users Collection

```
┌─────────────────────────────────────────────────┐
│ Users                                           │
├─────────────────┬───────────┬───────────────────┤
│ Field           │ Type      │ Constraints       │
├─────────────────┼───────────┼───────────────────┤
│ _id             │ ObjectId  │ auto-generated    │
│ name            │ String    │ required, 2-50    │
│ email           │ String    │ required, unique  │
│ password        │ String    │ required, min 6   │
│ role            │ String    │ enum: user, admin │
│ skill_score     │ Number    │ 0-100, default 50 │
│ level           │ String    │ enum: B/I/A       │
│ lessons_completed│ Number   │ default 0         │
│ createdAt       │ Date      │ auto              │
│ updatedAt       │ Date      │ auto              │
└─────────────────┴───────────┴───────────────────┘

Pre-save Hook: bcrypt.hash(password, 12)
Methods: comparePassword(), updateLevel()
```

### Lessons Collection

```
┌─────────────────────────────────────────────────────────┐
│ Lessons                                                 │
├─────────────────┬───────────┬───────────────────────────┤
│ Field           │ Type      │ Constraints               │
├─────────────────┼───────────┼───────────────────────────┤
│ _id             │ ObjectId  │ auto-generated            │
│ category        │ String    │ enum: uyir/mei/uyir-mei/  │
│                 │           │ grammar/sentences         │
│ difficulty      │ String    │ enum: Beginner/           │
│                 │           │ Intermediate/Advanced     │
│ type            │ String    │ enum: mcq/text            │
│ question        │ String    │ required                  │
│ question_tamil  │ String    │ default ''                │
│ options         │ [String]  │ for MCQ type              │
│ correct_answer  │ String    │ required                  │
│ hint            │ String    │ default ''                │
│ explanation     │ String    │ default ''                │
│ order           │ Number    │ default 0                 │
│ createdAt       │ Date      │ auto                      │
│ updatedAt       │ Date      │ auto                      │
└─────────────────┴───────────┴───────────────────────────┘

Index: { category: 1, difficulty: 1, order: 1 }
```

### LessonAttempts Collection

```
┌─────────────────────────────────────────────────────────┐
│ LessonAttempts                                          │
├─────────────────┬───────────┬───────────────────────────┤
│ Field           │ Type      │ Constraints               │
├─────────────────┼───────────┼───────────────────────────┤
│ _id             │ ObjectId  │ auto-generated            │
│ user_id         │ ObjectId  │ ref: Users, indexed       │
│ lesson_id       │ ObjectId  │ ref: Lessons              │
│ time_spent      │ Number    │ required, seconds         │
│ errors          │ Number    │ default 0, min 0          │
│ hints_used      │ Number    │ default 0, min 0          │
│ retries         │ Number    │ default 0, min 0          │
│ idle_time       │ Number    │ default 0, seconds        │
│ score           │ Number    │ required, 0 or 1          │
│ answer_given    │ String    │ default ''                │
│ createdAt       │ Date      │ auto                      │
│ updatedAt       │ Date      │ auto                      │
└─────────────────┴───────────┴───────────────────────────┘

Index: { user_id: 1, createdAt: -1 }
```

### Entity Relationships

```
┌──────────┐       1:N        ┌─────────────────┐
│  Users   │─────────────────▶│ LessonAttempts  │
└──────────┘                  └────────┬────────┘
                                       │ N:1
┌──────────┐       1:N               │
│ Lessons  │◀────────────────────────┘
└──────────┘
```

---

## Skill Estimation Engine

### Algorithm Flow

```
┌─────────────────────────────┐
│ Attempt Submitted           │
│ (lesson_id, time_spent,     │
│  errors, hints, retries,    │
│  idle_time, score)          │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ Fetch Last 20 Attempts      │
│ (rolling window)            │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ Calculate Sub-Scores        │
│                             │
│  recency weights:           │
│  w(i) = 0.9^i (normalized)  │
│                             │
│  success_rate = weighted    │
│  correct ratio × 100        │
│                             │
│  time_eff = max(0, min(100, │
│    (1 - (avg_active/30 - 1) │
│      / 2)                  │
│    × 100))                 │
│                             │
│  error_rate = min(100,      │
│    weighted(avgErrors/5)    │
│    × 100)                  │
│                             │
│  hint_dep = min(100,        │
│    weighted(avgHints/3)     │
│    × 100)                  │
│                             │
│  retry_dep = min(100,       │
│    weighted(avgRetries/4)   │
│    × 100)                  │
│                             │
│  idle_penalty = weighted    │
│    (idle_time/time_spent)   │
│    × 100                   │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ Weighted Combination        │
│                             │
│  error_ctrl = 100-error_rate│
│  hint_ind = 100-hint_dep    │
│  retry_ctrl = 100-retry_dep │
│  focus = 100-idle_penalty   │
│                             │
│  raw = 0.45 × success_rate  │
│      + 0.20 × time_eff      │
│      + 0.15 × error_ctrl    │
│      + 0.10 × hint_ind      │
│      + 0.06 × retry_ctrl    │
│      + 0.04 × focus         │
│                             │
│  clamped = clamp(raw, 0,100)│
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ Smoothing                   │
│                             │
│  confidence = min(1, N/20)  │
│  w = 0.35 + 0.30×confidence │
│                             │
│  final = w × clamped        │
│        + (1-w) × current    │
│                             │
│  rounded = round(final)     │
│  clamped to [0, 100]        │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ Level Mapping               │
│   0–30  → Beginner          │
│  31–70  → Intermediate      │
│  71–100 → Advanced          │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ Update User Document        │
│  - skill_score              │
│  - level                    │
│  - lessons_completed++      │
└─────────────────────────────┘
```

### Smoothing Rationale

The confidence-aware blend (`w = 0.35 + 0.30 × confidence`) serves two purposes:
1. **Prevents jarring jumps on low data** - Early attempts are down-weighted until enough evidence exists
2. **Adapts faster on stable history** - With a full rolling window, recent performance meaningfully shifts the score while remaining smooth

---

## Interface Adaptation Engine

### Decision Flow

```
┌─────────────────────────────────────────────────┐
│ User loads Learn page                           │
│ → Read user.level from AuthContext              │
└───────────────────┬─────────────────────────────┘
                    │
         ┌──────────┼──────────┐
         │          │          │
    ┌────▼───┐ ┌────▼────┐ ┌──▼────────┐
    │Beginner│ │Intermed.│ │Advanced   │
    └────┬───┘ └────┬────┘ └──┬────────┘
         │          │          │
         ▼          ▼          ▼
  ┌────────────┐ ┌──────────┐ ┌────────────┐
  │ Large text │ │ Moderate │ │ Compact UI │
  │ Hints ON   │ │ Hints    │ │ No hints   │
  │ Guidance   │ │ hidden   │ │ 60s timer  │
  │ Spacious   │ │ Standard │ │ Auto-submit│
  │ Bilingual  │ │ English  │ │ English    │
  └────────────┘ └──────────┘ └────────────┘
```

### UI Property Matrix

| Property | Beginner | Intermediate | Advanced |
|---|---|---|---|
| Container max-width | `max-w-2xl` | `max-w-2xl` | `max-w-xl` |
| Spacing | `space-y-8` | `space-y-6` | `space-y-4` |
| Card padding | `p-8` | `p-6` | `p-4` |
| Tamil font class | `tamil-text-xl` (4xl/5xl) | `tamil-text-lg` (2xl/3xl) | `text-lg` |
| MCQ grid | `grid-cols-1` | `grid-cols-2` | `grid-cols-2` |
| MCQ button size | `text-2xl py-5` | `text-xl py-4` | `text-base py-3` |
| Input text size | `text-2xl py-5` | `text-xl py-4` | `text-base` |
| Hint visibility | Always shown | Click to reveal | Hidden |
| Guidance panel | Visible (bilingual) | Hidden | Hidden |
| Submit button | Full width, large | Standard | Standard |
| Timer | None | None | 60s countdown |

---

## Security Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Request Flow                      │
│                                                      │
│  Client Request                                      │
│       │                                              │
│       ▼                                              │
│  ┌──────────────────────┐                            │
│  │   Rate Limiter       │  200 req / 15 min          │
│  └──────────┬───────────┘                            │
│             │                                        │
│             ▼                                        │
│  ┌──────────────────────┐                            │
│  │   CORS Check         │  Frontend URL whitelist    │
│  └──────────┬───────────┘                            │
│             │                                        │
│             ▼                                        │
│  ┌──────────────────────┐                            │
│  │   JSON Parser        │  10MB body limit           │
│  └──────────┬───────────┘                            │
│             │                                        │
│             ▼                                        │
│  ┌──────────────────────┐                            │
│  │   Input Validation   │  express-validator rules   │
│  └──────────┬───────────┘                            │
│             │                                        │
│             ▼                                        │
│  ┌──────────────────────┐                            │
│  │   JWT Verification   │  Bearer token extraction   │
│  │                      │  Token decode + verify     │
│  │                      │  User lookup from DB       │
│  └──────────┬───────────┘                            │
│             │                                        │
│             ▼                                        │
│  ┌──────────────────────┐                            │
│  │   Role Check         │  Admin-only endpoints      │
│  └──────────┬───────────┘                            │
│             │                                        │
│             ▼                                        │
│  ┌──────────────────────┐                            │
│  │   Route Handler      │  Business logic            │
│  └──────────┬───────────┘                            │
│             │                                        │
│             ▼                                        │
│  ┌──────────────────────┐                            │
│  │   Global Error       │  No stack traces in        │
│  │   Handler            │  production responses      │
│  └──────────────────────┘                            │
└──────────────────────────────────────────────────────┘
```

### Password Security
- **Algorithm:** bcrypt
- **Salt rounds:** 12
- **Storage:** Hashed password in User document
- **Query protection:** `select: false` — password excluded from all queries unless explicitly selected

### Token Security
- **Algorithm:** HS256 (via jsonwebtoken)
- **Secret:** Configurable via `JWT_SECRET` env variable
- **Expiration:** Configurable via `JWT_EXPIRE` (default: 7 days)
- **Transport:** Bearer token in `Authorization` header
- **Client storage:** localStorage

---

## Frontend Component Tree

```
App
├── AuthProvider (context)
│   ├── PublicRoute
│   │   ├── Login
│   │   └── Register
│   ├── ProtectedRoute
│   │   ├── Navbar
│   │   ├── Dashboard
│   │   │   ├── SkillMeter (canvas)
│   │   │   ├── StatCard (×6)
│   │   │   ├── Line Chart (performance trend)
│   │   │   ├── Bar Chart (error trend)
│   │   │   ├── Bar Chart (daily activity)
│   │   │   └── Activity Table
│   │   └── Learn
│   │       ├── Category Selection Grid
│   │       ├── Progress Bar
│   │       ├── AdaptiveLesson
│   │       │   ├── Timer (Advanced only)
│   │       │   ├── Category Badge
│   │       │   ├── Question Card
│   │       │   ├── Answer Area (MCQ / Text Input)
│   │       │   ├── Hint Section
│   │       │   ├── Guidance Panel (Beginner only)
│   │       │   ├── Feedback Section
│   │       │   └── Action Buttons
│   │       └── Completion Screen
│   └── AdminRoute
│       └── AdminPanel
│           ├── Overview Cards (×3)
│           ├── Doughnut Chart (level dist.)
│           ├── Bar Chart (weekly activity)
│           └── Users Table (searchable, filterable)
└── useInteractionTracker (hook)
```

---

## Data Flow Diagrams

### Learning Session Flow

```
User selects     Load lessons       Start            Complete         Submit attempt
  category    →   from API      →  tracking     →   question     →   to backend
     │               │                │                │                │
     ▼               ▼                ▼                ▼                ▼
 category ID    GET /lessons    startTracking()  completeTracking()  POST /attempts
   stored       ?category=X     → set timer        → metrics        → save attempt
                ?difficulty=    → reset idle        → time_spent     → calc skill
                  user.level    → zero counters     → errors         → update user
                                                    → hints          → return level
                                                    → retries          change info
                                                    → idle_time
                                                         │
                                                         ▼
                                                    updateUser()
                                                    → AuthContext
                                                    → next question
```

### Adaptation Flow

```
 User completes     Backend recalculates       Frontend receives       UI adapts
   a question    →     skill score          →    new level info     →   immediately
       │                    │                        │                      │
       ▼                    ▼                        ▼                      ▼
  POST /attempts     calculateSkillScore()    response.skillUpdate    AdaptiveLesson
  with metrics       using last 20 attempts   { skill_score, level,   re-renders with
                     + smoothing formula       levelChanged,           new level prop
                                              adaptationDirection }
```

---

## Deployment Architecture

```
┌──────────────────┐      ┌───────────────────┐      ┌──────────────────┐
│   Vercel/Netlify │      │  Render/Railway   │      │  MongoDB Atlas   │
│                  │      │                   │      │                  │
│  React SPA       │─────▶│  Express API      │─────▶│  3 Collections   │
│  Static files    │ HTTP │  Node.js          │  TCP │  Users           │
│  CDN-delivered   │      │  Auto-scaling     │      │  Lessons         │
│                  │      │                   │      │  LessonAttempts  │
│  VITE_API_URL    │      │  MONGODB_URI      │      │                  │
│  = API domain    │      │  JWT_SECRET       │      │  Indexes         │
│                  │      │  FRONTEND_URL     │      │  Backups         │
└──────────────────┘      └───────────────────┘      └──────────────────┘
        │                          │                          │
        └──────── HTTPS ───────────┴──────── TLS ─────────────┘
```
