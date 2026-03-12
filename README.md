# 🎓 தமிழ் கற்போம் — Adaptive Tamil Learning Platform

A behavior-driven adaptive Tamil learning platform that dynamically adjusts interface complexity based on learner performance. Built with React, Node.js, Express, and MongoDB.

---

## ✨ Features

### Core Functionality
- **🔐 JWT Authentication** — Secure register/login with bcrypt password hashing (12 rounds)
- **📚 Tamil Lessons** — 53 questions across Uyir (vowels), Mei (consonants), Uyir-Mei (combined), Grammar, and Sentences
- **📊 Interaction Monitoring** — Tracks completion time, errors, hint usage, retries, idle time (30s threshold)
- **🧠 Skill Estimation Engine** — Real-time proficiency score (0–100) using weighted behavioral metrics
- **🎨 Adaptive UI** — Interface dynamically adapts between Beginner / Intermediate / Advanced modes
- **🔄 Reversible Adaptation** — Automatic level downgrade on performance drops, recovery on improvement
- **📈 Progress Dashboard** — Animated skill meter, 6 stat cards, 3 Chart.js charts, activity history
- **⚙️ Admin Panel & CMS** — User management, platform analytics, level distribution, search, plus full CRUD Content Management System
- **🌗 Theming & Gamification** — Light/Dark theme toggling, web audio pronunciations, and daily streak counters

### Tamil Content
- 🗣️ **Pronunciation guidance** — Transliteration, phonetic notes, syllable stress patterns
- 📝 **53 lessons** — 5 categories × 3 difficulty levels with bilingual content
- 🔤 **MCQ & Text Input** — Multiple question types adapted per level
- 💡 **Hints & Explanations** — Bilingual (English + Tamil) throughout

### Security
- Password hashing with bcrypt (12 rounds)
- JWT-based authentication with configurable expiration
- Rate limiting (200 req / 15 min) + stricter auth route limits
- Account lockout after repeated failed logins
- Security headers via Helmet + request correlation IDs
- Structured logging with threshold-based alert hooks
- Input validation (express-validator)
- CORS configuration with environment-based origin
- Liveness + readiness endpoints for runtime health checks

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS 3, Chart.js 4 |
| Backend | Node.js, Express 4, Mongoose 7 |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Database | MongoDB (local or Atlas) |
| Deployment | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

---

## 📁 Project Structure

```
├── backend/
│   ├── controllers/        # Route handlers (auth, lesson, attempt, admin)
│   ├── middleware/          # JWT auth & admin role middleware
│   ├── models/              # Mongoose schemas (User, Lesson, LessonAttempt)
│   ├── routes/              # Express route definitions
│   ├── utils/               # Skill estimation engine
│   ├── seed.js              # Database seeder (53 Tamil lessons)
│   ├── server.js            # Entry point
│   ├── .env.example         # Environment variables template
│   └── package.json
├── frontend/
│   └── src/
│       ├── components/      # Navbar, SkillMeter, AdaptiveLesson
│       ├── context/         # AuthContext (global auth state)
│       ├── hooks/           # useInteractionTracker (behavioral tracking)
│       ├── pages/           # Login, Register, Dashboard, Learn, AdminPanel
│       └── services/        # Axios API client with interceptors
├── docs/
│   ├── ROADMAP.md           # Full 10-phase development roadmap
│   ├── CHECKLIST.md         # 200+ item feature checklist
│   ├── ARCHITECTURE.md      # System architecture & data flows
│   ├── API_DOCUMENTATION.md # Complete API endpoint reference
│   ├── DEPLOYMENT.md        # Step-by-step deployment guide
│   └── ENV_CONFIGURATION.md # Environment variable guide
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local instance or [Atlas cloud](https://cloud.mongodb.com))

### 1. Clone & Setup

```bash
git clone <repository-url>
cd UIUX

# Backend
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

### 2. Backend

```bash
cd backend
npm install
npm run seed    # Seed 53 Tamil lessons
npm run dev     # Start with auto-reload (http://localhost:5000)
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev     # Start dev server (http://localhost:5173)
```

### 4. Use the Platform

1. Navigate to `http://localhost:5173`
2. Register a new account
3. Select a category and start learning
4. Complete lessons — watch your skill score adapt
5. Check your Dashboard for progress charts

### 4.1 Run Automated Tests

```bash
# Backend unit + integration tests (mongodb-memory-server)
cd backend
npm test
npm run lint
npm run test:coverage

# Frontend unit/integration tests (Vitest + Testing Library)
cd ../frontend
npm test
npm run lint
npm run test:coverage

# Frontend smoke E2E tests (Playwright: auth + learn + admin)
npm run e2e:install
npm run e2e
```

### 5. Create Admin User (Optional)

```bash
# Using MongoDB shell or Compass:
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "admin" } }
)
```

---

## 🔧 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | **Yes** | — | MongoDB connection string |
| `JWT_SECRET` | **Yes** | — | Secret key for signing JWTs |
| `PORT` | No | `5000` | Server port |
| `JWT_EXPIRE` | No | `7d` | Token expiration duration |
| `FRONTEND_URL` | No | `*` | Allowed CORS origin |
| `PASSWORD_RESET_URL` | No | `<FRONTEND_URL>/resetpassword` | Base URL used in password reset links |
| `SMTP_HOST` | Production: **Yes** | — | SMTP server host |
| `SMTP_PORT` | Production: **Yes** | — | SMTP port |
| `SMTP_SECURE` | No | `false` | Use implicit TLS (`true` typically with port `465`) |
| `SMTP_USER` | Production: **Yes** | — | SMTP username |
| `SMTP_PASS` | Production: **Yes** | — | SMTP password/API key |
| `MAIL_FROM` | Production: **Yes** | — | Sender email for password reset emails |
| `MAIL_FROM_NAME` | No | `Tamil Learning Platform` | Sender display name |
| `AUTH_LOGIN_RATE_LIMIT_MAX` | No | `10` | Max login requests per IP in `AUTH_LOGIN_RATE_LIMIT_WINDOW_MINUTES` |
| `AUTH_FORGOT_RATE_LIMIT_MAX` | No | `6` | Max forgot-password requests per IP in `AUTH_FORGOT_RATE_LIMIT_WINDOW_MINUTES` |
| `AUTH_RESET_RATE_LIMIT_MAX` | No | `10` | Max reset-password requests per IP in `AUTH_RESET_RATE_LIMIT_WINDOW_MINUTES` |
| `AUTH_LOCKOUT_ENABLED` | No | `true` | Enables account lockout on repeated failed login attempts |
| `AUTH_LOCKOUT_MAX_ATTEMPTS` | No | `5` | Failed password attempts before account lock |
| `AUTH_LOCKOUT_MINUTES` | No | `15` | Lockout duration in minutes |
| `ALERT_5XX_THRESHOLD` | No | `20` | Trigger alert when 5xx count crosses threshold in alert window |
| `ALERT_AUTH_FAILURE_THRESHOLD` | No | `25` | Trigger alert when auth failures cross threshold in alert window |
| `ALERT_WEBHOOK_URL` | No | — | Optional webhook for forwarding alert payloads |
| `READINESS_EMAIL_VERIFY` | No | `true` in production, `false` otherwise | Enable SMTP transport verification in `/api/readiness` |
| `READINESS_EMAIL_VERIFY_TIMEOUT_MS` | No | `2500` | Timeout (ms) for readiness SMTP verification probe |

**Generate a JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `/api` | Backend API base URL |

> See [ENV_CONFIGURATION.md](docs/ENV_CONFIGURATION.md) for detailed configuration guide.

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Register new user |
| `POST` | `/api/auth/login` | — | Login and get JWT |
| `GET` | `/api/auth/profile` | 🔒 | Get user profile |
| `GET` | `/api/lessons` | 🔒 | Get lessons (filter by difficulty, category) |
| `GET` | `/api/lessons/categories` | 🔒 | Category summary with counts |
| `GET` | `/api/lessons/:id` | 🔒 | Get single lesson |
| `POST` | `/api/attempts` | 🔒 | Submit attempt + recalculate skill |
| `GET` | `/api/attempts/history` | 🔒 | Paginated attempt history |
| `GET` | `/api/attempts/stats` | 🔒 | Aggregated dashboard stats |
| `GET` | `/api/admin/users` | 🔒👑 | List all users (admin) |
| `GET` | `/api/admin/analytics` | 🔒👑 | Platform analytics (admin) |
| `GET` | `/api/admin/users/:id/progress` | 🔒👑 | User progress detail (admin) |
| `POST` | `/api/lessons` | 🔒👑 | Create new lesson (admin) |
| `PUT` | `/api/lessons/:id` | 🔒👑 | Update lesson (admin) |
| `DELETE` | `/api/lessons/:id` | 🔒👑 | Delete lesson (admin) |
| `GET` | `/api/health` | — | Health check |
| `GET` | `/api/readiness` | — | Readiness check (DB + email transport) |

> See [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) for request/response examples.

---

## 🧠 Skill Score Formula

```
skill_score = (0.4 × success_rate) + (0.2 × time_efficiency) − (0.2 × error_rate) − (0.2 × hint_dependency)
```

| Metric | Weight | Measures |
|---|---|---|
| Success Rate | +0.4 | % correct in last 20 attempts |
| Time Efficiency | +0.2 | Speed vs 30s expected time |
| Error Rate | −0.2 | Average errors per question |
| Hint Dependency | −0.2 | Average hint usage per question |

**Smoothing:** `final = 0.6 × new + 0.4 × current` (prevents jarring jumps)

**Levels:** 0–30 → 🌱 Beginner | 31–70 → 🔥 Intermediate | 71–100 → ⭐ Advanced

---

## 🎨 Adaptive Interface Modes

| Feature | 🌱 Beginner | 🔥 Intermediate | ⭐ Advanced |
|---|---|---|---|
| Tamil Font Size | Extra Large (4xl/5xl) | Large (2xl/3xl) | Standard (lg) |
| Hints | Always visible | Click to reveal | Hidden |
| Guidance | Step-by-step (bilingual) | None | None |
| Layout | Spacious (large padding) | Moderate | Compact (dense) |
| MCQ Layout | Single column | Two columns | Two columns |
| Timer | None | None | 60s countdown |
| Labels | Bilingual (EN+Tamil) | English only | English only |
| Auto-submit | No | No | On timer expiry |

### Reversible Adaptation
When performance drops, the system automatically lowers interface complexity, re-enables hints and guidance, and removes time pressure. When performance recovers, the interface gradually re-adapts upward.

---

## 🏗 Architecture

```
                    ┌─────────────────┐
                    │   React + Vite  │
                    │   Tailwind CSS  │
                    │   Chart.js      │
                    └────────┬────────┘
                             │ HTTP/JSON + JWT
                    ┌────────▼────────┐
                    │  Express.js API │
                    │  Auth + CORS    │
                    │  Rate Limiting  │
                    │  Skill Engine   │
                    └────────┬────────┘
                             │ Mongoose ODM
                    ┌────────▼────────┐
                    │    MongoDB      │
                    │  Users          │
                    │  Lessons        │
                    │  LessonAttempts │
                    └─────────────────┘
```

> See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed component diagrams and data flows.

---

## 🚀 Deployment

| Component | Platform | Guide |
|---|---|---|
| Database | MongoDB Atlas | [DEPLOYMENT.md](docs/DEPLOYMENT.md#step-1-mongodb-atlas-setup) |
| Backend API | Render / Railway | [DEPLOYMENT.md](docs/DEPLOYMENT.md#step-2-backend-deployment-render) |
| Frontend | Vercel / Netlify | [DEPLOYMENT.md](docs/DEPLOYMENT.md#step-3-frontend-deployment-vercel) |

```bash
# Frontend production build
cd frontend && npm run build    # Output: dist/

# Backend (no build needed)
cd backend && node server.js
```

---

## 📖 Documentation

| Document | Description |
|---|---|
| [ROADMAP.md](docs/ROADMAP.md) | 10-phase development roadmap with deliverables |
| [CHECKLIST.md](docs/CHECKLIST.md) | 200+ item feature checklist |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, schema, algorithms |
| [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Core API endpoints with JSON examples |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Cloud deployment (Atlas, Render, Vercel) |
| [ENV_CONFIGURATION.md](docs/ENV_CONFIGURATION.md) | Environment variable reference |
| [BACKUP_RESTORE_RUNBOOK.md](docs/BACKUP_RESTORE_RUNBOOK.md) | Backup scheduling, restore procedures, and RTO drill template |

---

## 📜 License

MIT
