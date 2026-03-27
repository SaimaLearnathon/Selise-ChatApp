import { Server, Socket } from 'socket.io';
import { Message } from '../models/message.model';
import type { SocketUser, SendMessagePayload } from '../types';

interface AuthSocket extends Socket {
  data: { user: SocketUser };
}

export const registerSocketHandlers = (io: Server): void => {

  io.on('connection', (socket: AuthSocket) => {
    const { userId, email } = socket.data.user;
    console.log(`[socket] connected: ${email} (${socket.id})`);

    // Join personal room for direct messages
    socket.join(`user:${userId}`);

    // ── Join conversation ──────────────────────────────────────────────────────
    // Client calls this when opening a chat window
    // Server responds with last 50 messages from MongoDB
    socket.on('join_conversation', async (conversationId: string) => {
      if (!conversationId) return;

      try {
        // Join the Socket.IO room
        socket.join(`conv:${conversationId}`);

        // Fetch last 50 messages from MongoDB
        // index({ conversationId: 1, createdAt: -1 }) makes this fast
        const history = await Message.find({ conversationId })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();

        // Send history in chronological order (oldest first)
        socket.emit('message_history', history.reverse());

        console.log(`[socket] ${email} joined conversation: ${conversationId}`);
      } catch (err) {
        console.error('[socket] join_conversation error:', err);
        socket.emit('error', { message: 'Failed to load messages' });
      }
    });

    // ── Send message ───────────────────────────────────────────────────────────
    // 1. Save to MongoDB
    // 2. Broadcast to everyone in the conversation room
    socket.on('send_message', async (data: SendMessagePayload) => {
      const { conversationId, content } = data;

      if (!conversationId || !content?.trim()) return;

      try {
        // 1. Save to MongoDB permanently
        const message = await Message.create({
          conversationId,
          senderId:    userId,
          senderEmail: email,
          content:     content.trim(),
        });

        // 2. Broadcast to ALL users in the conversation (including sender)
        io.to(`conv:${conversationId}`).emit('receive_message', {
          _id:            message._id,
          conversationId: message.conversationId,
          senderId:       message.senderId,
          senderEmail:    message.senderEmail,
          content:        message.content,
          createdAt:      message.createdAt,
        });

      } catch (err) {
        console.error('[socket] send_message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── Get history on demand ──────────────────────────────────────────────────
    socket.on('get_history', async (data: { conversationId: string; page?: number }) => {
      const { conversationId, page = 0 } = data;
      if (!conversationId) return;

      try {
        const messages = await Message.find({ conversationId })
          .sort({ createdAt: -1 })
          .skip(page * 50)   // pagination — 50 per page
          .limit(50)
          .lean();

        socket.emit('message_history', messages.reverse());
      } catch (err) {
        socket.emit('error', { message: 'Failed to load history' });
      }
    });

    // ── Leave conversation ─────────────────────────────────────────────────────
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
      console.log(`[socket] ${email} left conversation: ${conversationId}`);
    });

    // ── Typing indicators ──────────────────────────────────────────────────────
    socket.on('typing', (conversationId: string) => {
      // Broadcast to everyone EXCEPT the sender
      socket.to(`conv:${conversationId}`).emit('user_typing', { userId, email });
    });

    socket.on('stop_typing', (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit('user_stop_typing', { userId });
    });

    // ── Disconnect ─────────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected: ${email} — ${reason}`);
    });
  });
};