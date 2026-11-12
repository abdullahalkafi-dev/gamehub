import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app, bearer, fake, resetTestEnv, signUp, startTestEnv, stopTestEnv } from './helpers.js';

beforeAll(startTestEnv);
afterAll(stopTestEnv);
beforeEach(resetTestEnv);

describe('auth and signup bonus', () => {
  it('registers, grants 100 coins once and returns the balance', async () => {
    const u = await signUp('Ana');
    expect(u.res.status).toBe(201);
    expect(u.res.body.user.passwordHash).toBeUndefined();
    const me = await request(app()).get('/auth/me').set(bearer(u.token));
    expect(me.body.balance).toBe(100);
    // Reading the balance again must not pay again.
    await request(app()).get('/auth/me').set(bearer(u.token));
    expect(fake.wallets.get(u.id)).toBe(100);
  });

  it('rejects a duplicate email and a weak password', async () => {
    const u = await signUp();
    const dup = await request(app()).post('/auth/register').send({ email: u.email, password: 'password123', displayName: 'X1' });
    expect(dup.status).toBe(409);
    const weak = await request(app()).post('/auth/register').send({ email: 'a@b.co', password: '123', displayName: 'Zed' });
    expect(weak.status).toBe(400);
  });

  it('logs in, and gives the same error for a wrong password and an unknown email', async () => {
    const u = await signUp();
    const ok = await request(app()).post('/auth/login').send({ email: u.email, password: 'password123' });
    expect(ok.status).toBe(200);
    expect(ok.headers['set-cookie']?.[0]).toMatch(/HttpOnly/i);
    const bad = await request(app()).post('/auth/login').send({ email: u.email, password: 'wrong-password' });
    const none = await request(app()).post('/auth/login').send({ email: 'nobody@example.com', password: 'wrong-password' });
    expect(bad.status).toBe(401);
    expect(none.body).toEqual(bad.body);
  });

  it('still creates the account when the game service is down, and pays the bonus later', async () => {
    fake.down = true;
    const u = await signUp('Late');
    expect(u.res.status).toBe(201);
    fake.down = false;
    const me = await request(app()).get('/auth/me').set(bearer(u.token));
    expect(me.body.balance).toBe(100);
  });

  it('blocks signed-out visitors and cookie requests without the CSRF header', async () => {
    expect((await request(app()).get('/rooms')).status).toBe(401);
    expect((await request(app()).get('/history')).status).toBe(401);
    const login = await signUp();
    const cookie = (await request(app()).post('/auth/login').send({ email: login.email, password: 'password123' })).headers['set-cookie']!;
    const noHeader = await request(app()).post('/shop/purchase').set('Cookie', cookie).send({ packageId: 'starter', clientKey: 'abcdefgh1' });
    expect(noHeader.status).toBe(403);
    const withHeader = await request(app()).post('/shop/purchase').set('Cookie', cookie).set('X-Requested-With', 'gamehub').send({ packageId: 'starter', clientKey: 'abcdefgh1' });
    expect(withHeader.status).toBe(201);
  });

  it('only admins reach /admin', async () => {
    const u = await signUp();
    expect((await request(app()).get('/admin/overview').set(bearer(u.token))).status).toBe(403);
  });
});
