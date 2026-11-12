import { Schema, model, type Types } from 'mongoose';

// Our own record of a user-created room. The game platform owns the live room
// (players, clock); we keep who owns it and whether it is private.
export interface IRoom {
  key: string;
  name: string;
  ownerId: Types.ObjectId;
  visibility: 'public' | 'private';
  inviteCode: string;
  capacity: number;
  chips: number[];
  maxPerTarget: number;
  timing: { betSeconds: number; spinSeconds: number; resultSeconds: number };
  // False until the room exists on the game platform (guards the 3-room limit race).
  ready: boolean;
  createdAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    visibility: { type: String, enum: ['public', 'private'], required: true },
    inviteCode: { type: String, required: true, unique: true },
    capacity: { type: Number, required: true },
    chips: { type: [Number], required: true },
    maxPerTarget: { type: Number, required: true },
    timing: {
      betSeconds: Number,
      spinSeconds: Number,
      resultSeconds: Number,
    },
    ready: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Room = model<IRoom>('Room', roomSchema);
