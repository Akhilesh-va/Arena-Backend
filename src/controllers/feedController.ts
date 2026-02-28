import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as feedService from '../services/feedService';

export async function getFeed(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await feedService.getFeed(req.userId, page, limit);
    res.json(result);
  } catch (e) {
    next(e);
  }
}
