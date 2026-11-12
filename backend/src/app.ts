import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { adminRouter } from './modules/admin/admin.router.js';
import { authRouter } from './modules/auth/auth.router.js';
import { historyRouter } from './modules/history/history.router.js';
import { leaderboardRouter } from './modules/leaderboard/leaderboard.router.js';
import { roomRouter } from './modules/room/room.router.js';
import { shopRouter } from './modules/shop/shop.router.js';
import { webhookRouter } from './modules/webhook/webhook.router.js';

// The app is built here and started in server.ts, so tests can call it directly.
export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // we sit behind nginx
  app.disable('x-powered-by');
  app.use(helmet());

  // Webhooks first: they need the raw body, and come from the game platform, not a browser.
  app.use('/webhooks', webhookRouter);

  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.webOrigins.includes(origin)),
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client'],
    }),
  );
  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());
  app.use(rateLimit({ windowMs: 60_000, limit: 300, skip: () => env.isTest, standardHeaders: true, legacyHeaders: false }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/auth', authRouter);
  app.use('/rooms', roomRouter);
  app.use('/shop', shopRouter);
  app.use('/history', historyRouter);
  app.use('/leaderboard', leaderboardRouter);
  app.use('/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
