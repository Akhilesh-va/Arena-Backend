import { Router } from 'express';
import { query } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadSingle, uploadErrorHandler } from '../middleware/upload';
import * as mediaController from '../controllers/mediaController';

const router = Router();

router.use(authMiddleware);

router.post(
  '/upload',
  uploadSingle,
  uploadErrorHandler,
  mediaController.upload
);

router.get(
  '/upload-signature',
  validate([
    query('folder').optional().isIn(['profile', 'posts', 'clips', 'articles']),
    query('prefix').optional().isString(),
  ]),
  mediaController.getUploadSignature
);

export const mediaRoutes = router;
