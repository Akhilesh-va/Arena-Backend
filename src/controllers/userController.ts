import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as userService from '../services/userService';
import type { UpdateMeInput } from '../services/userService';

export async function getMe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const user = await userService.getMe(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      return;
    }
    res.json(user);
  } catch (e) {
    next(e);
  }
}

export async function getUserById(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const result = await userService.getUserById(req.userId, id);
    res.json({
      ...result.user.toObject(),
      followersCount: result.followersCount,
      followingCount: result.followingCount,
      connectionsCount: result.connectionsCount,
      isFollowing: result.isFollowing,
    });
  } catch (e) {
    next(e);
  }
}

export async function updateMe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const body = req.body as Record<string, unknown>;
    const input: UpdateMeInput = {};
    if (body.displayName !== undefined) input.displayName = String(body.displayName).trim();
    if (body.username !== undefined) input.username = String(body.username).trim();
    if (body.photoUrl !== undefined) input.photoUrl = body.photoUrl === '' ? undefined : (body.photoUrl as string);
    if (body.coverImageUrl !== undefined) input.coverImageUrl = body.coverImageUrl === '' ? undefined : (body.coverImageUrl as string);
    if (body.bio !== undefined) input.bio = body.bio === '' ? undefined : (body.bio as string);
    if (body.region !== undefined) input.region = body.region === '' ? undefined : (body.region as string);
    if (body.tagline !== undefined) input.tagline = body.tagline === '' ? undefined : (body.tagline as string);
    if (body.achievements !== undefined) {
      input.achievements = Array.isArray(body.achievements)
        ? (body.achievements as Array<{ title?: string; description?: string; gameName?: string }>).map((a) => ({
            title: typeof a?.title === 'string' ? a.title : '',
            description: typeof a?.description === 'string' ? a.description : undefined,
            gameName: typeof a?.gameName === 'string' ? a.gameName : undefined,
          }))
        : [];
    }
    const result = await userService.updateMe(userId, input);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function getUsers(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = req.query.search as string | undefined;
    console.log(`[DEBUG] getUsers search='${search}' page=${page} limit=${limit} userId=${req.userId}`);
    const { users, total } = await userService.getUsers(req.userId!, page, limit, search);
    console.log(`[DEBUG] getUsers found ${users.length} users (total=${total})`);
    res.json({ users, total, page, limit });
  } catch (e) {
    next(e);
  }
}

export async function addFcmToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { token } = req.body;
    await userService.addFcmToken(userId, token);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function follow(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const followerId = req.userId!;
    const { id: followingId } = req.params;
    await userService.followUser(followerId, followingId);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function unfollow(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const followerId = req.userId!;
    const { id: followingId } = req.params;
    await userService.unfollowUser(followerId, followingId);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function deleteMe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    await userService.deleteUser(userId);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
