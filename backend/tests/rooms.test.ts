import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app, bearer, fake, resetTestEnv, signUp, startTestEnv, stopTestEnv } from './helpers.js';

beforeAll(startTestEnv);
afterAll(stopTestEnv);
beforeEach(resetTestEnv);

const create = (token: string, body: Record<string, unknown> = {}) =>
  request(app()).post('/rooms').set(bearer(token)).send({ name: 'Friends table', visibility: 'public', ...body });

describe('rooms', () => {
  it('shows the global room first and can be joined by anyone', async () => {
    const u = await signUp();
    const lobby = await request(app()).get('/rooms').set(bearer(u.token));
    expect(lobby.body.rooms[0]).toMatchObject({ key: 'main', isGlobal: true });
    const join = await request(app()).post('/rooms/main/join').set(bearer(u.token)).send({});
    expect(join.status).toBe(200);
    expect(join.body.playUrl).toContain('/main/');
    expect(fake.sessions[0]).toMatchObject({ playerId: u.id, room: 'main' });
  });

  it('creates a public room that others can see and join', async () => {
    const owner = await signUp('Owner');
    const other = await signUp('Other');
    const made = await create(owner.token);
    expect(made.status).toBe(201);
    const lobby = await request(app()).get('/rooms').set(bearer(other.token));
    expect(lobby.body.rooms.map((r: { key: string }) => r.key)).toContain(made.body.room.key);
    expect(lobby.body.rooms.find((r: { key: string }) => r.key === made.body.room.key).inviteCode).toBeUndefined();
    const join = await request(app()).post(`/rooms/${made.body.room.key}/join`).set(bearer(other.token)).send({});
    expect(join.status).toBe(200);
  });

  it('private rooms are hidden and need the invite code', async () => {
    const owner = await signUp('Owner');
    const other = await signUp('Other');
    const made = await create(owner.token, { visibility: 'private' });
    const key = made.body.room.key as string;
    const code = made.body.room.inviteCode as string;
    expect(code).toHaveLength(6);

    const lobby = await request(app()).get('/rooms').set(bearer(other.token));
    expect(lobby.body.rooms.map((r: { key: string }) => r.key)).not.toContain(key);
    const mine = await request(app()).get('/rooms').set(bearer(owner.token));
    expect(mine.body.rooms.find((r: { key: string }) => r.key === key).inviteCode).toBe(code);

    expect((await request(app()).post(`/rooms/${key}/join`).set(bearer(other.token)).send({})).status).toBe(403);
    expect((await request(app()).post(`/rooms/${key}/join`).set(bearer(other.token)).send({ inviteCode: 'WRONG1' })).status).toBe(403);
    expect((await request(app()).post(`/rooms/${key}/join`).set(bearer(other.token)).send({ inviteCode: code })).status).toBe(200);
    const byCode = await request(app()).post('/rooms/join-by-code').set(bearer(other.token)).send({ code: code.toLowerCase() });
    expect(byCode.status).toBe(200);
    expect((await request(app()).post('/rooms/join-by-code').set(bearer(other.token)).send({ code: 'ZZZZZZ' })).status).toBe(404);
  });

  it('allows 3 rooms per user, not 4, and even under simultaneous requests', async () => {
    const u = await signUp();
    for (let i = 0; i < 3; i++) expect((await create(u.token, { name: `Room ${i + 1}` })).status).toBe(201);
    expect((await create(u.token, { name: 'Room 4' })).status).toBe(409);

    const v = await signUp('Racer');
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => create(v.token, { name: `Race ${i}` })));
    expect(results.filter((r) => r.status === 201).length).toBeLessThanOrEqual(3);
    expect(fake.rooms.size).toBeLessThanOrEqual(1 + 3 + 3);
  });

  it('frees the slot when the platform deletes an empty room', async () => {
    const u = await signUp();
    const rooms = [];
    for (let i = 0; i < 3; i++) rooms.push((await create(u.token, { name: `Room ${i + 1}` })).body.room.key);
    fake.rooms.delete(rooms[0]);
    expect((await create(u.token, { name: 'Room 4' })).status).toBe(201);
  });

  it('validates room settings', async () => {
    const u = await signUp();
    expect((await create(u.token, { name: 'ab' })).status).toBe(400);
    expect((await create(u.token, { capacity: 500 })).status).toBe(400);
    expect((await create(u.token, { chips: [7, 9] })).status).toBe(400);
    expect((await create(u.token, { maxPerTarget: 99999 })).status).toBe(400);
    expect((await create(u.token, { timing: { betSeconds: 2 } })).status).toBe(400);
  });

  it('only the owner (or an admin) can delete a room', async () => {
    const owner = await signUp('Owner');
    const other = await signUp('Other');
    const key = (await create(owner.token)).body.room.key as string;
    expect((await request(app()).delete(`/rooms/${key}`).set(bearer(other.token))).status).toBe(403);
    expect((await request(app()).delete(`/rooms/${key}`).set(bearer(owner.token))).status).toBe(200);
  });

  it('lobby with many rooms uses a fixed number of platform calls (no N+1)', async () => {
    const viewer = await signUp('Viewer');
    for (let i = 0; i < 4; i++) {
      const o = await signUp(`Own${i}`);
      await create(o.token, { name: `Table ${i}` });
    }
    let calls = 0;
    const orig = fake.listRooms.bind(fake);
    fake.listRooms = async (l, o) => (calls++, orig(l, o));
    const getRoom = fake.getRoom.bind(fake);
    let single = 0;
    fake.getRoom = async (k) => (single++, getRoom(k));
    const res = await request(app()).get('/rooms').set(bearer(viewer.token));
    expect(res.body.rooms).toHaveLength(5);
    expect(calls).toBe(1);
    expect(single).toBe(0);
  });
});
