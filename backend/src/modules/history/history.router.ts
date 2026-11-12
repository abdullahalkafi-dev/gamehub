import { Router } from 'express';
import { asyncHandler, currentUser, requireAuth } from '../../middleware/auth.js';
import * as service from './history.service.js';

export const historyRouter = Router();
historyRouter.use(requireAuth);

// Only ever the signed-in user's own rounds: the player id comes from the token, never from the URL.
historyRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await service.getHistory(currentUser(req), service.historyQuery.parse(req.query)));
  }),
);
historyRouter.get(
  '/stats',
  asyncHandler(async (req, res) => {
    res.json(await service.getStats(currentUser(req)));
  }),
);
