import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, currentUser, requireAuth } from '../../middleware/auth.js';
import * as service from './room.service.js';

export const roomRouter = Router();
roomRouter.use(requireAuth);

roomRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ rooms: await service.listLobby(currentUser(req)) });
  }),
);

roomRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = service.createRoomSchema.parse(req.body);
    res.status(201).json({ room: await service.createRoom(currentUser(req), input) });
  }),
);

// Look up a room by invite code (no session is created).
roomRouter.get(
  '/by-code/:code',
  asyncHandler(async (req, res) => {
    const key = await service.findKeyByInviteCode(String(req.params.code).slice(0, 12));
    const room = await service.resolveRoom(currentUser(req), key, String(req.params.code).toUpperCase());
    res.json({ room });
  }),
);

// Join by invite code only (the player does not know the room key).
roomRouter.post(
  '/join-by-code',
  asyncHandler(async (req, res) => {
    const { code } = z.object({ code: z.string().trim().min(4).max(12) }).parse(req.body);
    const key = await service.findKeyByInviteCode(code);
    res.json(await service.joinRoom(currentUser(req), key, code.toUpperCase()));
  }),
);

roomRouter.post(
  '/:key/join',
  asyncHandler(async (req, res) => {
    const { inviteCode } = service.joinSchema.parse(req.body ?? {});
    res.json(await service.joinRoom(currentUser(req), String(req.params.key), inviteCode));
  }),
);

roomRouter.delete(
  '/:key',
  asyncHandler(async (req, res) => {
    await service.deleteRoom(currentUser(req), String(req.params.key));
    res.json({ ok: true });
  }),
);
