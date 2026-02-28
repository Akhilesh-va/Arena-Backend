import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as conversationController from '../controllers/conversationController';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  validate([body('otherUserId').isMongoId()]),
  conversationController.getOrCreateConversation
);
router.get('/', conversationController.getConversations);
router.get(
  '/:id/messages',
  validate([
    param('id').isMongoId(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ]),
  conversationController.getMessages
);
router.post(
  '/:id/messages',
  validate([
    param('id').isMongoId(),
    body('text').notEmpty().isLength({ max: 5000 }),
    body('attachmentUrl').optional().isURL(),
    body('attachmentType').optional().isIn(['image', 'audio']),
  ]),
  conversationController.sendMessage
);
router.post(
  '/:id/read',
  validate([param('id').isMongoId()]),
  conversationController.markAsRead
);

export const conversationRoutes = router;
