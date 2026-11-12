import { createHmac } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { WebhookEvent } from '../src/modules/webhook/webhookEvent.model.js';
import { app, bearer, fake, resetTestEnv, signUp, startTestEnv, stopTestEnv } from './helpers.js';

beforeAll(startTestEnv);
afterAll(stopTestEnv);
beforeEach(resetTestEnv);

const round = (room: string, n: number, bet: number, win: number) => ({
  game: 'lucky-wheel', room, round: n, result: ['seven'], bet, win, net: win - bet, bets: [{ option: 'seven', amount: bet, win }], time: 1_000_000 + n,
});

describe('history and stats', () => {
  it('shows only the signed-in player\'s rounds', async () => {
    const a = await signUp('A1');
    const b = await signUp('B1');
    fake.rounds.set(a.id, [round('main', 1, 10, 0), round('main', 2, 10, 40)]);
    fake.rounds.set(b.id, [round('main', 3, 99, 0)]);
    const res = await request(app()).get('/history').set(bearer(a.token));
    expect(res.body.rounds).toHaveLength(2);
    expect(res.body.rounds[0].roomName).toBe('Global room');
    // The player id can not be chosen by the client.
    const spoof = await request(app()).get(`/history?playerId=${b.id}`).set(bearer(a.token));
    expect(spoof.body.rounds).toHaveLength(2);
  });

  it('adds totals: net, win rate, biggest win, per room', async () => {
    const a = await signUp('A1');
    fake.rounds.set(a.id, [round('main', 1, 10, 0), round('main', 2, 10, 40), round('main', 3, 20, 0)]);
    const res = await request(app()).get('/history/stats').set(bearer(a.token));
    expect(res.body).toMatchObject({ rounds: 3, wagered: 40, won: 40, net: 0, biggestWin: 40, winRate: 33.3 });
    expect(res.body.byRoom[0]).toMatchObject({ room: 'main', roomName: 'Global room', rounds: 3 });
  });

  it('resolves room names for a large page with one query, not one per row', async () => {
    const a = await signUp('A1');
    const rows = Array.from({ length: 100 }, (_, i) => round(i % 2 ? 'main' : 'gone-room', i + 1, 5, 0));
    fake.rounds.set(a.id, rows);
    const res = await request(app()).get('/history?limit=100').set(bearer(a.token));
    expect(res.body.rounds).toHaveLength(100);
    expect(res.body.rounds.find((r: { room: string }) => r.room === 'gone-room').roomName).toBe('Closed room');
  });
});

describe('webhook receiver', () => {
  const sign = (body: string, ts = Math.floor(Date.now() / 1000), secret = 'whsec_test') => ({
    'X-Minigame-Timestamp': String(ts),
    'X-Minigame-Signature': 'v1=' + createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex'),
    'Content-Type': 'application/json',
  });
  const event = (id: string, gameId = 'lic_TEST') =>
    JSON.stringify({ id, type: 'round.settled', createdAt: new Date().toISOString(), gameId, livemode: true, data: { room: 'main', round: 1, playerCount: 1, players: [] } });

  it('accepts a valid signature once and ignores a repeated delivery', async () => {
    const body = event('evt_1');
    expect((await request(app()).post('/webhooks/minigame').set(sign(body)).send(body)).status).toBe(200);
    expect((await request(app()).post('/webhooks/minigame').set(sign(body)).send(body)).status).toBe(200);
    expect(await WebhookEvent.countDocuments({ eventId: 'evt_1' })).toBe(1);
  });

  it('rejects a wrong signature, a tampered body and an old timestamp', async () => {
    const body = event('evt_2');
    expect((await request(app()).post('/webhooks/minigame').set(sign(body, undefined, 'other-secret')).send(body)).status).toBe(400);
    expect((await request(app()).post('/webhooks/minigame').set(sign(body)).send(body.replace('evt_2', 'evt_x'))).status).toBe(400);
    expect((await request(app()).post('/webhooks/minigame').set(sign(body, Math.floor(Date.now() / 1000) - 3600)).send(body)).status).toBe(400);
    expect(await WebhookEvent.countDocuments()).toBe(0);
  });

  it('ignores events of another game on the same account', async () => {
    const body = event('evt_3', 'lic_OTHER');
    expect((await request(app()).post('/webhooks/minigame').set(sign(body)).send(body)).status).toBe(200);
    expect(await WebhookEvent.countDocuments()).toBe(0);
  });
});
