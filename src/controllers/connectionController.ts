import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as connectionService from '../services/connectionService';

export async function getStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const otherUserId = req.params.userId;
    const result = await connectionService.getConnectionStatus(userId, otherUserId);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function createRequest(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { toUserId } = req.body;
    const result = await connectionService.createRequest(userId, toUserId);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

export async function acceptRequest(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { requestId } = req.body;
    await connectionService.acceptRequest(userId, requestId);
    res.status(200).json({ success: true });
  } catch (e) {
    next(e);
  }
}

export async function rejectRequest(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { requestId } = req.body;
    await connectionService.rejectRequest(userId, requestId);
    res.status(200).json({ success: true });
  } catch (e) {
    next(e);
  }
}

export async function cancelRequest(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { requestId } = req.body;
    await connectionService.cancelRequest(userId, requestId);
    res.status(200).json({ success: true });
  } catch (e) {
    next(e);
  }
}

export async function getRequests(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await connectionService.getRequests(req.userId!);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function getConnectionsList(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await connectionService.getConnectionsList(req.userId!);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function removeConnection(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { connectedUserId } = req.body;
    await connectionService.removeConnection(userId, connectedUserId);
    res.status(200).json({ success: true });
  } catch (e) {
    next(e);
  }
}
