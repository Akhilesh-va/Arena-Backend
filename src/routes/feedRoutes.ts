import { Router } from 'express';
import { query } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as feedController from '../controllers/feedController';

const router = Router();

router.use(authMiddleware);

router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ]),
  feedController.getFeed
);

export const feedRoutes = router;
