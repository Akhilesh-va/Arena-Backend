import { Router } from 'express';
import { param, query } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as notificationController from '../controllers/notificationController';

const router = Router();

router.use(authMiddleware);

router.get(
  '/',
  validate([
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('before').optional().isMongoId(),
  ]),
  notificationController.getNotifications
);
router.patch(
  '/:id/read',
  validate([param('id').isMongoId()]),
  notificationController.markAsRead
);
router.post('/read-all', notificationController.markAllAsRead);

export const notificationRoutes = router;
