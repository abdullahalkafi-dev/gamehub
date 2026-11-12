import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setMiniGame, type MiniGameClient, type ProviderRound, type ProviderRoom, type RoomInput } from '../src/lib/minigame.js';
import { AppError } from '../src/errors/AppError.js';

/** In-memory stand-in for MiniGame Studio. Behaves like the documented API. */
export class FakeMiniGame implements MiniGameClient {
  wallets = new Map<string, number>();
  refs = new Map<string, { balance: number }>();
  creditCalls = 0;
  rooms = new Map<string, ProviderRoom>();
  rounds = new Map<string, ProviderRound[]>();
  sessions: { playerId: string; room: string }[] = [];
  down = false;

  constructor() {
    this.rooms.set('main', this.mk('main', 'Main room'));
  }
  private mk(key: string, name: string, extra: Partial<ProviderRoom> = {}): ProviderRoom {
    return { key, name, capacity: null, auto: true, overrides: {}, metadata: {}, deleteWhenEmptyMinutes: null, online: 0, createdAt: Date.now(), ...extra };
  }
  private check() {
    if (this.down) throw new AppError(502, 'game_service_unreachable');
  }
  async createSession(i: { playerId: string; displayName: string; room: string }) {
    this.check();
    if (!this.rooms.has(i.room)) throw new AppError(404, 'room_not_found');
    this.sessions.push({ playerId: i.playerId, room: i.room });
    return { playUrl: `https://play.test/${i.room}/${i.playerId}`, expiresIn: 900, room: i.room };
  }
  async getPlayer(id: string) {
    this.check();
    return this.wallets.has(id) ? { balance: this.wallets.get(id)! } : null;
  }
  async credit(id: string, amount: number, reference: string) {
    this.check();
    this.creditCalls++;
    const prev = this.refs.get(`${id}|${reference}`);
    if (prev) return { balance: prev.balance, duplicate: true };
    const balance = (this.wallets.get(id) ?? 0) + amount;
    this.wallets.set(id, balance);
    this.refs.set(`${id}|${reference}`, { balance });
    return { balance, duplicate: false };
  }
  async listRooms(limit: number, offset: number) {
    this.check();
    const all = [...this.rooms.values()];
    return { rooms: all.slice(offset, offset + limit), total: all.length };
  }
  async getRoom(key: string) {
    this.check();
    return this.rooms.get(key) ?? null;
  }
  async createRoom(input: RoomInput) {
    this.check();
    const r = this.mk(input.key!, input.name!, { capacity: input.capacity ?? null, auto: false, metadata: input.metadata ?? {}, overrides: input.overrides ?? {} });
    this.rooms.set(r.key, r);
    return r;
  }
  async updateRoom(key: string, input: RoomInput) {
    const r = this.rooms.get(key)!;
    Object.assign(r, { name: input.name ?? r.name, overrides: input.overrides ?? r.overrides });
    return r;
  }
  async deleteRoom(key: string) {
    this.check();
    const r = this.rooms.get(key);
    if (r && r.online > 0) throw new AppError(409, 'room_busy');
    this.rooms.delete(key);
  }
  async listRounds(id: string, q: { limit: number; before?: number; room?: string }) {
    this.check();
    let rows = (this.rounds.get(id) ?? []).filter((r) => (!q.room || r.room === q.room) && (!q.before || r.time < q.before));
    rows = rows.sort((a, b) => b.time - a.time);
    const page = rows.slice(0, q.limit);
    return { rounds: page, nextBefore: rows.length > q.limit ? page[page.length - 1]!.time : null };
  }
  async leaderboard(q: { playerId?: string }) {
    this.check();
    return { entries: [{ rank: 1, playerId: q.playerId ?? 'x', displayName: 'Ace', value: 10, won: 10, wagered: 5, biggestWin: 10, rounds: 1 }], me: null, updatedAt: Date.now() };
  }
}

let mongod: MongoMemoryServer;
export let fake: FakeMiniGame;
export const app = () => createApp();

export async function startTestEnv() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('gamehub_test'));
}
export async function resetTestEnv() {
  fake = new FakeMiniGame();
  setMiniGame(fake);
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
  await mongoose.syncIndexes();
}
export async function stopTestEnv() {
  await mongoose.disconnect();
  await mongod.stop();
}

let n = 0;
/** Registers a user and returns a bearer token plus ids. */
export async function signUp(name = 'Player') {
  n += 1;
  const email = `user${n}@example.com`;
  const res = await request(app()).post('/auth/register').set('X-Client', 'mobile').send({ email, password: 'password123', displayName: name });
  return { email, token: res.body.token as string, id: res.body.user.id as string, res };
}
export const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
