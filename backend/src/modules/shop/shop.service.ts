import { z } from 'zod';
import { COIN_PACKAGES } from '../../config/constants.js';
import { conflict, notFound } from '../../errors/AppError.js';
import { getMiniGame } from '../../lib/minigame.js';
import { playerIdOf } from '../wallet/wallet.service.js';
import type { UserDoc } from '../user/user.model.js';
import { Purchase } from './purchase.model.js';

export const purchaseSchema = z.object({
  packageId: z.string().min(1).max(32),
  // Created by the client for every press of "Buy"; keeps retries and double-taps safe.
  clientKey: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, 'Invalid purchase key'),
});

/**
 * Fake purchase: nobody is charged, the coins are credited immediately.
 * Safe against double submission:
 *  - (user, clientKey) is unique, so a repeat finds the same Purchase row;
 *  - the game wallet reference is derived from that row, so the platform
 *    answers a repeated credit with duplicate=true and moves nothing.
 */
export async function purchase(user: UserDoc, input: z.infer<typeof purchaseSchema>) {
  const pack = COIN_PACKAGES.find((p) => p.id === input.packageId);
  if (!pack) throw notFound('package_not_found', 'This coin package does not exist.');

  const row = await Purchase.findOneAndUpdate(
    { userId: user._id, clientKey: input.clientKey },
    { $setOnInsert: { packageId: pack.id, coins: pack.coins, priceCents: pack.priceCents, status: 'pending' } },
    { upsert: true, new: true },
  );
  if (row.packageId !== pack.id) throw conflict('purchase_key_reused', 'This purchase key was used for another package.');

  if (row.status !== 'completed') {
    const res = await getMiniGame().credit(
      playerIdOf(user),
      row.coins,
      `buy:${row.id}`,
      `Demo purchase: ${pack.name}`,
      user.displayName,
    );
    await Purchase.updateOne({ _id: row._id }, { status: 'completed', balanceAfter: res.balance });
    row.status = 'completed';
    row.balanceAfter = res.balance;
  }
  return { id: row.id as string, packageId: pack.id, coins: row.coins, status: row.status, balance: row.balanceAfter ?? null, createdAt: row.createdAt };
}

export async function listPurchases(user: UserDoc, limit = 30) {
  const rows = await Purchase.find({ userId: user._id, status: 'completed' }).sort({ createdAt: -1 }).limit(limit).lean();
  return rows.map((r) => ({
    id: String(r._id),
    packageId: r.packageId,
    packageName: COIN_PACKAGES.find((p) => p.id === r.packageId)?.name ?? r.packageId,
    coins: r.coins,
    priceCents: r.priceCents,
    createdAt: r.createdAt,
  }));
}
