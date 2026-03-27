import mongoose, { Schema, Document } from 'mongoose';

export interface IRoomDocument extends Document {
  name: string;
  icon: string;
  isGlobal?: boolean;
}

const RoomSchema = new Schema<IRoomDocument>(
  {
    name:     { type: String, required: true },
    icon:     { type: String, default: '💬' },
    isGlobal: { type: Boolean, default: false }
  },
  {
    timestamps: true,
  }
);

export const Room = mongoose.model<IRoomDocument>('Room', RoomSchema);
