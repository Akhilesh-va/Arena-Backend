# Deploy Arena backend to Vercel

## Option A: Deploy from **repo root** (recommended)

Use this if your Vercel project is connected to the whole repo and **Root Directory** is left empty or is the repo root.

- Root `vercel.json` and `api/index.js` and `package.json` are used.
- **Build:** runs `cd backend && npm ci && npm run build`.
- **API base URL after deploy:** `https://your-project.vercel.app/api/v1/` (e.g. health: `.../api/v1/health`).

No Vercel project settings change needed; just push and deploy.

---

## Option B: Deploy with **Root Directory = `backend`**

In Vercel: **Project → Settings → General → Root Directory** → set to `backend`.

- Then `backend/vercel.json` and `backend/api/index.js` are used.
- **Build:** runs `npm run build` (tsc) inside `backend/`.
- **API base URL:** same as above.

---

## If you still see 500 / FUNCTION_INVOCATION_FAILED

1. **Check function logs**  
   Vercel → your project → **Deployments** → latest deployment → **Functions** → select the function → **Logs**. The `Serverless init error:` line will show the real cause (e.g. MongoDB connection, missing env).

2. **Set env vars**  
   **Settings → Environment Variables.** At least:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`  
   See `backend/VERCEL_ENV.md` for the full list.

3. **Redeploy**  
   After changing env or Root Directory, trigger a new deployment (e.g. **Redeploy** on the latest deployment).

4. **Test the right URL**  
   Use `https://your-project.vercel.app/api/v1/health` (with `/api/v1/`), not the bare root URL.
