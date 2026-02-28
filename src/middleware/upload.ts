import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { badRequestError } from '../utils/errors';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/3gpp',
    'video/webm',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    // Android may send from temp file as octet-stream; Cloudinary still accepts with resource_type auto
    'application/octet-stream',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(badRequestError('File type not allowed'));
  }
};

export const uploadSingle = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
}).single('file');

export function uploadErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(badRequestError('File too large'));
      return;
    }
  }
  next(err);
}
