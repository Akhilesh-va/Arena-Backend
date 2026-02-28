import { Router } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as connectionController from '../controllers/connectionController';

const router = Router();

router.use(authMiddleware);

router.post(
  '/request',
  validate([body('toUserId').isMongoId()]),
  connectionController.createRequest
);
router.post(
  '/accept',
  validate([body('requestId').isMongoId()]),
  connectionController.acceptRequest
);
router.post(
  '/reject',
  validate([body('requestId').isMongoId()]),
  connectionController.rejectRequest
);
router.post(
  '/cancel',
  validate([body('requestId').isMongoId()]),
  connectionController.cancelRequest
);
router.get(
  '/status/:userId',
  validate([param('userId').isMongoId()]),
  connectionController.getStatus
);
router.get('/requests', connectionController.getRequests);
router.get('/list', connectionController.getConnectionsList);
router.post(
  '/remove',
  validate([body('connectedUserId').isMongoId()]),
  connectionController.removeConnection
);

export const connectionRoutes = router;
