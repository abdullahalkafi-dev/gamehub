import { SIGNUP_BONUS } from '../../config/constants.js';
import { getMiniGame } from '../../lib/minigame.js';
import { User, type UserDoc } from '../user/user.model.js';

/** The game wallet is keyed by our user id, which only our server can send. */
export const playerIdOf = (user: UserDoc) => user.id as string;

/**
 * Gives the 100-coin welcome bonus exactly once. The reference is fixed per user,
 * so calling this twice (or from two requests at once) never pays twice.
 */
export async function ensureSignupBonus(user: UserDoc): Promise<void> {
  if (user.bonusGranted) return;
  await getMiniGame().credit(playerIdOf(user), SIGNUP_BONUS, `signup:${user.id}`, 'Welcome bonus', user.displayName);
  await User.updateOne({ _id: user._id }, { bonusGranted: true });
  user.bonusGranted = true;
}

export async function getBalance(user: UserDoc): Promise<number> {
  await ensureSignupBonus(user);
  const player = await getMiniGame().getPlayer(playerIdOf(user));
  return player?.balance ?? 0;
}
