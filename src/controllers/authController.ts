import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as authService from '../services/authService';
import {
  verifyFirebaseIdToken,
  findUserByFirebase,
  getOrCreateUserFromFirebase,
} from '../services/firebaseAuthService';

export async function register(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password, displayName, photoUrl } = req.body;
    const result = await authService.register({
      email,
      password,
      displayName,
      photoUrl,
    });
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

export async function login(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function refresh(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshTokens(refreshToken);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function logout(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function forgotPassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;
    const { resetToken } = await authService.forgotPassword(email);
    res.json({
      message: 'If an account exists, a reset link has been sent.',
      resetToken: resetToken,
    });
  } catch (e) {
    next(e);
  }
}

export async function resetPassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { resetToken, newPassword } = req.body;
    await authService.resetPassword(resetToken, newPassword);
    res.json({ message: 'Password reset successful' });
  } catch (e) {
    next(e);
  }
}

/**
 * Check if a Firebase user exists in our DB. Used after Google sign-in: if not exists, show sign-up form.
 * Does NOT create the user.
 */
export async function firebaseCheck(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      res.status(400).json({ error: 'idToken is required', code: 'VALIDATION' });
      return;
    }
    const decoded = await verifyFirebaseIdToken(idToken);
    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' });
      return;
    }
    const user = await findUserByFirebase(decoded, false);
    if (user) {
      const u = user.toObject();
      res.json({
        exists: true,
        user: {
          _id: u._id.toString(),
          email: u.email,
          displayName: u.displayName,
          photoUrl: u.photoUrl,
          isEmailVerified: u.isEmailVerified,
        },
      });
      return;
    }
    res.json({
      exists: false,
      email: decoded.email ?? '',
      displayName: decoded.name ?? decoded.email?.split('@')[0] ?? '',
      photoUrl: decoded.picture ?? undefined,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * Create (or link) user in our DB from Firebase token. Call after user completes sign-up form.
 * Body may include: idToken, displayName, username, age, gender, phoneNumber, primaryGame.
 */
export async function registerFirebase(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { idToken, displayName, username, photoUrl, age, gender, phoneNumber, primaryGame } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      res.status(400).json({ error: 'idToken is required', code: 'VALIDATION' });
      return;
    }
    const decoded = await verifyFirebaseIdToken(idToken);
    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' });
      return;
    }
    const signUpFields = {
      displayName: displayName != null ? String(displayName).trim() : undefined,
      username: username != null ? String(username).trim() : undefined,
      photoUrl: photoUrl != null && photoUrl !== '' ? String(photoUrl).trim() : undefined,
      age: age != null ? String(age).trim() : undefined,
      gender: gender != null ? String(gender).trim() : undefined,
      phoneNumber: phoneNumber != null ? String(phoneNumber).trim() : undefined,
      primaryGame: primaryGame != null ? String(primaryGame).trim() : undefined,
    };
    const user = await getOrCreateUserFromFirebase(decoded, signUpFields);
    if (!user) {
      res.status(500).json({ error: 'Failed to create user', code: 'INTERNAL' });
      return;
    }
    const u = user.toObject();
    res.status(201).json({
      user: {
        _id: u._id.toString(),
        email: u.email,
        displayName: u.displayName,
        photoUrl: u.photoUrl,
        isEmailVerified: u.isEmailVerified,
      },
    });
  } catch (e) {
    next(e);
  }
}
