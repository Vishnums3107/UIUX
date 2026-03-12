# ⚙️ Environment Configuration Guide

> Complete reference for all environment variables across backend and frontend.

---

## Backend Environment Variables

**File:** `backend/.env`  
**Template:** `backend/.env.example`

### Required Variables

| Variable | Example | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/tamil-learning` | MongoDB connection string. Use `mongodb+srv://...` for Atlas. |
| `JWT_SECRET` | `a3f2b8c9d1e4...` (64-byte hex) | Secret key for signing JWT tokens. **Must be unique per environment.** |

### Optional Variables

| Variable | Default | Example | Description |
|---|---|---|---|
| `PORT` | `5000` | `5000` | HTTP server port |
| `JWT_EXPIRE` | `7d` | `7d`, `24h`, `30d` | JWT token expiration duration |
| `FRONTEND_URL` | `*` | `http://localhost:5173` | Allowed CORS origin. Use `*` for dev, specific domain for production. |
| `PASSWORD_RESET_URL` | `<FRONTEND_URL>/resetpassword` | `https://app.example.com/resetpassword` | Base URL used to build password reset links sent by email. |
| `SMTP_HOST` | — | `smtp.sendgrid.net` | SMTP server host for password reset emails. |
| `SMTP_PORT` | — | `587` | SMTP server port. |
| `SMTP_SECURE` | `false` (`true` for port 465) | `false` | Whether SMTP uses implicit TLS. |
| `SMTP_USER` | — | `apikey` | SMTP username. |
| `SMTP_PASS` | — | `SG.xxxxx` | SMTP password or API key. |
| `MAIL_FROM` | — | `no-reply@example.com` | Sender email address for password reset emails. |
| `MAIL_FROM_NAME` | `Tamil Learning Platform` | `Tamil Learning` | Sender display name. |
| `AUTH_LOGIN_RATE_LIMIT_WINDOW_MINUTES` | `15` | `15` | Login rate-limit window duration. |
| `AUTH_LOGIN_RATE_LIMIT_MAX` | `10` | `10` | Maximum login requests per IP in login window. |
| `AUTH_FORGOT_RATE_LIMIT_WINDOW_MINUTES` | `15` | `15` | Forgot-password rate-limit window duration. |
| `AUTH_FORGOT_RATE_LIMIT_MAX` | `6` | `6` | Maximum forgot-password requests per IP in forgot window. |
| `AUTH_RESET_RATE_LIMIT_WINDOW_MINUTES` | `15` | `15` | Reset-password rate-limit window duration. |
| `AUTH_RESET_RATE_LIMIT_MAX` | `10` | `10` | Maximum reset-password requests per IP in reset window. |
| `AUTH_LOCKOUT_ENABLED` | `true` | `true` | Enables account lockout after repeated failed login attempts. |
| `AUTH_LOCKOUT_MAX_ATTEMPTS` | `5` | `5` | Failed password attempts before account lockout. |
| `AUTH_LOCKOUT_MINUTES` | `15` | `15` | Account lockout duration in minutes. |
| `ALERT_5XX_THRESHOLD` | `20` | `20` | Number of 5xx responses in window before alert trigger. |
| `ALERT_5XX_WINDOW_SECONDS` | `300` | `300` | Sliding window for 5xx alerting. |
| `ALERT_AUTH_FAILURE_THRESHOLD` | `25` | `25` | Auth failure count threshold before alert trigger. |
| `ALERT_AUTH_FAILURE_WINDOW_SECONDS` | `600` | `600` | Sliding window for auth failure alerting. |
| `ALERT_COOLDOWN_SECONDS` | `300` | `300` | Minimum seconds between repeated alerts of same type. |
| `ALERT_WEBHOOK_URL` | `-` | `https://hooks.example.com/alerts` | Optional webhook endpoint for forwarding alert payloads. |
| `READINESS_EMAIL_VERIFY` | `true` in production, `false` otherwise | `true` | Enables SMTP transport verification in `/api/readiness`. |
| `READINESS_EMAIL_VERIFY_TIMEOUT_MS` | `2500` | `2500` | Timeout in milliseconds for readiness SMTP verification probe. |

---

### Generating a Secure JWT Secret

**Option 1: Node.js (recommended)**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Option 2: OpenSSL**
```bash
openssl rand -hex 64
```

**Option 3: PowerShell (Windows)**
```powershell
-join ((1..64) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
```

> ⚠️ **Never commit your actual `.env` file to version control.** The `.gitignore` already excludes it.

---

### MongoDB URI Formats

**Local MongoDB:**
```
MONGODB_URI=mongodb://127.0.0.1:27017/tamil-learning
```

**MongoDB Atlas (cloud):**
```
MONGODB_URI=mongodb+srv://username:password@cluster-name.xxxxx.mongodb.net/tamil-learning?retryWrites=true&w=majority
```

**With authentication (local):**
```
MONGODB_URI=mongodb://username:password@127.0.0.1:27017/tamil-learning?authSource=admin
```

> Replace `username`, `password`, and `cluster-name` with your actual values. URL-encode special characters in passwords.

---

### Complete Backend `.env` Example

```env
# Development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/tamil-learning
JWT_SECRET=your_development_secret_key_do_not_use_in_production
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
PASSWORD_RESET_URL=http://localhost:5173/resetpassword
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=mailtrap_user
SMTP_PASS=mailtrap_pass
MAIL_FROM=no-reply@tamil-learning.local
MAIL_FROM_NAME=Tamil Learning Platform
AUTH_LOGIN_RATE_LIMIT_MAX=30
AUTH_FORGOT_RATE_LIMIT_MAX=20
AUTH_RESET_RATE_LIMIT_MAX=20
AUTH_LOCKOUT_ENABLED=true
AUTH_LOCKOUT_MAX_ATTEMPTS=5
AUTH_LOCKOUT_MINUTES=15
ALERT_5XX_THRESHOLD=30
ALERT_AUTH_FAILURE_THRESHOLD=40
```

```env
# Production
PORT=5000
MONGODB_URI=mongodb+srv://appuser:s3cur3P@ss@cluster0.abc123.mongodb.net/tamil-learning?retryWrites=true&w=majority
JWT_SECRET=a3f2b8c9d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0
JWT_EXPIRE=7d
FRONTEND_URL=https://tamil-learning.vercel.app
PASSWORD_RESET_URL=https://tamil-learning.vercel.app/resetpassword
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
MAIL_FROM=no-reply@tamil-learning.app
MAIL_FROM_NAME=Tamil Learning Platform
AUTH_LOGIN_RATE_LIMIT_WINDOW_MINUTES=15
AUTH_LOGIN_RATE_LIMIT_MAX=10
AUTH_FORGOT_RATE_LIMIT_WINDOW_MINUTES=15
AUTH_FORGOT_RATE_LIMIT_MAX=6
AUTH_RESET_RATE_LIMIT_WINDOW_MINUTES=15
AUTH_RESET_RATE_LIMIT_MAX=10
AUTH_LOCKOUT_ENABLED=true
AUTH_LOCKOUT_MAX_ATTEMPTS=5
AUTH_LOCKOUT_MINUTES=15
ALERT_5XX_THRESHOLD=20
ALERT_5XX_WINDOW_SECONDS=300
ALERT_AUTH_FAILURE_THRESHOLD=25
ALERT_AUTH_FAILURE_WINDOW_SECONDS=600
ALERT_COOLDOWN_SECONDS=300
ALERT_WEBHOOK_URL=https://hooks.example.com/alerts
READINESS_EMAIL_VERIFY=true
READINESS_EMAIL_VERIFY_TIMEOUT_MS=2500
```

---

## Frontend Environment Variables

**File:** `frontend/.env`  
**Template:** `frontend/.env.example`  
**Prefix:** All variables must start with `VITE_` to be accessible in the browser.

| Variable | Default | Example | Description |
|---|---|---|---|
| `VITE_API_URL` | `/api` | `https://api.example.com/api` | Backend API base URL |

---

### Frontend Configuration by Environment

**Development (with Vite proxy):**
```env
# frontend/.env
VITE_API_URL=/api
```
The Vite dev server proxies `/api/*` requests to `http://localhost:5000`, configured in `vite.config.js`.

**Production (deployed separately):**
```env
# frontend/.env
VITE_API_URL=https://tamil-learning-api.onrender.com/api
```
Points directly to the deployed backend API.

---

## Environment Setup Steps

### First-Time Setup

```bash
# 1. Backend
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and generate a JWT secret

# 2. Frontend
cd frontend
cp .env.example .env
# Usually no changes needed for development
```

### Verify Configuration

```bash
# Start backend (should connect to MongoDB)
cd backend
npm run dev
# ✅ MongoDB connected
# 🚀 Server running on port 5000

# Start frontend (should proxy API calls)
cd frontend
npm run dev
# Server running on http://localhost:5173
```

---

## Platform-Specific Environment Variable Setup

### Render (Backend)

1. Go to your Web Service dashboard
2. Click **"Environment"** tab
3. Add each variable as a key-value pair
4. Changes trigger automatic redeployment

### Vercel (Frontend)

1. Go to your Project Settings
2. Click **"Environment Variables"**
3. Add `VITE_API_URL` with your backend URL
4. Select which environments to apply (Production, Preview, Development)
5. Redeploy for changes to take effect

### Railway (Backend)

1. Go to your Service → **"Variables"** tab
2. Add variables via the UI or upload a `.env` file
3. Changes apply on next deployment

---

## Security Best Practices

| Practice | Details |
|---|---|
| **Unique secrets per environment** | Dev, staging, and production should each have a different `JWT_SECRET` |
| **Strong JWT secrets** | Use at least 64 random bytes (128 hex characters) |
| **Restrict CORS in production** | Set `FRONTEND_URL` to your exact domain, never `*` in production |
| **Rotate secrets periodically** | Change `JWT_SECRET` every 90 days (existing tokens will be invalidated) |
| **Never commit `.env` files** | Always use `.env.example` as a template; `.gitignore` handles the rest |
| **URL-encode passwords** | Special characters in MongoDB passwords must be URL-encoded |
| **Restrict Atlas IP access** | In production, whitelist only your server IPs instead of `0.0.0.0/0` |
| **Fail closed on reset email** | Ensure SMTP is configured in production; password reset requests should not rely on dev token responses |

