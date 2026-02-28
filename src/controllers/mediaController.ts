import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as mediaService from '../services/mediaService';

export async function upload(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const file = req.file;
    if (!file || !file.buffer) {
      res.status(400).json({ error: 'No file uploaded', code: 'VALIDATION' });
      return;
    }
    const folder = (req.body.folder as mediaService.MediaFolder) || 'posts';
    const prefix = req.body.prefix || userId;
    const resourceType = req.body.resourceType as 'image' | 'video' | undefined;
    const result = await mediaService.uploadToCloudinary(
      file.buffer,
      folder,
      prefix,
      { resourceType }
    );
    res.status(201).json({ url: result.url, publicId: result.publicId });
  } catch (e) {
    next(e);
  }
}

export async function getUploadSignature(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const folder = (req.query.folder as mediaService.MediaFolder) || 'posts';
    const prefix = (req.query.prefix as string) || userId;
    const timestamp = Math.floor(Date.now() / 1000);
    const result = mediaService.getUploadSignature(folder, prefix, timestamp);
    res.json({ ...result, timestamp });
  } catch (e) {
    next(e);
  }
}
