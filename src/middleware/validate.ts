import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { validationError } from '../utils/errors';

export function validate(validations: ValidationChain[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map((v) => v.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
      return;
    }
    const details: Record<string, string> = {};
    errors.array().forEach((e) => {
      if (e.type === 'field' && e.path) {
        details[e.path] = e.msg as string;
      }
    });
    next(validationError('Validation failed', details));
  };
}
