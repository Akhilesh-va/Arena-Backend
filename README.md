# Arena Backend

REST API for the Arena Android app (Kotlin, `com.example.arena`). Built with **Node.js**, **Express**, **MongoDB**, and **Cloudinary** for media.

## Product scope

- **Actors:** End users (gamers). Optional: admin later.
- **Core features:**
  - Auth: register, login, refresh, logout, forgot-password, reset-password (JWT).
  - User profile: get/update me, get user by id, FCM token.
  - Posts: create (text/image/video/audio), feed, like, comment.
  - Articles: create, get, like, save.
  - Feed: unified feed (posts + articles).
  - Messaging: conversations, send/get messages, mark read.
  - Media: stored as Cloudinary URLs (app uploads to Cloudinary, sends URL to API).
- **Main entities:** User, Post, Article, Conversation, Message, Like, SavedArticle, Notification.

## Tech stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Framework:** Express
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT (access + refresh) for email/password; **Firebase ID token** for Google/social (verified with Firebase Admin SDK)
- **Media:** Cloudinary (URLs in DB; upload from app or via API)

## Quick start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account (for media)

### Install and run

```bash
cd backend
cp .env.example .env
# Edit .env with your MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET, CLOUDINARY_*.
npm install
npm run dev
```

Server runs at `http://localhost:3000`. API base: `http://localhost:3000/api/v1`.

### With Docker

```bash
docker-compose up -d
# Backend: port 3000, MongoDB: 27017
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | `development` or `production` |
| `PORT` | No | Server port (default 3000) |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | Secret for refresh tokens |
| `JWT_ACCESS_EXPIRY` | No | e.g. `15m` |
| `JWT_REFRESH_EXPIRY` | No | e.g. `7d` |
| `CLOUDINARY_CLOUD_NAME` | Yes* | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes* | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes* | Cloudinary API secret |
| `FIREBASE_PROJECT_ID` | Yes** | Firebase project ID (for Google/social token verification) |
| `FIREBASE_CLIENT_EMAIL` | Yes** | Firebase service account client email |
| `FIREBASE_PRIVATE_KEY` | Yes** | Firebase service account private key (use `\n` for newlines in .env) |
| `CORS_ORIGINS` | No | Comma-separated origins |

\* Required for upload/sign endpoints; feed and posts can work with URLs only.  
\** Required for accepting Google (and other social) sign-in; get from Firebase Console → Project settings → Service accounts → Generate new private key. See **docs/BACKEND_FIREBASE_AUTH.md** for checklist and Node.js example.

## API overview

- **Base URL:** `/api/v1`
- **Auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`
- **Users:** `GET /users/me`, `PATCH /users/me`, `GET /users/:id`, `GET /users` (paginated), `POST /users/me/fcm-token`
- **Posts:** `POST /posts`, `GET /posts/:id`, `GET /posts`, `PATCH /posts/:id`, `DELETE /posts/:id`, `POST /posts/:id/like`, `POST /posts/:id/comments`
- **Articles:** `POST /articles`, `GET /articles/:id`, `GET /articles`, `PATCH /articles/:id`, `DELETE /articles/:id`, `POST /articles/:id/like`, `POST /articles/:id/save`
- **Feed:** `GET /feed`
- **Conversations:** `GET /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages`, `POST /conversations/:id/read`
- **Media:** `POST /media/upload` (optional; app can upload to Cloudinary directly)
- **Health:** `GET /health`

Protected routes use header: `Authorization: Bearer <token>`. The backend accepts either:
- **Backend JWT** (from `POST /auth/login` or `POST /auth/register`)
- **Firebase ID token** (from Google/social sign-in; verified with Firebase Admin SDK; user is found or created in MongoDB by `firebaseUid`/email)

## Tests

```bash
npm test
```

- **Unit tests** (auth service, etc.) run with mocks; no database required.
- **Integration tests** (auth API, protected routes) require a running MongoDB. Set:
  ```bash
  MONGODB_URI=mongodb://localhost:27017/arena_test
  ```
  Then run `npm test`. Integration tests are in `src/__tests__/api/`.

## Project structure

```
backend/
├── src/
│   ├── config/       # env, db, cloudinary
│   ├── models/       # Mongoose schemas
│   ├── routes/       # Express routers
│   ├── controllers/  # Request handlers
│   ├── services/     # Business logic
│   ├── middleware/   # auth, validation, error, rate limit
│   ├── utils/        # errors, validators
│   └── index.ts      # Entrypoint
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## License

Private – Arena project.
