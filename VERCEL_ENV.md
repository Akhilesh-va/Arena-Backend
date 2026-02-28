# Vercel environment variables for Arena backend

Set these in **Vercel** → your project → **Settings** → **Environment Variables**. Use **Production** (and optionally Preview/Development) and add each name/value below.

---

## Required (must set in production)

| Variable | Description | Example (use your own values) |
|----------|-------------|--------------------------------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/arena?retryWrites=true&w=majority` |
| `JWT_SECRET` | Secret for signing access tokens (min 32 chars) | Long random string, e.g. from `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (different from JWT_SECRET) | Another long random string |

---

## Required for Google / Firebase sign-in

| Variable | Description | Where to get it |
|----------|-------------|------------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID | Firebase Console → Project settings |
| `FIREBASE_CLIENT_EMAIL` | Service account client email | Firebase Console → Project settings → Service accounts → Generate key → JSON |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Same JSON. In Vercel, paste the full key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. Use **double quotes** and keep `\n` as literal (or paste multi-line). |

---

## Required for image uploads (Cloudinary)

| Variable | Description | Where to get it |
|----------|-------------|------------------|
| `CLOUDINARY_CLOUD_NAME` | Cloud name | Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | API key | Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | API secret | Cloudinary dashboard |

If these are missing, media upload endpoints will fail (profile photo, etc.).

---

## Optional (have defaults)

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Set to `production` on Vercel (often set automatically). |
| `PORT` | `3000` | Vercel sets this; you usually don’t need to. |
| `API_BASE_PATH` | `/api/v1` | Path prefix for all API routes (e.g. `/api/v1/auth/login`). |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token lifetime (e.g. `15m`, `1h`). |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token lifetime (e.g. `7d`). |
| `PASSWORD_RESET_EXPIRY` | `3600` | Password reset token TTL in seconds. |
| `CORS_ORIGINS` | `*` | Allowed origins, comma-separated. In production set to your app’s URL(s), e.g. `https://yourapp.com,https://www.yourapp.com`. |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min default). |
| `RATE_LIMIT_MAX` | `100` | Max requests per window per IP. |

---

## Summary checklist for Vercel

- [ ] `MONGODB_URI` (e.g. Atlas connection string)
- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `FIREBASE_PRIVATE_KEY` (paste full key; Vercel accepts multi-line)
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`
- [ ] `CORS_ORIGINS` = your frontend / app URL(s) (e.g. `https://yourapp.vercel.app` or your Android app’s backend URL if you use one)

**Note:** Your Android app’s `API_BASE_URL` must point to the Vercel deployment URL (e.g. `https://arena-backend-taav.vercel.app/api/v1/`). The serverless function is at `/api`; use paths like `/api/v1/health`, `/api/v1/auth/login`. See also "Why the function was crashing" below.

---

## Why the function was crashing (500 FUNCTION_INVOCATION_FAILED)

The backend uses `app.listen()` (long-running server). On Vercel each request runs a **serverless function**—no persistent process. If Vercel ran `dist/index.js`, it would call `app.listen()` and then exit or throw. **Fix:** Use the serverless entry `api/index.js` (connects DB/Firebase once, then forwards requests to Express). Commit `api/index.js` and `vercel.json`, redeploy, and set all required env vars in Vercel so init does not throw.
