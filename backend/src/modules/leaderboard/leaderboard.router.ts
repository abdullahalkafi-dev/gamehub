import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, currentUser, requireAuth } from '../../middleware/auth.js';
import { getMiniGame } from '../../lib/minigame.js';
import { playerIdOf } from '../wallet/wallet.service.js';

const query = z.object({
  room: z.string().max(40).optional(),
  period: z.enum(['day', 'week', 'month', 'all']).default('week'),
  metric: z.enum(['winnings', 'net', 'wagered', 'biggest_win']).default('winnings'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const leaderboardRouter = Router();
leaderboardRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const q = query.parse(req.query);
    const board = await getMiniGame().leaderboard({ ...q, playerId: playerIdOf(user) });
    // Player ids are internal: only expose a name, a score and "this is you".
    const me = playerIdOf(user);
    res.json({
      period: q.period,
      metric: q.metric,
      updatedAt: board.updatedAt,
      entries: board.entries.map((e) => ({
        rank: e.rank,
        displayName: e.displayName ?? 'Player',
        value: e.value,
        rounds: e.rounds,
        biggestWin: e.biggestWin,
        isMe: e.playerId === me,
      })),
      me: board.me ? { rank: board.me.rank, value: board.me.value, rounds: board.me.rounds } : null,
    });
  }),
);
