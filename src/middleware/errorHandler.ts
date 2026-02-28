import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes, ApiErrorBody } from '../utils/errors';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toJson());
    return;
  }

  const code = ErrorCodes.INTERNAL;
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  const body: ApiErrorBody = { error: message, code };
  if (env.NODE_ENV !== 'production' && err.stack) {
    body.details = { stack: err.stack };
  }
  res.status(500).json(body);
}
