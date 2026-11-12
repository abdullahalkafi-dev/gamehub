import { Schema, model, type HydratedDocument } from 'mongoose';

export interface IUser {
  email: string;
  passwordHash: string;
  displayName: string;
  role: 'user' | 'admin';
  // True once the 100-coin welcome bonus reached the game wallet.
  bonusGranted: boolean;
  createdAt: Date;
}
export type UserDoc = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 24 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    bonusGranted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const User = model<IUser>('User', userSchema);

/** Public shape sent to clients (never the hash). */
export const toPublicUser = (u: UserDoc) => ({
  id: u.id as string,
  email: u.email,
  displayName: u.displayName,
  role: u.role,
  createdAt: u.createdAt,
});
