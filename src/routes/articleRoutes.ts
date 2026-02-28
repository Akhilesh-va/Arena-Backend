import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as articleController from '../controllers/articleController';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  validate([
    body('title').trim().notEmpty().isLength({ max: 200 }),
    body('body').notEmpty().isLength({ max: 50000 }),
    body('coverImageUrl').optional().isURL(),
    body('authorType').optional().isIn(['USER', 'ORG']),
  ]),
  articleController.createArticle
);

router.get(
  '/:id',
  validate([param('id').isMongoId()]),
  articleController.getArticle
);
router.get(
  '/author/:authorId',
  validate([
    param('authorId').isMongoId(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ]),
  articleController.getArticlesByAuthor
);
router.patch(
  '/:id',
  validate([
    param('id').isMongoId(),
    body('title').optional().trim().notEmpty().isLength({ max: 200 }),
    body('body').optional().isLength({ max: 50000 }),
    body('coverImageUrl').optional().isURL(),
  ]),
  articleController.updateArticle
);
router.delete(
  '/:id',
  validate([param('id').isMongoId()]),
  articleController.deleteArticle
);
router.post(
  '/:id/like',
  validate([param('id').isMongoId()]),
  articleController.likeArticle
);
router.post(
  '/:id/save',
  validate([param('id').isMongoId()]),
  articleController.saveArticle
);
router.get(
  '/:id/comments',
  validate([
    param('id').isMongoId(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ]),
  articleController.getComments
);
router.post(
  '/:id/comments',
  validate([
    param('id').isMongoId(),
    body('text').notEmpty().isLength({ max: 2000 }),
  ]),
  articleController.addComment
);

export const articleRoutes = router;
