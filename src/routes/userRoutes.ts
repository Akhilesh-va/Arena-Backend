import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as userController from '../controllers/userController';

const router = Router();

router.use(authMiddleware);

router.get('/me', userController.getMe);
router.delete('/me', userController.deleteMe);
// Allow empty string for optional fields (client sends "" to clear). Non-empty URL must be valid.
const optionalUrl = (field: string) =>
  body(field).optional().custom((val) => {
    if (val == null || val === '') return true;
    return typeof val === 'string' && /^https?:\/\//i.test(val);
  }).withMessage(`${field} must be a valid http(s) URL or empty`);

router.patch(
  '/me',
  validate([
    body('displayName').optional().trim().isLength({ min: 0, max: 100 }),
    optionalUrl('photoUrl'),
    optionalUrl('coverImageUrl'),
    body('bio').optional().isLength({ min: 0, max: 500 }),
    body('region').optional().isLength({ min: 0, max: 100 }),
    body('tagline').optional().isLength({ min: 0, max: 150 }),
    body('username').optional().trim().isLength({ min: 2, max: 30 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers and underscores (no spaces)'),
    body('achievements').optional().isArray(),
    body('achievements.*.title').optional().trim().isLength({ min: 1, max: 200 }),
    body('achievements.*.description').optional().trim().isLength({ max: 1000 }),
    body('achievements.*.gameName').optional().trim().isLength({ max: 100 }),
  ]),
  userController.updateMe
);
router.post(
  '/me/fcm-token',
  validate([body('token').notEmpty()]),
  userController.addFcmToken
);

router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('search').optional().isString(),
  ]),
  userController.getUsers
);
router.get(
  '/:id',
  validate([param('id').isMongoId()]),
  userController.getUserById
);
router.post(
  '/:id/follow',
  validate([param('id').isMongoId()]),
  userController.follow
);
router.delete(
  '/:id/follow',
  validate([param('id').isMongoId()]),
  userController.unfollow
);

export const userRoutes = router;
