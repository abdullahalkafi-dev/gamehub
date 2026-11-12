import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, requireAdmin, requireAuth } from '../../middleware/auth.js';
import { Room } from '../room/room.model.js';
import { Purchase } from '../shop/purchase.model.js';
import { User } from '../user/user.model.js';
import { WebhookEvent } from '../webhook/webhookEvent.model.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const [users, rooms, purchases, coins, events] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments({ ready: true }),
      Purchase.countDocuments({ status: 'completed' }),
      Purchase.aggregate<{ _id: null; coins: number }>([{ $match: { status: 'completed' } }, { $group: { _id: null, coins: { $sum: '$coins' } } }]),
      WebhookEvent.find().sort({ receivedAt: -1 }).limit(15).lean(),
    ]);
    res.json({
      users,
      rooms,
      purchases,
      coinsSold: coins[0]?.coins ?? 0,
      recentWebhooks: events.map((e) => ({ id: e.eventId, type: e.type, livemode: e.livemode, summary: e.summary, receivedAt: e.receivedAt })),
    });
  }),
);

const pageQuery = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25) });

adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { page, limit } = pageQuery.parse(req.query);
    const [rows, total] = await Promise.all([
      User.find({}, 'email displayName role createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(),
    ]);
    res.json({
      total,
      page,
      users: rows.map((u) => ({ id: String(u._id), email: u.email, displayName: u.displayName, role: u.role, createdAt: u.createdAt })),
    });
  }),
);

adminRouter.get(
  '/rooms',
  asyncHandler(async (_req, res) => {
    const rooms = await Room.find({ ready: true }).sort({ createdAt: -1 }).limit(100).lean();
    const owners = await User.find({ _id: { $in: rooms.map((r) => r.ownerId) } }, 'displayName email').lean();
    const byId = new Map(owners.map((o) => [String(o._id), o]));
    res.json({
      rooms: rooms.map((r) => ({
        key: r.key,
        name: r.name,
        visibility: r.visibility,
        capacity: r.capacity,
        createdAt: r.createdAt,
        owner: byId.get(String(r.ownerId))?.displayName ?? 'Deleted user',
      })),
    });
  }),
);
