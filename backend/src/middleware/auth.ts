import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { forbidden, unauthorized } from '../errors/AppError.js';
import { User, type UserDoc } from '../modules/user/user.model.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserDoc;
    }
  }
}

export const COOKIE_NAME = 'gh_token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const signToken = (userId: string) => jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '30d' });

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

/**
 * Accepts a bearer token (mobile app) or the httpOnly cookie (website).
 * Cookie requests that change data must carry X-Requested-With, so another
 * website cannot make a signed-in browser post on the user's behalf (CSRF).
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.header('authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const cookie = (req.cookies as Record<string, string> | undefined)?.[COOKIE_NAME];
  const token = bearer ?? cookie;
  if (!token) throw unauthorized();
  if (!bearer && !SAFE_METHODS.has(req.method) && req.header('x-requested-with') !== 'gamehub') {
    throw forbidden('csrf_blocked');
  }
  let sub: string;
  try {
    sub = (jwt.verify(token, env.JWT_SECRET) as { sub: string }).sub;
  } catch {
    throw unauthorized('invalid_token');
  }
  const user = await User.findById(sub);
  if (!user) throw unauthorized('invalid_token');
  req.user = user;
  next();
});

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== 'admin') return next(forbidden('admin_only'));
  next();
};

/** Same as requireAuth, but the user is always set by the time handlers run. */
export const currentUser = (req: Request): UserDoc => {
  if (!req.user) throw unauthorized();
  return req.user;
};
