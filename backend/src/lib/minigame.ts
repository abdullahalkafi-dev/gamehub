import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

// Thin typed client for MiniGame Studio. The API key never leaves the server.
export interface ProviderRoom {
  key: string;
  name: string;
  capacity: number | null;
  auto: boolean;
  overrides: Record<string, unknown>;
  metadata: Record<string, string>;
  deleteWhenEmptyMinutes: number | null;
  online: number;
  createdAt: number;
}
export interface RoomInput {
  key?: string;
  name?: string;
  capacity?: number | null;
  auto?: boolean;
  metadata?: Record<string, string>;
  deleteWhenEmptyMinutes?: number | null;
  overrides?: {
    title?: string;
    chips?: number[];
    maxPerTarget?: number;
    timing?: { betSeconds?: number; spinSeconds?: number; resultSeconds?: number };
  };
}
export interface ProviderRound {
  game: string;
  room: string;
  round: number | null;
  result: string[];
  bet: number;
  win: number;
  net: number;
  bets: { option: string; label?: string; amount: number; win: number }[] | null;
  time: number;
}
export interface LeaderboardEntry {
  rank: number;
  playerId: string | null;
  displayName: string | null;
  value: number;
  won: number;
  wagered: number;
  biggestWin: number;
  rounds: number;
}

export interface MiniGameClient {
  createSession(i: { playerId: string; displayName: string; room: string }): Promise<{ playUrl: string; expiresIn: number; room?: string }>;
  getPlayer(playerId: string): Promise<{ balance: number } | null>;
  credit(playerId: string, amount: number, reference: string, note?: string, displayName?: string): Promise<{ balance: number; duplicate: boolean }>;
  listRooms(limit: number, offset: number): Promise<{ rooms: ProviderRoom[]; total: number }>;
  getRoom(key: string): Promise<ProviderRoom | null>;
  createRoom(input: RoomInput): Promise<ProviderRoom>;
  updateRoom(key: string, input: RoomInput): Promise<ProviderRoom>;
  deleteRoom(key: string): Promise<void>;
  listRounds(playerId: string, q: { limit: number; before?: number; room?: string }): Promise<{ rounds: ProviderRound[]; nextBefore: number | null }>;
  leaderboard(q: { room?: string; period: string; metric: string; limit: number; playerId?: string }): Promise<{ entries: LeaderboardEntry[]; me: LeaderboardEntry | null; updatedAt: number }>;
}

// Provider error codes we translate into a friendly HTTP status.
const STATUS_MAP: Record<string, number> = {
  room_full: 409,
  no_room_available: 409,
  room_busy: 409,
  room_exists: 409,
  too_many_rooms: 409,
  insufficient_balance: 402,
};

class HttpMiniGame implements MiniGameClient {
  private base = env.MINIGAME_BASE_URL.replace(/\/$/, '');
  private game = env.MINIGAME_GAME_ID;

  private async call<T>(method: string, path: string, body?: unknown, opts: { allow404?: boolean } = {}): Promise<T | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response;
      try {
        res = await fetch(this.base + path, {
          method,
          headers: { Authorization: `Bearer ${env.MINIGAME_API_KEY}`, 'Content-Type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        throw new AppError(502, 'game_service_unreachable', 'The game service is not reachable right now.');
      }
      if (res.status === 429 && attempt === 0) {
        const wait = Math.min(Number(res.headers.get('retry-after') ?? 1), 5);
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (res.ok) return json as T;
      if (res.status === 404 && opts.allow404) return null;
      const code = String(json.code ?? 'upstream_error');
      const mapped = STATUS_MAP[code];
      if (mapped) throw new AppError(mapped, code, String(json.error ?? code));
      // Anything else (bad key, wrong environment...) is our fault, not the user's.
      console.error('[minigame]', method, path.split('?')[0], res.status, code);
      throw new AppError(502, 'game_service_error', 'The game service rejected the request.');
    }
    throw new AppError(429, 'rate_limited', 'Too many requests, try again in a moment.');
  }

  private g = (p: string) => `/api/v1/games/${this.game}${p}`;

  async createSession(i: { playerId: string; displayName: string; room: string }) {
    const r = await this.call<{ playUrl: string; expiresIn: number; room?: string }>('POST', '/api/v1/sessions', { gameId: this.game, ...i });
    return r!;
  }
  async getPlayer(playerId: string) {
    return this.call<{ balance: number }>('GET', this.g(`/players/${encodeURIComponent(playerId)}`), undefined, { allow404: true });
  }
  async credit(playerId: string, amount: number, reference: string, note?: string, displayName?: string) {
    const r = await this.call<{ balance: number; duplicate: boolean }>('POST', this.g(`/players/${encodeURIComponent(playerId)}/credit`), { amount, reference, note, displayName });
    return r!;
  }
  async listRooms(limit: number, offset: number) {
    const r = await this.call<{ rooms: ProviderRoom[]; total: number }>('GET', this.g(`/rooms?limit=${limit}&offset=${offset}`));
    return r!;
  }
  getRoom(key: string) {
    return this.call<ProviderRoom>('GET', this.g(`/rooms/${encodeURIComponent(key)}`), undefined, { allow404: true });
  }
  async createRoom(input: RoomInput) {
    return (await this.call<ProviderRoom>('POST', this.g('/rooms'), input))!;
  }
  async updateRoom(key: string, input: RoomInput) {
    return (await this.call<ProviderRoom>('PUT', this.g(`/rooms/${encodeURIComponent(key)}`), input))!;
  }
  async deleteRoom(key: string) {
    await this.call('DELETE', this.g(`/rooms/${encodeURIComponent(key)}`), undefined, { allow404: true });
  }
  async listRounds(playerId: string, q: { limit: number; before?: number; room?: string }) {
    const p = new URLSearchParams({ limit: String(q.limit) });
    if (q.before) p.set('before', String(q.before));
    if (q.room) p.set('room', q.room);
    const r = await this.call<{ rounds: ProviderRound[]; nextBefore: number | null }>('GET', this.g(`/players/${encodeURIComponent(playerId)}/rounds?${p}`), undefined, { allow404: true });
    return r ?? { rounds: [], nextBefore: null };
  }
  async leaderboard(q: { room?: string; period: string; metric: string; limit: number; playerId?: string }) {
    const p = new URLSearchParams({ period: q.period, metric: q.metric, limit: String(q.limit) });
    if (q.room) p.set('room', q.room);
    if (q.playerId) p.set('playerId', q.playerId);
    const r = await this.call<{ entries: LeaderboardEntry[]; me: LeaderboardEntry | null; updatedAt: number }>('GET', this.g(`/leaderboard?${p}`));
    return r!;
  }
}

let client: MiniGameClient | null = null;
export function getMiniGame(): MiniGameClient {
  return (client ??= new HttpMiniGame());
}
/** Tests replace the real client with a fake one. */
export function setMiniGame(c: MiniGameClient | null) {
  client = c;
}
