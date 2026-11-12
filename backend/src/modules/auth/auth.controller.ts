import type { CookieOptions, Response } from 'express';
import { env } from '../../config/env.js';
import { asyncHandler, COOKIE_NAME, currentUser, signToken } from '../../middleware/auth.js';
import { toPublicUser, type UserDoc } from '../user/user.model.js';
import { getBalance } from '../wallet/wallet.service.js';
import * as service from './auth.service.js';
import { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from './auth.validation.js';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'lax',
  maxAge: 30 * 24 * 3600 * 1000,
  path: '/',
};

// The website keeps the token in an httpOnly cookie (JavaScript cannot read it).
// The mobile app asks for the token in the body with X-Client: mobile.
function sendSession(req: { header(n: string): string | undefined }, res: Response, user: UserDoc, status = 200) {
  const token = signToken(user.id);
  res.cookie(COOKIE_NAME, token, cookieOptions);
  const body: Record<string, unknown> = { user: toPublicUser(user) };
  if (req.header('x-client') === 'mobile') body.token = token;
  res.status(status).json(body);
}

export const register = asyncHandler(async (req, res) => {
  const user = await service.register(registerSchema.parse(req.body));
  sendSession(req, res, user, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  sendSession(req, res, await service.login(email, password));
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  // Balance comes from the game wallet. If the game service is down we still answer.
  let balance: number | null = null;
  try {
    balance = await getBalance(user);
  } catch {
    balance = null;
  }
  res.json({ user: toPublicUser(user), balance });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  user.displayName = updateProfileSchema.parse(req.body).displayName;
  await user.save();
  res.json({ user: toPublicUser(user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await service.changePassword(currentUser(req), currentPassword, newPassword);
  res.json({ ok: true });
});
