export const ErrorCodes = {
  VALIDATION: 'VALIDATION',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL: 'INTERNAL',
} as const;

export interface ApiErrorBody {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJson(): ApiErrorBody {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    };
  }
}

export function validationError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(400, ErrorCodes.VALIDATION, message, details);
}

export function unauthorizedError(message = 'Unauthorized'): AppError {
  return new AppError(401, ErrorCodes.UNAUTHORIZED, message);
}

export function forbiddenError(message = 'Forbidden'): AppError {
  return new AppError(403, ErrorCodes.FORBIDDEN, message);
}

export function notFoundError(message = 'Resource not found'): AppError {
  return new AppError(404, ErrorCodes.NOT_FOUND, message);
}

export function conflictError(message: string): AppError {
  return new AppError(409, ErrorCodes.CONFLICT, message);
}

export function badRequestError(message: string): AppError {
  return new AppError(400, ErrorCodes.BAD_REQUEST, message);
}
