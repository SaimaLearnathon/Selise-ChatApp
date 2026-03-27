import { Server, Socket } from 'socket.io';
import { Message } from '../models/message.model';
import { Room } from '../models/room.model';
import type { SocketUser, SendMessagePayload } from '../types';

interface AuthSocket extends Socket {
  data: { user: SocketUser };
}

export const registerSocketHandlers = (io: Server): void => {

  // ── Broadcast online users ─────────────────────────────────────────────────
  const broadcastOnlineUsers = async () => {
    try {
      const sockets = await io.fetchSockets();
      const usersMap = new Map<string, { userId: string; email: string }>();

      for (const s of sockets) {
        const user = ((s as unknown) as AuthSocket).data?.user;
        if (user) {
          usersMap.set(user.userId, { userId: user.userId, email: user.email });
        }
      }

      io.emit('online_users_update', Array.from(usersMap.values()));
    } catch (err) {
      console.error('[socket] fetchSockets error', err);
    }
  };

  // ── Broadcast rooms ────────────────────────────────────────────────────────
  const broadcastRooms = async () => {
    try {
      let rooms = await Room.find().lean();
      if (rooms.length === 0) {
        await Room.create({ name: 'Global Chat', icon: '🌍', isGlobal: true });
        rooms = await Room.find().lean();
      }
      const formattedRooms = rooms.map(r => ({
        id: r._id.toString(),
        name: r.name,
        icon: r.icon
      }));
      io.emit('rooms_update', formattedRooms);
    } catch (err) {
      console.error('[socket] Rooms fetch error', err);
    }
  };

  // ── Socket connection handler ─────────────────────────────────────────────
  io.on('connection', (socket: AuthSocket) => {
    const { userId, email } = socket.data.user;
    console.log(`[socket] connected: ${email} (${socket.id})`);

    broadcastOnlineUsers();
    broadcastRooms();

    socket.join(`user:${userId}`);

    // ── Join conversation ──────────────────────────────────────────────────
    socket.on('join_conversation', async (conversationId: string) => {
      if (!conversationId) return;
      try {
        socket.join(`conv:${conversationId}`);
        const history = await Message.find({ conversationId })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();
        socket.emit('message_history', history.reverse());
        console.log(`[socket] ${email} joined conversation: ${conversationId}`);
      } catch (err) {
        console.error('[socket] join_conversation error:', err);
        socket.emit('error', { message: 'Failed to load messages' });
      }
    });

    // ── Send message ───────────────────────────────────────────────────────
    socket.on('send_message', async (data: SendMessagePayload) => {
      const { conversationId, content } = data;
      if (!conversationId || !content?.trim()) return;

      try {
        const message = await Message.create({
          conversationId,
          senderId: userId,
          senderEmail: email,
          content: content.trim(),
        });

        io.to(`conv:${conversationId}`).emit('receive_message', {
          _id: message._id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          senderEmail: message.senderEmail,
          content: message.content,
          createdAt: message.createdAt,
        });
      } catch (err) {
        console.error('[socket] send_message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── Get message history ─────────────────────────────────────────────────
    socket.on('get_history', async ({ conversationId, page = 0 }: { conversationId: string; page?: number }) => {
      if (!conversationId) return;
      try {
        const messages = await Message.find({ conversationId })
          .sort({ createdAt: -1 })
          .skip(page * 50)
          .limit(50)
          .lean();
        socket.emit('message_history', messages.reverse());
      } catch (err) {
        console.error('[socket] get_history error:', err);
        socket.emit('error', { message: 'Failed to load history' });
      }
    });

    // ── Leave conversation ─────────────────────────────────────────────────
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
      console.log(`[socket] ${email} left conversation: ${conversationId}`);
    });

    // ── Typing indicators ──────────────────────────────────────────────────
    socket.on('typing', (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit('user_typing', { userId, email });
    });

    socket.on('stop_typing', (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit('user_stop_typing', { userId });
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected: ${email} — ${reason}`);
      setTimeout(() => broadcastOnlineUsers(), 100);
    });

    // ── Create room ───────────────────────────────────────────────────────
    socket.on('create_room', async ({ name, icon }: { name: string; icon?: string }) => {
      if (!name?.trim()) return;
      try {
        await Room.create({
          name: name.trim(),
          icon: icon || '💬'
        });
        broadcastRooms();
      } catch (err) {
        console.error('[socket] create_room error', err);
      }
    });
  });
};