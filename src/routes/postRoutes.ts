import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as postController from '../controllers/postController';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  validate([
    body('type').isIn(['text', 'image', 'video', 'audio']),
    body('caption').optional().isString().isLength({ max: 2000 }),
    body('mediaUrl').optional().isURL(),
    body('thumbnailUrl').optional().isURL(),
  ]),
  postController.createPost
);

router.get(
  '/saved',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ]),
  postController.getSavedPosts
);
router.get(
  '/author/:authorId',
  validate([
    param('authorId').isMongoId(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ]),
  postController.getPostsByAuthor
);
router.get(
  '/:id',
  validate([param('id').isMongoId()]),
  postController.getPost
);
router.patch(
  '/:id',
  validate([
    param('id').isMongoId(),
    body('caption').optional().isString().isLength({ max: 2000 }),
    body('mediaUrl').optional().isURL(),
    body('thumbnailUrl').optional().isURL(),
  ]),
  postController.updatePost
);
router.delete(
  '/:id',
  validate([param('id').isMongoId()]),
  postController.deletePost
);
router.post(
  '/:id/like',
  validate([param('id').isMongoId()]),
  postController.likePost
);
router.post(
  '/:id/save',
  validate([param('id').isMongoId()]),
  postController.savePost
);
router.post(
  '/:id/comments',
  validate([
    param('id').isMongoId(),
    body('text').notEmpty().isLength({ max: 2000 }),
  ]),
  postController.addComment
);
router.get(
  '/:id/comments',
  validate([
    param('id').isMongoId(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ]),
  postController.getComments
);

export const postRoutes = router;
