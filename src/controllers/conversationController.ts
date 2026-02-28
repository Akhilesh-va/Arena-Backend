import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as conversationService from '../services/conversationService';

export async function getOrCreateConversation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { otherUserId } = req.body;
    const conversationId = await conversationService.getOrCreateConversation(
      userId,
      otherUserId
    );
    res.status(201).json({ conversationId });
  } catch (e) {
    next(e);
  }
}

export async function getConversations(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const list = await conversationService.getConversations(req.userId!);
    res.json(list);
  } catch (e) {
    next(e);
  }
}

export async function getMessages(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 50));
    const before = req.query.before as string | undefined;
    const result = await conversationService.getMessages(id, req.userId!, limit, before);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function sendMessage(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { text, attachmentUrl, attachmentType } = req.body;
    const message = await conversationService.sendMessage(
      id,
      req.userId!,
      text,
      attachmentUrl,
      attachmentType
    );
    res.status(201).json(message);
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
    const { id } = req.params;
    await conversationService.markAsRead(id, req.userId!);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
