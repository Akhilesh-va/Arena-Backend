import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { UserModel, IUser, UserDocument } from '../models/User';
import { RefreshTokenModel } from '../models/RefreshToken';
import { env } from '../config/env';
import {
  conflictError,
  unauthorizedError,
  badRequestError,
} from '../utils/errors';

const SALT_ROUNDS = 12;

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  photoUrl?: string;
}

export interface LoginResult {
  user: Omit<IUser, 'passwordHash' | 'resetPasswordToken' | 'resetPasswordExpires'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export async function register(input: RegisterInput): Promise<LoginResult> {
  const existing = await UserModel.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    throw conflictError('Email already registered');
  }
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await UserModel.create({
    email: input.email.toLowerCase(),
    passwordHash,
    displayName: input.displayName.trim(),
    photoUrl: input.photoUrl,
  });
  return createSession(user);
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    throw unauthorizedError('Invalid email or password');
  }
  if (!user.passwordHash) {
    throw unauthorizedError('This account uses social sign-in. Sign in with Google or your provider.');
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw unauthorizedError('Invalid email or password');
  }
  return createSession(user);
}

async function createSession(user: UserDocument | (IUser & { _id: mongoose.Types.ObjectId })): Promise<LoginResult> {
  const userId = user._id.toString();
  const email = user.email;
  const obj = typeof (user as UserDocument).toObject === 'function'
    ? (user as UserDocument).toObject()
    : { ...user };
  const { passwordHash, resetPasswordToken, resetPasswordExpires, ...safeUser } = obj as IUser & {
    passwordHash?: string;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
  };
  const accessToken = jwt.sign(
    { userId, email, type: 'access' } as TokenPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRY } as jwt.SignOptions
  );
  const refreshTokenValue = uuidv4();
  const decoded = jwt.decode(accessToken) as { exp: number } | null;
  const expiresIn = decoded ? decoded.exp - Math.floor(Date.now() / 1000) : 900;
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshTokenModel.create({
    userId: user._id,
    token: refreshTokenValue,
    expiresAt: refreshExpires,
  });
  const refreshToken = jwt.sign(
    { userId, email, type: 'refresh', jti: refreshTokenValue } as TokenPayload & { jti: string },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY } as jwt.SignOptions
  );
  return {
    user: safeUser as LoginResult['user'],
    accessToken,
    refreshToken,
    expiresIn,
  };
}

export async function refreshTokens(refreshToken: string): Promise<LoginResult> {
  let decoded: (TokenPayload & { jti?: string }) | null = null;
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload & { jti?: string };
  } catch {
    throw unauthorizedError('Invalid or expired refresh token');
  }
  if (decoded.type !== 'refresh' || !decoded.jti) {
    throw unauthorizedError('Invalid refresh token');
  }
  const stored = await RefreshTokenModel.findOne({
    token: decoded.jti,
    userId: decoded.userId,
  });
  if (!stored || stored.expiresAt < new Date()) {
    throw unauthorizedError('Refresh token expired or invalid');
  }
  await RefreshTokenModel.deleteOne({ _id: stored._id });
  const user = await UserModel.findById(decoded.userId);
  if (!user) {
    throw unauthorizedError('User not found');
  }
  return createSession(user);
}

export async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload & {
      jti?: string;
    };
    if (decoded.jti) {
      await RefreshTokenModel.deleteOne({ token: decoded.jti });
    }
  } catch {
    // ignore invalid token
  }
}

export async function forgotPassword(email: string): Promise<{ resetToken: string }> {
  const user = await UserModel.findOne({ email: email.toLowerCase() }).select(
    '+resetPasswordToken +resetPasswordExpires'
  );
  if (!user) {
    // Don't reveal whether email exists
    return { resetToken: crypto.randomBytes(32).toString('hex') };
  }
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + env.PASSWORD_RESET_EXPIRY * 1000);
  await UserModel.updateOne(
    { _id: user._id },
    { $set: { resetPasswordToken: resetToken, resetPasswordExpires: expires } }
  );
  return { resetToken };
}

export async function resetPassword(
  resetToken: string,
  newPassword: string
): Promise<void> {
  const user = await UserModel.findOne({
    resetPasswordToken: resetToken,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires');
  if (!user) {
    throw badRequestError('Invalid or expired reset token');
  }
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await UserModel.updateOne(
    { _id: user._id },
    {
      $set: { passwordHash },
      $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 },
    }
  );
}
