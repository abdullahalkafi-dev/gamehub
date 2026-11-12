import { Schema, model } from 'mongoose';

// Log of webhook deliveries. The unique eventId makes repeated deliveries harmless.
export interface IWebhookEvent {
  eventId: string;
  type: string;
  gameId: string | null;
  livemode: boolean;
  summary: Record<string, unknown>;
  receivedAt: Date;
}

const schema = new Schema<IWebhookEvent>({
  eventId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  gameId: { type: String, default: null },
  livemode: { type: Boolean, default: true },
  summary: { type: Schema.Types.Mixed, default: {} },
  receivedAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
});

export const WebhookEvent = model<IWebhookEvent>('WebhookEvent', schema);
