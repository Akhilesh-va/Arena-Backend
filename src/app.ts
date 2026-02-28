import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { isConnected } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/authRoutes';
import { userRoutes } from './routes/userRoutes';
import { postRoutes } from './routes/postRoutes';
import { articleRoutes } from './routes/articleRoutes';
import { feedRoutes } from './routes/feedRoutes';
import { conversationRoutes } from './routes/conversationRoutes';
import { connectionRoutes } from './routes/connectionRoutes';
import { notificationRoutes } from './routes/notificationRoutes';
import { mediaRoutes } from './routes/mediaRoutes';

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: { error: 'Too many requests', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

app.get('/ready', (_req, res) => {
  if (isConnected()) {
    res.json({ status: 'ok', database: 'connected' });
  } else {
    res.status(503).json({ status: 'degraded', database: 'disconnected' });
  }
});

const basePath = env.API_BASE_PATH;
app.use(`${basePath}/auth`, authLimiter, authRoutes);
app.use(`${basePath}/users`, userRoutes);
app.use(`${basePath}/posts`, postRoutes);
app.use(`${basePath}/articles`, articleRoutes);
app.use(`${basePath}/feed`, feedRoutes);
app.use(`${basePath}/conversations`, conversationRoutes);
app.use(`${basePath}/connections`, connectionRoutes);
app.use(`${basePath}/notifications`, notificationRoutes);
app.use(`${basePath}/media`, mediaRoutes);

app.use(errorHandler);

export { app };
