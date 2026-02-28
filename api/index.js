/**
 * Vercel serverless entry when "Root Directory" is set to "backend".
 * Build: npm run build (tsc). Do not use app.listen() here.
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
  try {
    await ensureInit();
    app(req, res);
  } catch (err) {
    console.error('Serverless init error:', err);
    res.status(503).setHeader('Content-Type', 'application/json').end(
      JSON.stringify({
        error: 'Service temporarily unavailable',
        message: err.message || String(err),
        code: 'INIT_FAILED',
      })
    );
  }
};
