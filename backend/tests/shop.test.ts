import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app, bearer, fake, resetTestEnv, signUp, startTestEnv, stopTestEnv } from './helpers.js';

beforeAll(startTestEnv);
afterAll(stopTestEnv);
beforeEach(resetTestEnv);

const buy = (token: string, packageId: string, clientKey: string) =>
  request(app()).post('/shop/purchase').set(bearer(token)).send({ packageId, clientKey });

describe('fake coin shop', () => {
  it('lists five packages', async () => {
    const res = await request(app()).get('/shop/packages');
    expect(res.body.packages).toHaveLength(5);
  });

  it('credits the coins immediately', async () => {
    const u = await signUp();
    const res = await buy(u.token, 'popular', 'key-00000001');
    expect(res.status).toBe(201);
    expect(res.body.balance).toBe(100 + 1650);
  });

  it('a retry with the same key never pays twice', async () => {
    const u = await signUp();
    await buy(u.token, 'starter', 'key-00000002');
    await buy(u.token, 'starter', 'key-00000002');
    expect(fake.wallets.get(u.id)).toBe(600);
  });

  it('ten simultaneous presses with one key credit exactly once', async () => {
    const u = await signUp();
    const results = await Promise.all(Array.from({ length: 10 }, () => buy(u.token, 'value', 'key-00000003')));
    expect(results.every((r) => r.status === 201)).toBe(true);
    expect(fake.wallets.get(u.id)).toBe(100 + 6000);
    const list = await request(app()).get('/shop/purchases').set(bearer(u.token));
    expect(list.body.purchases).toHaveLength(1);
  });

  it('refuses unknown packages and a key reused for another package', async () => {
    const u = await signUp();
    expect((await buy(u.token, 'nope', 'key-00000004')).status).toBe(404);
    await buy(u.token, 'starter', 'key-00000005');
    expect((await buy(u.token, 'pro', 'key-00000005')).status).toBe(409);
  });

  it('purchase lists are private to each user', async () => {
    const a = await signUp('A1');
    const b = await signUp('B1');
    await buy(a.token, 'starter', 'key-00000006');
    const list = await request(app()).get('/shop/purchases').set(bearer(b.token));
    expect(list.body.purchases).toHaveLength(0);
  });
});
