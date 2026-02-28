import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as notificationService from '../services/notificationService';

export async function getNotifications(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 50));
    const before = req.query.before as string | undefined;
    const list = await notificationService.getNotificationsForUser(userId, limit, before);
    res.json({ notifications: list });
  } catch (e) {
    next(e);
  }
}

export async function markAsRead(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    await notificationService.markAsRead(id, userId);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function markAllAsRead(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await notificationService.markAllAsRead(req.userId!);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
