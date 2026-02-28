# Backend: Accepting Firebase ID Tokens (Google Sign-In)

The Android app sends **Firebase ID tokens** in the `Authorization` header when the user signs in with Google (or Facebook/Twitter):

```
Authorization: Bearer <firebase-id-token>
```

The server **must** verify this token with the **Firebase Admin SDK** (`admin.auth().verifyIdToken(idToken)`), **not** with your own JWT secret.

---

## 1. Verify the token with Firebase Admin SDK

**Do not** verify the Firebase ID token as your own JWT (e.g. with `JWT_SECRET`). Verify it as a Firebase ID token only.

**Node.js (Firebase Admin SDK):**

```js
const admin = require('firebase-admin');

// Initialize once (e.g. at app startup)
admin.initializeApp({ projectId: 'arena-e4d1c' }); // same Firebase project as the app

// In your auth middleware for /api/v1/feed, /api/v1/articles, etc.:
const authHeader = req.headers.authorization;
if (!authHeader?.startsWith('Bearer ')) {
  return res.status(401).json({ error: 'Missing or invalid Authorization header', code: 'UNAUTHORIZED' });
}
const idToken = authHeader.substring(7); // strip "Bearer "

try {
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  // decodedToken.uid  -> Firebase UID
  // decodedToken.email, decodedToken.name, decodedToken.picture, etc.
  req.user = decodedToken;
  next();
} catch (e) {
  console.error('Firebase token verification failed', e);
  return res.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' });
}
```

This backend implements the same flow in `src/middleware/auth.ts` and `src/services/firebaseAuthService.ts`, and also finds/creates the user in MongoDB so `req.userId` and `req.user` are set for all protected routes.

---

## 2. Checklist

| Item | Notes |
|------|--------|
| **Strip "Bearer "** | Use the string **after** `Bearer ` as the token (e.g. `authHeader.slice(7)` or `substring(7)`). |
| **Firebase project** | `initializeApp()` must use the **same** Firebase project as the app. Your token has `"aud": "arena-e4d1c"` → use project ID `arena-e4d1c`. |
| **Service account** | Use a service account key (JSON) or env vars (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) for that project. |
| **Verify ID token only** | Use `admin.auth().verifyIdToken(idToken)` for Firebase tokens. Do **not** use `jwt.verify(token, JWT_SECRET)` for them. |
| **Clock skew** | If server time is wrong, verification can fail; ensure NTP is correct. |

---

## 3. Two types of tokens

| Sign-in method | What the app sends |
|----------------|---------------------|
| **Email/password** (your backend) | Your backend’s own JWT (from `POST /auth/login` or `POST /auth/register`). |
| **Google / Facebook / Twitter** | Firebase ID token (from Firebase Auth). |

This backend supports **both**: it first checks if the token is your own JWT (claim `type: 'access'`); if not, it verifies the token as a **Firebase ID token** with `admin.auth().verifyIdToken(...)`.

---

## 4. Environment variables

Set in `.env` so Firebase Admin can verify tokens:

**Option A – Service account env vars (recommended)**

From Firebase Console → Project settings → Service accounts → **Generate new private key**, then from the JSON:

- `FIREBASE_PROJECT_ID=arena-e4d1c`
- `FIREBASE_CLIENT_EMAIL=` (value of `client_email` in the JSON)
- `FIREBASE_PRIVATE_KEY=` (value of `private_key`; in `.env` you can use `\n` for newlines, or paste the key in quotes)

**Option B – Service account JSON file**

- Download the JSON key file.
- Set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-service-account.json`
- Set `FIREBASE_PROJECT_ID=arena-e4d1c`

Then restart the backend so Firebase Admin initializes and `/feed`, `/articles`, and other protected routes accept the Firebase ID token.
