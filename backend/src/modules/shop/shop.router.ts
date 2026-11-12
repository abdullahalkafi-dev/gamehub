import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { COIN_PACKAGES } from '../../config/constants.js';
import { env } from '../../config/env.js';
import { asyncHandler, currentUser, requireAuth } from '../../middleware/auth.js';
import * as service from './shop.service.js';

const buyLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  skip: () => env.isTest,
  message: { error: { code: 'rate_limited', message: 'Slow down a little.' } },
});

export const shopRouter = Router();
shopRouter.get('/packages', (_req, res) => {
  res.json({ packages: COIN_PACKAGES, demo: true });
});
shopRouter.post(
  '/purchase',
  requireAuth,
  buyLimiter,
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.purchase(currentUser(req), service.purchaseSchema.parse(req.body)));
  }),
);
shopRouter.get(
  '/purchases',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ purchases: await service.listPurchases(currentUser(req)) });
  }),
);
