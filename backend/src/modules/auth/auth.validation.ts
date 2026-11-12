import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
const password = z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long');
const displayName = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(24, 'Name must be at most 24 characters');

export const registerSchema = z.object({ email, password, displayName });
export const loginSchema = z.object({ email, password: z.string().min(1).max(72) });
export const updateProfileSchema = z.object({ displayName });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: password,
});
