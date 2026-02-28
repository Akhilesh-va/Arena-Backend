import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/authController';
import { validate } from '../middleware/validate';

const router = Router();

router.post(
  '/register',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('displayName').trim().notEmpty().isLength({ max: 100 }),
    body('photoUrl').optional().isURL(),
  ]),
  authController.register
);

router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ]),
  authController.login
);

router.post(
  '/refresh',
  validate([body('refreshToken').notEmpty()]),
  authController.refresh
);

router.post(
  '/logout',
  validate([body('refreshToken').optional()]),
  authController.logout
);

router.post(
  '/forgot-password',
  validate([body('email').isEmail().normalizeEmail()]),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  validate([
    body('resetToken').notEmpty(),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ]),
  authController.resetPassword
);

router.post(
  '/firebase-check',
  validate([body('idToken').notEmpty()]),
  authController.firebaseCheck
);

router.post(
  '/register-firebase',
  validate([
    body('idToken').notEmpty(),
    body('displayName').optional().trim().isLength({ max: 100 }),
    body('username').optional().trim().isLength({ min: 2, max: 30 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers and underscores (no spaces)'),
    body('photoUrl').optional().custom((val) => !val || (typeof val === 'string' && /^https?:\/\//i.test(val))).withMessage('photoUrl must be a valid URL or empty'),
    body('age').optional().trim().isLength({ max: 10 }),
    body('gender').optional().trim().isLength({ max: 50 }),
    body('phoneNumber').optional().trim().isLength({ max: 30 }),
    body('primaryGame').optional().trim().isLength({ max: 100 }),
  ]),
  authController.registerFirebase
);

export const authRoutes = router;
