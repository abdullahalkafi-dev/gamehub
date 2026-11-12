import bcrypt from 'bcryptjs';
import { conflict, unauthorized } from '../../errors/AppError.js';
import { ensureSignupBonus } from '../wallet/wallet.service.js';
import { User, type UserDoc } from '../user/user.model.js';

const ROUNDS = 11;
// Compared when the email is unknown, so "no such user" and "wrong password" take the same time.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', ROUNDS);

export async function register(input: { email: string; password: string; displayName: string }): Promise<UserDoc> {
  const passwordHash = await bcrypt.hash(input.password, ROUNDS);
  let user: UserDoc;
  try {
    user = await User.create({ email: input.email, passwordHash, displayName: input.displayName });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw conflict('email_taken', 'An account with this email already exists.');
    throw e;
  }
  // If the game service is down the account still exists; the bonus is retried on the next balance read.
  try {
    await ensureSignupBonus(user);
  } catch (e) {
    console.error('[signup] bonus postponed for', user.id, (e as Error).message);
  }
  return user;
}

export async function login(email: string, password: string): Promise<UserDoc> {
  const user = await User.findOne({ email });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('invalid_credentials', 'Wrong email or password.');
  return user;
}

export async function changePassword(user: UserDoc, current: string, next: string) {
  if (!(await bcrypt.compare(current, user.passwordHash))) throw unauthorized('invalid_credentials', 'Current password is wrong.');
  user.passwordHash = await bcrypt.hash(next, ROUNDS);
  await user.save();
}

/** Creates the first admin from the environment if it does not exist yet. */
export async function seedAdmin(email?: string, password?: string) {
  if (!email || !password) return;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
    }
    return;
  }
  await User.create({
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, ROUNDS),
    displayName: 'Admin',
    role: 'admin',
  });
}
