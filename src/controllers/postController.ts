import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as postService from '../services/postService';

export async function createPost(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authorId = req.userId!;
    const { type, caption, mediaUrl, thumbnailUrl } = req.body;
    const post = await postService.createPost({
      authorId,
      type,
      caption,
      mediaUrl,
      thumbnailUrl,
    });
    res.status(201).json(post);
  } catch (e) {
    next(e);
  }
}

export async function getPost(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const post = await postService.getPostById(id, req.userId);
    res.json(post);
  } catch (e) {
    next(e);
  }
}

export async function getPostsByAuthor(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { authorId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const { posts, total } = await postService.getPostsByAuthor(
      authorId,
      page,
      limit,
      req.userId
    );
    res.json({ posts, total, page, limit });
  } catch (e) {
    next(e);
  }
}

export async function updatePost(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const { caption, mediaUrl, thumbnailUrl } = req.body;
    const post = await postService.updatePost(id, userId, {
      caption,
      mediaUrl,
      thumbnailUrl,
    });
    res.json(post);
  } catch (e) {
    next(e);
  }
}

export async function deletePost(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    await postService.deletePost(id, req.userId!);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function likePost(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const result = await postService.likePost(id, req.userId!);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function addComment(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const comment = await postService.addComment(id, req.userId!, text);
    res.status(201).json(comment);
  } catch (e) {
    next(e);
  }
}

export async function getComments(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await postService.getComments(id, page, limit);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function savePost(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const result = await postService.savePost(id, req.userId!);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function getSavedPosts(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const { posts, total } = await postService.getSavedPosts(req.userId!, page, limit);
    res.json({ posts, total, page, limit });
  } catch (e) {
    next(e);
  }
}
