import mongoose from 'mongoose';
import { createApp } from './app.js';
import { GLOBAL_ROOM_CHIPS, GLOBAL_ROOM_KEY, GLOBAL_ROOM_MAX_PER_TARGET } from './config/constants.js';
import { env } from './config/env.js';
import { getMiniGame } from './lib/minigame.js';
import { seedAdmin } from './modules/auth/auth.service.js';

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  await seedAdmin(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);

  // Make sure the global room exists and uses small chips that fit a 100-coin start.
  try {
    const game = getMiniGame();
    await game.listRooms(1, 0); // creates "main" on first call
    await game.updateRoom(GLOBAL_ROOM_KEY, { name: 'Global room', overrides: { chips: GLOBAL_ROOM_CHIPS, maxPerTarget: GLOBAL_ROOM_MAX_PER_TARGET } });
  } catch (e) {
    console.error('[startup] could not configure the global room:', (e as Error).message);
  }

  const server = createApp().listen(env.PORT, () => console.log(`API listening on :${env.PORT}`));
  const stop = () => server.close(() => void mongoose.disconnect().then(() => process.exit(0)));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

main().catch((e) => {
  console.error('Fatal:', (e as Error).message);
  process.exit(1);
});
