import { rateLimit } from 'express-rate-limit';

const tooManyRequests = {
  success: false,
  message: 'Too many requests. Please try again later.',
};

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooManyRequests,
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooManyRequests,
});
