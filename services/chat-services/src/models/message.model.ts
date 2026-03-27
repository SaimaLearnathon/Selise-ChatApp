import mongoose, { Schema, Document } from 'mongoose';
import type { IMessage } from '../types';

// ─── Message Document ──────────────────────────────────────────────────────────

export interface IMessageDocument extends IMessage, Document {}

const MessageSchema = new Schema<IMessageDocument>(
  {
    conversationId: {
      type:     String,
      required: true,
    },
    senderId: {
      type:     String,
      required: true,
    },
    senderEmail: {
      type:     String,
      required: true,
    },
    content: {
      type:     String,
      required: true,
      trim:     true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true, // auto adds createdAt + updatedAt
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
// These make queries fast even with millions of messages

// Fetch messages for a conversation sorted by time → most used query
MessageSchema.index({ conversationId: 1, createdAt: -1 });

// Find all messages by a specific user
MessageSchema.index({ senderId: 1 });

export const Message = mongoose.model<IMessageDocument>('Message', MessageSchema);