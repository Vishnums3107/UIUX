# 📡 API Documentation — Adaptive Tamil Learning Platform

> Complete reference for core REST API endpoints with request/response examples.

**Base URL:** `http://localhost:5000/api` (development) or `https://your-api.onrender.com/api` (production)

**Authentication:** Bearer token in `Authorization` header for protected endpoints  
**Content-Type:** `application/json`  
**Rate Limit:** Global: 200 requests per 15 minutes per IP.  
**Auth-Specific Limits:** `/api/auth/login`, `/api/auth/forgotpassword`, and `/api/auth/resetpassword/:resettoken` have stricter route-level limits.
**Response Trace Header:** `X-Request-Id` is returned on all responses for correlation and debugging.

---

## Authentication Endpoints

### POST `/api/auth/register`
Register a new user account.

**Auth Required:** No

**Request Body:**
```json
{
  "name": "Priya",
  "email": "priya@example.com",
  "password": "password123"
}
```

**Validation Rules:**
| Field | Rules |
|---|---|
| `name` | Required, 2–50 characters, trimmed |
| `email` | Required, valid email format, normalized to lowercase |
| `password` | Required, minimum 6 characters |

**Success Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Priya",
    "email": "priya@example.com",
    "skill_score": 50,
    "level": "Intermediate",
    "lessons_completed": 0,
    "role": "user"
  }
}
```

**Error Responses:**
| Code | Body | Cause |
|---|---|---|
| 400 | `{ "error": "Email already registered." }` | Duplicate email |
| 400 | `{ "errors": [{ "msg": "..." }] }` | Validation failure |
| 500 | `{ "error": "Registration failed." }` | Server error |

---

### POST `/api/auth/login`
Authenticate and receive JWT token.

**Auth Required:** No

**Request Body:**
```json
{
  "email": "priya@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Priya",
    "email": "priya@example.com",
    "skill_score": 65,
    "level": "Intermediate",
    "lessons_completed": 12,
    "role": "user"
  }
}
```

**Error Responses:**
| Code | Body | Cause |
|---|---|---|
| 401 | `{ "error": "Invalid email or password." }` | Wrong credentials |
| 429 | `{ "error": "Too many login attempts. Try again later." }` | Account lockout or login route rate limit |
| 500 | `{ "error": "Login failed." }` | Server error |

---

### GET `/api/auth/profile`
Get the authenticated user's profile.

**Auth Required:** 🔒 JWT

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "name": "Priya",
  "email": "priya@example.com",
  "skill_score": 65,
  "level": "Intermediate",
  "lessons_completed": 12,
  "role": "user",
  "createdAt": "2026-01-15T10:30:00.000Z"
}
```

---

### PUT `/api/auth/profile`
Update the authenticated user's profile.

**Auth Required:** 🔒 JWT

**Request Body:**
```json
{
  "name": "Priya S",
  "avatarId": "avatar-4"
}
```

**Validation Rules:**
| Field | Rules |
|---|---|
| `name` | Optional, 2–50 characters |
| `avatarId` | Optional, string |

**Success Response (200):**
```json
{
  "id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "name": "Priya S",
  "email": "priya@example.com",
  "skill_score": 65,
  "level": "Intermediate",
  "avatarId": "avatar-4",
  "role": "user"
}
```

---

### POST `/api/auth/forgotpassword`
Generate and send a password reset link.

**Auth Required:** No

**Request Body:**
```json
{
  "email": "priya@example.com"
}
```

**Security behavior:** Response is intentionally generic to avoid revealing whether the email exists.

**Success Response (200):**
```json
{
  "success": true,
  "message": "If an account with that email exists, a reset link has been sent."
}
```

**Development-only behavior:** when email transport is not configured and `NODE_ENV` is not `production`, response may include `resetToken` for local testing.

---

### PUT `/api/auth/resetpassword/:resettoken`
Reset password using a valid token.

**Auth Required:** No

**Request Body:**
```json
{
  "password": "newPassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Priya",
    "email": "priya@example.com",
    "avatarId": "avatar-1",
    "role": "user"
  }
}
```

**Error Responses:**
| Code | Body | Cause |
|---|---|---|
| 400 | `{ "error": "Invalid or expired token" }` | Token invalid or expired |

---

## Lesson Endpoints

### GET `/api/lessons`
Get lessons with optional filters.

**Auth Required:** 🔒 JWT

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `difficulty` | String | Filter by: `Beginner`, `Intermediate`, `Advanced` |
| `category` | String | Filter by: `uyir`, `mei`, `uyir-mei`, `grammar`, `sentences` |

**Example:** `GET /api/lessons?category=uyir&difficulty=Beginner`

**Success Response (200):**
```json
[
  {
    "_id": "65b2c3d4e5f6a7b8c9d0e1f2",
    "category": "uyir",
    "difficulty": "Beginner",
    "type": "mcq",
    "question": "What is the first Tamil vowel letter?",
    "question_tamil": "முதல் தமிழ் உயிர் எழுத்து எது?",
    "options": ["அ", "ஆ", "இ", "க"],
    "correct_answer": "அ",
    "hint": "It is the equivalent of \"a\" in English.",
    "explanation": "அ (a) is the first of 12 Tamil vowels.",
    "order": 1,
    "createdAt": "2026-01-15T10:00:00.000Z"
  }
]
```

---

### GET `/api/lessons/categories`
Get category/difficulty summary with lesson counts.

**Auth Required:** 🔒 JWT

**Success Response (200):**
```json
[
  { "_id": { "category": "grammar", "difficulty": "Advanced" }, "count": 4 },
  { "_id": { "category": "grammar", "difficulty": "Beginner" }, "count": 4 },
  { "_id": { "category": "grammar", "difficulty": "Intermediate" }, "count": 5 },
  { "_id": { "category": "mei", "difficulty": "Beginner" }, "count": 5 },
  { "_id": { "category": "uyir", "difficulty": "Beginner" }, "count": 7 }
]
```

---

### GET `/api/lessons/:id`
Get a single lesson by ID.

**Auth Required:** 🔒 JWT

**Success Response (200):**
```json
{
  "_id": "65b2c3d4e5f6a7b8c9d0e1f2",
  "category": "uyir",
  "difficulty": "Beginner",
  "type": "mcq",
  "question": "What is the first Tamil vowel letter?",
  "question_tamil": "முதல் தமிழ் உயிர் எழுத்து எது?",
  "options": ["அ", "ஆ", "இ", "க"],
  "correct_answer": "அ",
  "hint": "It is the equivalent of \"a\" in English.",
  "explanation": "அ (a) is the first of 12 Tamil vowels.",
  "order": 1
}
```

**Error Responses:**
| Code | Body | Cause |
|---|---|---|
| 404 | `{ "error": "Lesson not found." }` | Invalid ID |

---

## Attempt Endpoints

### POST `/api/attempts`
Submit a lesson attempt. Triggers skill score recalculation.

**Auth Required:** 🔒 JWT

**Request Body:**
```json
{
  "lesson_id": "65b2c3d4e5f6a7b8c9d0e1f2",
  "time_spent": 15,
  "errors": 1,
  "hints_used": 0,
  "retries": 1,
  "idle_time": 0,
  "score": 1,
  "answer_given": "அ"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `lesson_id` | String | Yes | Lesson ObjectId |
| `time_spent` | Number | Yes | Seconds spent on question |
| `errors` | Number | No | Number of wrong attempts |
| `hints_used` | Number | No | Times hint button clicked |
| `retries` | Number | No | Retry button clicks |
| `idle_time` | Number | No | Accumulated idle seconds |
| `score` | Number | Yes | 1 = correct, 0 = incorrect |
| `answer_given` | String | No | The user's answer |

**Success Response (201):**
```json
{
  "attempt": {
    "id": "65c3d4e5f6a7b8c9d0e1f2g3",
    "score": 1,
    "time_spent": 15
  },
  "skillUpdate": {
    "skill_score": 68,
    "level": "Intermediate",
    "lessons_completed": 13,
    "details": {
      "successRate": 80,
      "timeEfficiency": 100,
      "errorRate": 10,
      "hintDependency": 7,
      "rawScore": 71
    },
    "levelChanged": false,
    "previousLevel": "Intermediate",
    "adaptationDirection": "none"
  },
  "reviewProgress": {
    "clearedToday": 3,
    "currentStreak": 2,
    "longestStreak": 5,
    "lastClearedAt": "2026-03-12T09:15:00.000Z"
  }
}
```

**`adaptationDirection` values:**
| Value | Meaning |
|---|---|
| `"none"` | Level unchanged |
| `"upgrade"` | Level increased (e.g., Intermediate → Advanced) |
| `"downgrade"` | Level decreased (e.g., Intermediate → Beginner) |

---

### GET `/api/attempts/history`
Get paginated attempt history for the authenticated user.

**Auth Required:** 🔒 JWT

**Query Parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | Number | 1 | Page number |
| `limit` | Number | 20 | Results per page |

**Example:** `GET /api/attempts/history?page=1&limit=10`

**Success Response (200):**
```json
{
  "attempts": [
    {
      "_id": "65c3d4e5f6a7b8c9d0e1f2g3",
      "user_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "lesson_id": {
        "_id": "65b2c3d4e5f6a7b8c9d0e1f2",
        "category": "uyir",
        "difficulty": "Beginner",
        "question": "What is the first Tamil vowel letter?"
      },
      "time_spent": 15,
      "errors": 1,
      "hints_used": 0,
      "retries": 0,
      "idle_time": 0,
      "score": 1,
      "answer_given": "அ",
      "createdAt": "2026-02-20T14:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

---

### GET `/api/attempts/stats`
Get aggregated statistics for the dashboard.

**Auth Required:** 🔒 JWT

**Success Response (200):**
```json
{
  "totalAttempts": 45,
  "summary": {
    "avgScore": 0.78,
    "avgTime": 22.5,
    "avgErrors": 0.8,
    "avgHints": 0.3,
    "totalCorrect": 35
  },
  "recentTrend": [
    {
      "_id": "2026-02-18",
      "avgScore": 0.75,
      "count": 8,
      "avgErrors": 1.2
    },
    {
      "_id": "2026-02-19",
      "avgScore": 0.85,
      "count": 12,
      "avgErrors": 0.6
    }
  ]
}
```

**`recentTrend`:** Daily aggregations for the last 30 days, sorted chronologically.

---

### GET `/api/attempts/review-queue`
Get the spaced-repetition review queue for the authenticated user.

**Auth Required:** ðŸ”’ JWT

**Query Parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | Number | 10 | Maximum queued lessons to return (1-25) |

**Success Response (200):**
```json
{
  "total": 2,
  "upcomingCount": 4,
  "nextDueAt": "2026-03-11T18:00:00.000Z",
  "reviewBuckets": {
    "dueNow": {
      "count": 2,
      "items": []
    },
    "laterToday": {
      "count": 1,
      "items": []
    },
    "tomorrow": {
      "count": 1,
      "items": []
    }
  },
  "weeklyTimeline": [
    { "date": "2026-03-12T00:00:00.000Z", "label": "Today", "dueCount": 3 },
    { "date": "2026-03-13T00:00:00.000Z", "label": "Fri", "dueCount": 1 }
  ],
  "completionStats": {
    "clearedToday": 3,
    "currentStreak": 2,
    "longestStreak": 5,
    "lastClearedAt": "2026-03-12T09:15:00.000Z"
  },
  "items": [
    {
      "lesson": {
        "_id": "65b2c3d4e5f6a7b8c9d0e1f2",
        "category": "uyir",
        "difficulty": "Beginner",
        "question": "What is the first Tamil vowel letter?"
      },
      "stats": {
        "attemptCount": 3,
        "avgScore": 0.33,
        "avgErrors": 1.67,
        "avgHints": 0.67,
        "consecutiveCorrect": 0,
        "lapses": 2,
        "easeFactor": 2.04,
        "intervalHours": 0,
        "dueAt": "2026-03-10T14:30:00.000Z",
        "isDue": true,
        "overdueHours": 21.5,
        "priority": 108.01,
        "reason": "last_attempt_incorrect",
        "lastAttemptedAt": "2026-03-10T14:30:00.000Z",
        "latestAttemptCorrect": false
      }
    }
  ]
}
```

**Behavior notes:**
- `items` only contains lessons currently due for review.
- `total` is the full number of due lessons before the requested `limit` is applied.
- `upcomingCount` counts scheduled review items that are not due yet.
- `nextDueAt` gives the earliest upcoming review timestamp when the queue is empty or partially exhausted.
- `reviewBuckets` provides preview groups for dashboard scheduling panels: `dueNow`, `laterToday`, and `tomorrow`.
- `weeklyTimeline` provides the next 7 days of due review counts, with overdue items rolled into `Today`.
- `completionStats` summarizes stored review clear history for dashboard streaks and daily counts.

This endpoint is intended for focused revision sessions and dashboard review prompts driven by persisted review timing instead of simple weakness scoring.

---

## Admin Endpoints

> All admin endpoints require both JWT authentication and `admin` role.

### GET `/api/admin/users`
List all users with their profiles.

**Auth Required:** 🔒👑 JWT + Admin

**Success Response (200):**
```json
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Priya",
    "email": "priya@example.com",
    "role": "user",
    "skill_score": 65,
    "level": "Intermediate",
    "lessons_completed": 12,
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-02-20T14:30:00.000Z"
  }
]
```

---

### GET `/api/admin/analytics`
Get platform-wide analytics.

**Auth Required:** 🔒👑 JWT + Admin

**Success Response (200):**
```json
{
  "totalUsers": 150,
  "levelDistribution": [
    { "_id": "Beginner", "count": 45 },
    { "_id": "Intermediate", "count": 80 },
    { "_id": "Advanced", "count": 25 }
  ],
  "averages": {
    "avgSkill": 52.3,
    "avgLessons": 18.7
  },
  "recentActivity": [
    {
      "_id": "2026-02-18",
      "attempts": 45,
      "avgScore": 0.72
    }
  ]
}
```

**`recentActivity`:** Daily aggregations for the last 7 days.

---

### POST `/api/lessons`
Create a new lesson.

**Auth Required:** 🔒👑 JWT + Admin

**Request Body:**
```json
{
  "category": "uyir",
  "difficulty": "Beginner",
  "type": "mcq",
  "question": "What is the first Tamil vowel letter?",
  "question_tamil": "முதல் தமிழ் உயிர் எழுத்து எது?",
  "options": ["அ", "ஆ", "இ", "க"],
  "correct_answer": "அ",
  "hint": "It is the equivalent of 'a' in English.",
  "explanation": "அ (a) is the first of 12 Tamil vowels.",
  "audio_url": "https://example.com/audio/a.mp3"
}
```

**Success Response (201):**
```json
{
  "_id": "65b2c3d4e5f6a7b8c9d0e1f2",
  "category": "uyir",
  "difficulty": "Beginner",
  "type": "mcq",
  "question": "What is the first Tamil vowel letter?",
  "correct_answer": "அ"
}
```

---

### PUT `/api/lessons/:id`
Update an existing lesson.

**Auth Required:** 🔒👑 JWT + Admin

**Success Response (200):**
```json
{
  "_id": "65b2c3d4e5f6a7b8c9d0e1f2",
  "category": "uyir",
  "difficulty": "Intermediate",
  "question": "Updated English Translation"
}
```

---

### DELETE `/api/lessons/:id`
Delete an existing lesson.

**Auth Required:** 🔒👑 JWT + Admin

**Success Response (200):**
```json
{
  "message": "Lesson deleted successfully"
}
```

---

### GET `/api/admin/users/:id/progress`
Get detailed progress for a specific user.

**Auth Required:** 🔒👑 JWT + Admin

**Success Response (200):**
```json
{
  "user": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Priya",
    "email": "priya@example.com",
    "skill_score": 65,
    "level": "Intermediate",
    "lessons_completed": 12
  },
  "attempts": [
    {
      "_id": "65c3d4e5f6a7b8c9d0e1f2g3",
      "lesson_id": {
        "_id": "65b2c3d4e5f6a7b8c9d0e1f2",
        "category": "uyir",
        "difficulty": "Beginner",
        "question": "What is the first Tamil vowel letter?"
      },
      "time_spent": 15,
      "errors": 1,
      "hints_used": 0,
      "retries": 0,
      "score": 1,
      "createdAt": "2026-02-20T14:30:00.000Z"
    }
  ]
}
```

**Note:** Returns the last 50 attempts for the specified user.

---

## Leaderboard Endpoints

### GET `/api/leaderboard`
Get top users ranked by `skill_score` (desc), then `current_streak` (desc).

**Auth Required:** No

**Success Response (200):**
```json
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Priya",
    "skill_score": 82,
    "level": "Advanced",
    "current_streak": 9,
    "badges": [
      { "id": "advanced", "name": "Tamil Scholar", "icon": "🎓" }
    ]
  }
]
```

---

## Utility Endpoints

### GET `/api/health`
Health check endpoint.

**Auth Required:** No

**Success Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-02-20T14:30:00.000Z",
  "uptimeSeconds": 1842
}
```

---

### GET `/api/readiness`
Readiness endpoint for production orchestration checks (database + email transport).

**Auth Required:** No

**Success Response (200):**
```json
{
  "status": "ready",
  "timestamp": "2026-03-11T09:00:00.000Z",
  "checks": {
    "database": { "ready": true, "state": "connected", "name": "tamil-learning" },
    "email": { "ready": true, "required": true, "configured": true, "verification": "ok" }
  }
}
```

**Not Ready Response (503):**
```json
{
  "status": "not_ready",
  "timestamp": "2026-03-11T09:00:00.000Z",
  "checks": {
    "database": { "ready": true, "state": "connected" },
    "email": { "ready": false, "required": true, "configured": false, "reason": "not_configured" }
  }
}
```

---

## Common Error Responses

### Authentication Errors
| Code | Body | Cause |
|---|---|---|
| 401 | `{ "error": "Access denied. No token provided." }` | Missing Authorization header |
| 401 | `{ "error": "Token expired." }` | JWT has expired |
| 401 | `{ "error": "Invalid token." }` | Malformed or tampered token |
| 401 | `{ "error": "User not found." }` | User deleted after token issued |

### Authorization Errors
| Code | Body | Cause |
|---|---|---|
| 403 | `{ "error": "Admin access required." }` | Non-admin accessing admin route |

### Rate Limiting
| Code | Body | Cause |
|---|---|---|
| 429 | `{ "error": "Too many requests, please try again later." }` | Exceeded 200 req / 15 min |
| 429 | `{ "error": "Too many login attempts. Please try again later." }` | Exceeded login route rate limit |
| 429 | `{ "error": "Too many password reset requests. Please try again later." }` | Exceeded forgot-password route rate limit |
| 429 | `{ "error": "Too many password reset attempts. Please try again later." }` | Exceeded reset-password route rate limit |
| 429 | `{ "error": "Too many login attempts. Try again later." }` | Account temporarily locked after repeated failed credentials |

### Security Headers
Responses include standard security headers (Helmet) such as:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-Request-Id: <correlation-id>`

### Server Errors
| Code | Body | Cause |
|---|---|---|
| 500 | `{ "error": "Internal server error" }` | Unhandled server error |
