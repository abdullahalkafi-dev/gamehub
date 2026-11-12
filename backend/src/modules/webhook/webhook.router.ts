import { createHmac, timingSafeEqual } from 'node:crypto';
import express, { Router } from 'express';
import { env } from '../../config/env.js';
import { WebhookEvent } from './webhookEvent.model.js';

export function verifySignature(secret: string, timestamp: string | undefined, signature: string | undefined, rawBody: Buffer, nowMs = Date.now()) {
  if (!secret || !timestamp || !signature) return false;
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > 300) return false; // replay protection
  const expected = 'v1=' + createHmac('sha256', secret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface Envelope {
  id: string;
  type: string;
  gameId: string | null;
  livemode?: boolean;
  data?: Record<string, unknown>;
}

// This router must be mounted BEFORE express.json(): the signature covers the raw bytes.
export const webhookRouter = Router();
webhookRouter.post('/minigame', express.raw({ type: '*/*', limit: '2mb' }), async (req, res, next) => {
  try {
    if (!env.MINIGAME_WEBHOOK_SECRET) return res.status(503).json({ error: { code: 'webhook_not_configured' } });
    const raw = req.body as Buffer;
    if (!Buffer.isBuffer(raw) || !verifySignature(env.MINIGAME_WEBHOOK_SECRET, req.header('x-minigame-timestamp'), req.header('x-minigame-signature'), raw)) {
      return res.status(400).json({ error: { code: 'bad_signature' } });
    }
    const event = JSON.parse(raw.toString('utf8')) as Envelope;
    // The webhook address is shared by every game on the account: ignore other games.
    if (event.gameId && event.gameId !== env.MINIGAME_GAME_ID) return res.status(200).json({ ok: true, ignored: true });

    const data = event.data ?? {};
    try {
      await WebhookEvent.create({
        eventId: event.id,
        type: event.type,
        gameId: event.gameId ?? null,
        livemode: event.livemode ?? true,
        // Keep a small summary only, never the full player list.
        summary: { room: data.room, round: data.round, playerCount: data.playerCount, result: data.result },
      });
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e; // 11000 = already received, that is fine
    }
    // Round history is read from the platform's rounds API, so nothing else to do here.
    res.status(200).json({ ok: true });
  } catch (e) {
    next(e);
  }
});
