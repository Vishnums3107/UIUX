# 🚀 Deployment Guide — Adaptive Tamil Learning Platform

> Step-by-step instructions to deploy the platform to production using MongoDB Atlas, Render, and Vercel.

---

## Prerequisites

- Node.js 18+ installed locally
- Git installed
- GitHub/GitLab repository with the project code
- Accounts on: [MongoDB Atlas](https://cloud.mongodb.com), [Render](https://render.com), [Vercel](https://vercel.com)

---

## Step 1: MongoDB Atlas Setup

### 1.1 Create a Cluster

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click **"Build a Database"**
3. Select **M0 Free Tier** (or higher for production)
4. Choose a cloud provider and region closest to your users
5. Name the cluster (e.g., `tamil-learning-cluster`)
6. Click **"Create Cluster"**

### 1.2 Create a Database User

1. Go to **Database Access** in the left sidebar
2. Click **"Add New Database User"**
3. Choose **Password** authentication
4. Enter a username (e.g., `appuser`)
5. Generate or enter a strong password — **save this password**
6. Set privileges to **"Read and Write to Any Database"**
7. Click **"Add User"**

### 1.3 Configure Network Access

1. Go to **Network Access** in the left sidebar
2. Click **"Add IP Address"**
3. For development: click **"Allow Access from Anywhere"** (`0.0.0.0/0`)
4. For production: add only your server's IP addresses
5. Click **"Confirm"**

### 1.4 Get Connection String

1. Go to **Database** → click **"Connect"** on your cluster
2. Select **"Connect your application"**
3. Choose **Node.js** driver, latest version
4. Copy the connection string:
   ```
   mongodb+srv://appuser:<password>@tamil-learning-cluster.xxxxx.mongodb.net/tamil-learning?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual database password

### 1.5 Seed the Database

```bash
cd backend

# Set the Atlas connection string in .env
echo "MONGODB_URI=mongodb+srv://appuser:YOUR_PASSWORD@cluster.mongodb.net/tamil-learning?retryWrites=true&w=majority" > .env

# Run the seeder
npm run seed
```

Expected output:
```
Connected to MongoDB
Cleared existing lessons
✅ Seeded 53 Tamil lessons successfully!
```

---

## Step 2: Backend Deployment (Render)

### 2.1 Create a Web Service

1. Log in to [Render](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub/GitLab repository
4. Configure:
   | Setting | Value |
   |---|---|
   | **Name** | `tamil-learning-api` |
   | **Region** | Choose closest to users |
   | **Branch** | `main` |
   | **Root Directory** | `backend` |
   | **Runtime** | Node |
   | **Build Command** | `npm install` |
   | **Start Command** | `node server.js` |

### 2.2 Set Environment Variables

In the Render dashboard, add these environment variables:

| Variable | Value |
|---|---|
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRE` | `7d` |
| `FRONTEND_URL` | `https://your-app.vercel.app` (set after frontend deploy) |
| `PASSWORD_RESET_URL` | `https://your-app.vercel.app/resetpassword` |
| `SMTP_HOST` | Provider SMTP host (see examples below) |
| `SMTP_PORT` | `587` (or provider-specific) |
| `SMTP_SECURE` | `false` for STARTTLS (`true` for implicit TLS/465) |
| `SMTP_USER` | Provider SMTP username |
| `SMTP_PASS` | Provider SMTP password/API key |
| `MAIL_FROM` | `no-reply@yourdomain.com` |
| `MAIL_FROM_NAME` | `Tamil Learning Platform` |
| `TRUST_PROXY` | `1` (recommended behind Render/Railway proxy) |
| `AUTH_LOGIN_RATE_LIMIT_WINDOW_MINUTES` | `15` |
| `AUTH_LOGIN_RATE_LIMIT_MAX` | `10` |
| `AUTH_FORGOT_RATE_LIMIT_WINDOW_MINUTES` | `15` |
| `AUTH_FORGOT_RATE_LIMIT_MAX` | `6` |
| `AUTH_RESET_RATE_LIMIT_WINDOW_MINUTES` | `15` |
| `AUTH_RESET_RATE_LIMIT_MAX` | `10` |
| `AUTH_LOCKOUT_ENABLED` | `true` |
| `AUTH_LOCKOUT_MAX_ATTEMPTS` | `5` |
| `AUTH_LOCKOUT_MINUTES` | `15` |
| `ALERT_5XX_THRESHOLD` | `20` |
| `ALERT_5XX_WINDOW_SECONDS` | `300` |
| `ALERT_AUTH_FAILURE_THRESHOLD` | `25` |
| `ALERT_AUTH_FAILURE_WINDOW_SECONDS` | `600` |
| `ALERT_COOLDOWN_SECONDS` | `300` |
| `ALERT_WEBHOOK_URL` | Optional webhook URL for alert forwarding |
| `READINESS_EMAIL_VERIFY` | `true` |
| `READINESS_EMAIL_VERIFY_TIMEOUT_MS` | `2500` |
| `PORT` | `5000` (Render auto-detects, but set explicitly) |

### 2.2.1 SMTP Provider Examples (Password Reset Emails)

Use one of the following SMTP presets:

**SendGrid**

| Variable | Value |
|---|---|
| `SMTP_HOST` | `smtp.sendgrid.net` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | `apikey` |
| `SMTP_PASS` | `<your-sendgrid-api-key>` |
| `MAIL_FROM` | `no-reply@yourdomain.com` (verified sender/domain) |
| `MAIL_FROM_NAME` | `Tamil Learning Platform` |

**Mailgun**

| Variable | Value |
|---|---|
| `SMTP_HOST` | `smtp.mailgun.org` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | `postmaster@mg.yourdomain.com` |
| `SMTP_PASS` | `<mailgun-smtp-password>` |
| `MAIL_FROM` | `no-reply@mg.yourdomain.com` |
| `MAIL_FROM_NAME` | `Tamil Learning Platform` |

> Use provider-verified domains/senders to prevent delivery rejection.

### 2.3 Deploy

1. Click **"Create Web Service"**
2. Wait for the build and deploy to complete
3. Note the deployed URL (e.g., `https://tamil-learning-api.onrender.com`)

### 2.4 Verify

```bash
curl https://tamil-learning-api.onrender.com/api/health
# Expected: {"status":"ok","timestamp":"..."}

curl https://tamil-learning-api.onrender.com/api/readiness
# Expected: {"status":"ready","checks":{"database":{"ready":true},"email":{"ready":true,...}}}
```

---

## Step 3: Frontend Deployment (Vercel)

### 3.1 Create a Project

1. Log in to [Vercel](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository
4. Configure:
   | Setting | Value |
   |---|---|
   | **Framework Preset** | Vite |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

### 3.2 Set Environment Variables

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://tamil-learning-api.onrender.com/api` |

### 3.3 Configure Rewrites

The project already includes `frontend/vercel.json` for SPA routing:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait for the build to complete
3. Note the deployed URL (e.g., `https://your-app.vercel.app`)

### 3.5 Update Backend CORS

Go back to Render and update the backend's `FRONTEND_URL` environment variable:
```
FRONTEND_URL=https://your-app.vercel.app
```

---

## Step 4: Post-Deployment

### 4.1 Create Admin User

1. Register a normal account through the frontend
2. Open MongoDB Atlas → **Browse Collections** → `users` collection
3. Find your user document and edit the `role` field:
   ```json
   { "role": "admin" }
   ```
4. Log out and log back in to refresh the token

### 4.2 Verify All Endpoints

```bash
# Health check
curl https://tamil-learning-api.onrender.com/api/health

# Register
curl -X POST https://tamil-learning-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"test123"}'

# Login
curl -X POST https://tamil-learning-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### 4.3 Verify Frontend

1. Navigate to `https://your-app.vercel.app`
2. Register a new account
3. Select a category and complete a lesson
4. Check Dashboard for updated charts
5. Verify skill score changes

### 4.4 HTTPS

Both Vercel and Render provide **HTTPS by default** with automatic SSL certificates. No additional configuration needed.

### 4.5 Backup and Restore Operations

Adopt and schedule backups immediately after production go-live:

- Use Atlas snapshots + nightly `mongodump` archives.
- Run at least one non-production restore drill each quarter.
- Follow the full procedure in `docs/BACKUP_RESTORE_RUNBOOK.md`.

---

## Alternative Deployment Options

### Backend: Railway

1. Create a project on [Railway](https://railway.app)
2. Connect your repository
3. Set root directory to `backend`
4. Add the same environment variables as Render
5. Railway auto-detects Node.js and runs `npm start`

### Frontend: Netlify

1. Create a site on [Netlify](https://netlify.app)
2. Connect your repository
3. Configure:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
4. Add `VITE_API_URL` environment variable
5. Create `frontend/public/_redirects` file for SPA routing:
   ```
   /*    /index.html   200
   ```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| MongoDB connection errors | Verify Atlas IP whitelist includes `0.0.0.0/0` for cloud services |
| CORS errors in browser | Ensure `FRONTEND_URL` on backend matches your frontend domain exactly |
| API returns 404 | Ensure `VITE_API_URL` includes the `/api` path |
| Blank page on Vercel | Ensure `vercel.json` rewrites are in place |
| Lessons not loading | Run `npm run seed` with the Atlas connection string |
| JWT errors after deploy | Ensure `JWT_SECRET` is set and consistent across deploys |
| Forgot password returns 500 in production | Ensure SMTP vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`) are set correctly |
| Rate limiting in production | Adjust `max` value in `server.js` rate limiter if needed |

---

## Production Checklist

- [ ] MongoDB Atlas cluster created and seeded
- [ ] Backend deployed with all environment variables set
- [ ] Frontend deployed with `VITE_API_URL` pointing to backend
- [ ] `FRONTEND_URL` on backend updated to match frontend domain
- [ ] Admin user created
- [ ] HTTPS verified (automatic on Vercel/Render)
- [ ] Health check endpoint responding
- [ ] Registration and login working
- [ ] Lessons loading and submittable
- [ ] Dashboard charts rendering
- [ ] Admin panel accessible for admin users
