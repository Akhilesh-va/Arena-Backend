/**
 * Vercel serverless entry. Do not use app.listen() here; Vercel invokes this per request.
 * Build with: npm run build (tsc), then this file requires from dist/.
 */
const { app } = require('../dist/app');
const { connectDatabase } = require('../dist/config/database');
const { initFirebaseAdmin } = require('../dist/config/firebase');

let initialized = false;

async function ensureInit() {
  if (initialized) return;
  initFirebaseAdmin();
  await connectDatabase();
  initialized = true;
}

module.exports = async (req, res) => {
  await ensureInit();
  app(req, res);
};
