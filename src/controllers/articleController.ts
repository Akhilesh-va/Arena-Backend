import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as articleService from '../services/articleService';

export async function createArticle(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authorId = req.userId!;
    const { title, body, coverImageUrl, authorType } = req.body;
    const article = await articleService.createArticle({
      authorId,
      title,
      body,
      coverImageUrl,
      authorType: authorType || 'USER',
    });
    res.status(201).json(article);
  } catch (e) {
    next(e);
  }
}

export async function getArticle(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const article = await articleService.getArticleById(id, req.userId);
    res.json(article);
  } catch (e) {
    next(e);
  }
}

export async function getArticlesByAuthor(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { authorId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const { articles, total } = await articleService.getArticlesByAuthor(
      authorId,
      page,
      limit
    );
    res.json({ articles, total, page, limit });
  } catch (e) {
    next(e);
  }
}

export async function updateArticle(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const { title, body, coverImageUrl } = req.body;
    const article = await articleService.updateArticle(id, userId, {
      title,
      body,
      coverImageUrl,
    });
    res.json(article);
  } catch (e) {
    next(e);
  }
}

export async function deleteArticle(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    await articleService.deleteArticle(id, req.userId!);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function likeArticle(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const result = await articleService.likeArticle(id, req.userId!);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function saveArticle(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const result = await articleService.saveArticle(id, req.userId!);
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
    const comment = await articleService.addComment(id, req.userId!, text);
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
    const result = await articleService.getComments(id, page, limit);
    res.json(result);
  } catch (e) {
    next(e);
  }
}
