import { randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import {
  ALLOWED_CHIPS,
  GLOBAL_ROOM_CHIPS,
  GLOBAL_ROOM_KEY,
  GLOBAL_ROOM_MAX_PER_TARGET,
  MAX_ACTIVE_ROOMS_PER_USER,
  MAX_PER_TARGET_RANGE,
  ROOM_DELETE_WHEN_EMPTY_MINUTES,
  ROOM_MAX_CAPACITY,
  ROOM_MIN_CAPACITY,
  TIMING_RANGE,
} from '../../config/constants.js';
import { conflict, forbidden, notFound } from '../../errors/AppError.js';
import { getMiniGame, type ProviderRoom } from '../../lib/minigame.js';
import { User, type UserDoc } from '../user/user.model.js';
import { ensureSignupBonus, playerIdOf } from '../wallet/wallet.service.js';
import { Room, type IRoom } from './room.model.js';

const range = (r: { min: number; max: number }) => z.number().int().min(r.min).max(r.max);

export const createRoomSchema = z
  .object({
    name: z.string().trim().min(3, 'Name must be at least 3 characters').max(40),
    visibility: z.enum(['public', 'private']),
    capacity: z.number().int().min(ROOM_MIN_CAPACITY).max(ROOM_MAX_CAPACITY).default(20),
    chips: z
      .array(z.number().int().refine((n) => ALLOWED_CHIPS.includes(n), 'Chip value not allowed'))
      .min(2)
      .max(5)
      .default([1, 5, 10, 25, 100]),
    maxPerTarget: range(MAX_PER_TARGET_RANGE).default(500),
    timing: z
      .object({
        betSeconds: range(TIMING_RANGE.betSeconds).default(20),
        spinSeconds: range(TIMING_RANGE.spinSeconds).default(6),
        resultSeconds: range(TIMING_RANGE.resultSeconds).default(6),
      })
      .default({}),
  })
  .refine((v) => new Set(v.chips).size === v.chips.length, { message: 'Chips must be different', path: ['chips'] });
export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const joinSchema = z.object({ inviteCode: z.string().trim().toUpperCase().max(12).optional() });

// No 0/O/1/I so a code read aloud or from a screenshot is hard to get wrong.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () =>
  Array.from(randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');

export interface RoomView {
  key: string;
  name: string;
  isGlobal: boolean;
  visibility: 'public' | 'private';
  online: number;
  capacity: number | null;
  owner: { id: string; displayName: string } | null;
  isMine: boolean;
  inviteCode?: string; // only the owner sees it
  chips?: number[];
  maxPerTarget?: number;
  timing?: IRoom['timing'];
}

// ---- reading -------------------------------------------------------------

/** Pages through the platform room list (the global room plus every user room). */
async function fetchAllProviderRooms(): Promise<ProviderRoom[]> {
  const all: ProviderRoom[] = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const page = await getMiniGame().listRooms(100, offset);
    all.push(...page.rooms);
    if (all.length >= page.total || page.rooms.length === 0) break;
  }
  return all;
}

/**
 * Lobby: the global room, every public room, and the viewer's own private rooms.
 * Uses 2 platform calls and 2 database queries no matter how many rooms exist
 * (owners are loaded in one batch, never one by one).
 */
export async function listLobby(viewer: UserDoc): Promise<RoomView[]> {
  const provider = await fetchAllProviderRooms();
  const byKey = new Map(provider.map((p) => [p.key, p]));
  const ours = await Room.find({ ready: true }).lean();

  // Rooms the platform deleted (empty for 30 minutes) disappear from our list too.
  const gone = ours.filter((r) => !byKey.has(r.key) && Date.now() - r.createdAt.getTime() > 60_000).map((r) => r._id);
  if (gone.length) await Room.deleteMany({ _id: { $in: gone } });

  const live = ours.filter((r) => byKey.has(r.key));
  const owners = await User.find({ _id: { $in: [...new Set(live.map((r) => String(r.ownerId)))] } }, 'displayName').lean();
  const ownerName = new Map(owners.map((o) => [String(o._id), o.displayName]));

  const main = byKey.get(GLOBAL_ROOM_KEY);
  const views: RoomView[] = [
    {
      key: GLOBAL_ROOM_KEY,
      name: 'Global room',
      isGlobal: true,
      visibility: 'public',
      online: main?.online ?? 0,
      capacity: null,
      owner: null,
      isMine: false,
      chips: GLOBAL_ROOM_CHIPS,
      maxPerTarget: GLOBAL_ROOM_MAX_PER_TARGET,
    },
  ];
  for (const r of live) {
    const mine = String(r.ownerId) === viewer.id;
    if (r.visibility === 'private' && !mine) continue;
    views.push(toView(r, byKey.get(r.key)!, mine, ownerName.get(String(r.ownerId)) ?? 'Unknown'));
  }
  return views.sort((a, b) => Number(b.isGlobal) - Number(a.isGlobal) || b.online - a.online);
}

function toView(
  r: { key: string; name: string; ownerId: unknown; visibility: 'public' | 'private'; inviteCode: string; chips: number[]; maxPerTarget: number; timing: IRoom['timing'] },
  p: ProviderRoom,
  mine: boolean,
  ownerName: string,
): RoomView {
  return {
    key: r.key,
    name: r.name,
    isGlobal: false,
    visibility: r.visibility,
    online: p.online,
    capacity: p.capacity,
    owner: { id: String(r.ownerId), displayName: ownerName },
    isMine: mine,
    inviteCode: mine ? r.inviteCode : undefined,
    chips: r.chips,
    maxPerTarget: r.maxPerTarget,
    timing: r.timing,
  };
}

// ---- creating ------------------------------------------------------------

export async function createRoom(user: UserDoc, input: CreateRoomInput): Promise<RoomView> {
  // Free slots of rooms the platform already deleted before counting.
  await reconcileOwner(user);

  const key = `u${randomBytes(6).toString('hex')}`;
  // Insert first, then count: if two requests race, at most the extras are rolled back.
  const doc = await Room.create({
    key,
    name: input.name,
    ownerId: user._id,
    visibility: input.visibility,
    inviteCode: makeCode(),
    capacity: input.capacity,
    chips: [...input.chips].sort((a, b) => a - b),
    maxPerTarget: input.maxPerTarget,
    timing: input.timing,
    ready: false,
  });
  const count = await Room.countDocuments({ ownerId: user._id });
  if (count > MAX_ACTIVE_ROOMS_PER_USER) {
    await Room.deleteOne({ _id: doc._id });
    throw conflict('room_limit', `You can have ${MAX_ACTIVE_ROOMS_PER_USER} rooms at a time. Delete one or wait until an empty room closes.`);
  }

  let provider: ProviderRoom;
  try {
    provider = await getMiniGame().createRoom({
      key,
      name: input.name,
      capacity: input.capacity,
      auto: false, // never used for automatic placement
      deleteWhenEmptyMinutes: ROOM_DELETE_WHEN_EMPTY_MINUTES,
      metadata: { createdBy: user.id, visibility: input.visibility },
      overrides: { title: input.name, chips: doc.chips, maxPerTarget: input.maxPerTarget, timing: input.timing },
    });
  } catch (e) {
    await Room.deleteOne({ _id: doc._id });
    throw e;
  }
  doc.ready = true;
  await doc.save();
  return toView(doc.toObject(), provider, true, user.displayName);
}

async function reconcileOwner(user: UserDoc) {
  const rooms = await Room.find({ ownerId: user._id });
  await Promise.all(
    rooms.map(async (r) => {
      const stale = !r.ready && Date.now() - r.createdAt.getTime() > 120_000;
      if (stale) return void (await Room.deleteOne({ _id: r._id }));
      if (r.ready && !(await getMiniGame().getRoom(r.key))) await Room.deleteOne({ _id: r._id });
    }),
  );
}

// ---- joining -------------------------------------------------------------

const sameCode = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function resolveRoom(user: UserDoc, key: string, inviteCode?: string) {
  if (key === GLOBAL_ROOM_KEY) return { key: GLOBAL_ROOM_KEY, name: 'Global room' };
  const room = await Room.findOne({ key, ready: true });
  if (!room) throw notFound('room_not_found', 'This room does not exist any more.');
  if (room.visibility === 'private' && room.ownerId.toString() !== user.id) {
    if (!inviteCode || !sameCode(inviteCode, room.inviteCode)) throw forbidden('invalid_invite_code', 'Wrong invite code.');
  }
  return { key: room.key, name: room.name };
}

export async function findKeyByInviteCode(code: string): Promise<string> {
  const room = await Room.findOne({ inviteCode: code.trim().toUpperCase(), ready: true }, 'key').lean();
  // Same answer for "no such code" and "room gone", so codes cannot be probed.
  if (!room) throw notFound('invalid_invite_code', 'No room matches this code.');
  return room.key;
}

/** Creates a short-lived play link for this user in the chosen room. */
export async function joinRoom(user: UserDoc, key: string, inviteCode?: string) {
  const room = await resolveRoom(user, key, inviteCode);
  await ensureSignupBonus(user);
  const session = await getMiniGame().createSession({ playerId: playerIdOf(user), displayName: user.displayName, room: room.key });
  return { playUrl: session.playUrl, expiresIn: session.expiresIn, room };
}

// ---- deleting ------------------------------------------------------------

export async function deleteRoom(user: UserDoc, key: string) {
  const room = await Room.findOne({ key });
  if (!room) throw notFound('room_not_found');
  if (room.ownerId.toString() !== user.id && user.role !== 'admin') throw forbidden('not_room_owner', 'Only the owner can delete this room.');
  await getMiniGame().deleteRoom(key); // 409 room_busy when players are inside
  await Room.deleteOne({ _id: room._id });
}
