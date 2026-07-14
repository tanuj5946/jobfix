import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type Target = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodSchema, target: Target = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const errors = (result.error as ZodError).flatten().fieldErrors;
      res.status(422).json({ success: false, message: 'Validation error', errors });
      return;
    }
    // Replace the target with the parsed (coerced + stripped) value
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
