import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { requireAuth } from '../../middleware/auth.js';
import * as c from './auth.controller.js';

// Slows down password guessing. Skipped in tests so suites can log in freely.
const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { error: { code: 'rate_limited', message: 'Too many attempts, wait a minute.' } },
});

export const authRouter = Router();
authRouter.post('/register', authLimiter, c.register);
authRouter.post('/login', authLimiter, c.login);
authRouter.post('/logout', c.logout);
authRouter.get('/me', requireAuth, c.me);
authRouter.patch('/me', requireAuth, c.updateProfile);
authRouter.post('/change-password', requireAuth, authLimiter, c.changePassword);
