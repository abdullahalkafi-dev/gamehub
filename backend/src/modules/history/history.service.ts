import { z } from 'zod';
import { GLOBAL_ROOM_KEY } from '../../config/constants.js';
import { getMiniGame, type ProviderRound } from '../../lib/minigame.js';
import { Room } from '../room/room.model.js';
import type { UserDoc } from '../user/user.model.js';
import { ensureSignupBonus, playerIdOf } from '../wallet/wallet.service.js';

export const historyQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  before: z.coerce.number().int().positive().optional(),
  room: z.string().max(40).optional(),
});

/** One batch query gives a name for every room in the page (no query per row). */
async function roomNames(keys: string[]) {
  const unique = [...new Set(keys)].filter((k) => k !== GLOBAL_ROOM_KEY);
  const rooms = unique.length ? await Room.find({ key: { $in: unique } }, 'key name').lean() : [];
  const names = new Map(rooms.map((r) => [r.key, r.name]));
  names.set(GLOBAL_ROOM_KEY, 'Global room');
  return (key: string) => names.get(key) ?? 'Closed room';
}

export async function getHistory(user: UserDoc, q: z.infer<typeof historyQuery>) {
  await ensureSignupBonus(user);
  const page = await getMiniGame().listRounds(playerIdOf(user), { limit: q.limit, before: q.before, room: q.room });
  const nameOf = await roomNames(page.rounds.map((r) => r.room));
  return {
    rounds: page.rounds.map((r) => ({ ...r, roomName: nameOf(r.room) })),
    nextBefore: page.nextBefore,
  };
}

interface Totals {
  rounds: number;
  wagered: number;
  won: number;
  net: number;
}
const empty = (): Totals => ({ rounds: 0, wagered: 0, won: 0, net: 0 });
const add = (t: Totals, r: ProviderRound) => {
  t.rounds += 1;
  t.wagered += r.bet;
  t.won += r.win;
  t.net += r.net;
};

// Stats read at most the latest 1000 rounds. Cached briefly so repeated opens stay cheap.
const MAX_PAGES = 10;
const cache = new Map<string, { at: number; value: unknown }>();

export async function getStats(user: UserDoc) {
  const hit = cache.get(user.id);
  if (hit && Date.now() - hit.at < 15_000) return hit.value;

  const rounds: ProviderRound[] = [];
  let before: number | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await getMiniGame().listRounds(playerIdOf(user), { limit: 100, before });
    rounds.push(...page.rounds);
    if (!page.nextBefore) break;
    before = page.nextBefore;
  }

  const total = empty();
  const perRoom = new Map<string, Totals>();
  let wins = 0;
  let biggestWin = 0;
  for (const r of rounds) {
    add(total, r);
    if (r.net > 0) wins += 1;
    biggestWin = Math.max(biggestWin, r.win);
    const t = perRoom.get(r.room) ?? empty();
    add(t, r);
    perRoom.set(r.room, t);
  }
  const nameOf = await roomNames([...perRoom.keys()]);
  const value = {
    ...total,
    winRate: total.rounds ? Math.round((wins / total.rounds) * 1000) / 10 : 0,
    biggestWin,
    truncated: rounds.length >= MAX_PAGES * 100,
    byRoom: [...perRoom.entries()]
      .map(([room, t]) => ({ room, roomName: nameOf(room), ...t }))
      .sort((a, b) => b.rounds - a.rounds),
  };
  cache.set(user.id, { at: Date.now(), value });
  return value;
}
