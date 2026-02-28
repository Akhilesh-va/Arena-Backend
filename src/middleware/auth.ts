import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { unauthorizedError } from '../utils/errors';
import { UserModel, UserDocument } from '../models/User';
import {
  verifyFirebaseIdToken,
  getOrCreateUserFromFirebase,
} from '../services/firebaseAuthService';

export interface JwtPayload {
  userId: string;
  email: string;
  type: 'access';
}

export interface AuthRequest extends Request {
  userId?: string;
  user?: UserDocument | null;
}

/**
 * Protects routes: accepts either backend JWT (from email/password) or Firebase ID token
 * (from Google/social). Firebase tokens are verified ONLY with admin.auth().verifyIdToken();
 * we never verify them with JWT_SECRET.
 */
export async function authMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(unauthorizedError('Missing or invalid Authorization header'));
    return;
  }
  const idToken = authHeader.slice(7);

  try {
    const decoded = jwt.decode(idToken);
    const isBackendJwt =
      decoded &&
      typeof decoded === 'object' &&
      'type' in decoded &&
      (decoded as { type: string }).type === 'access';

    if (isBackendJwt) {
      const payload = jwt.verify(idToken, env.JWT_SECRET) as JwtPayload;
      const user = await UserModel.findById(payload.userId).select('-passwordHash');
      if (!user) {
        next(unauthorizedError('User not found'));
        return;
      }
      req.userId = payload.userId;
      req.user = user;
      next();
      return;
    }

    const firebaseDecoded = await verifyFirebaseIdToken(idToken);
    if (!firebaseDecoded) {
      next(unauthorizedError('Invalid or expired token'));
      return;
    }
    const user = await getOrCreateUserFromFirebase(firebaseDecoded);
    if (!user) {
      next(unauthorizedError('User not found'));
      return;
    }
    req.userId = user._id.toString();
    req.user = user;
    next();
  } catch {
    next(unauthorizedError('Invalid or expired token'));
  }
}

export function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = authHeader.slice(7);
  jwt.verify(token, env.JWT_SECRET, (err, decoded) => {
    if (err || !decoded) {
      next();
      return;
    }
    const payload = decoded as JwtPayload;
    if (payload.type === 'access') {
      req.userId = payload.userId;
    }
    next();
  });
}
