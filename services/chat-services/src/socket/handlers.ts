import { Server, Socket } from 'socket.io';
import { Message } from '../models/message.model';
import { Room } from '../models/room.model';
import { pubClient } from '../config/redis';
import type { SocketUser, SendMessagePayload } from '../types';

interface AuthSocket extends Socket {
  data: { user: SocketUser };
}

// ─── Rate Limit Helper ────────────────────────────────────────────────────────
const isRateLimited = async (key: string, limit: number, windowSeconds: number): Promise<boolean> => {
  try {
    const count = await pubClient.incr(key);
    if (count === 1) {
      await pubClient.expire(key, windowSeconds);
    }
    return count > limit;
  } catch (err) {
    console.error('[RateLimit] Error:', err);
    return false; // Fail open if Redis is down
  }
};

export const registerSocketHandlers = (io: Server): void => {
  // ... (broadcastOnlineUsers and broadcastRooms remain same)

  // ── Broadcast online users ─────────────────────────────────────────────────
  const broadcastOnlineUsers = async () => {
    try {
      // Fetch all unique online users from Redis Set
      const onlineUsersData = await pubClient.sMembers('online_users');
      const users = onlineUsersData.map(u => JSON.parse(u));

      io.emit('online_users_update', users);
    } catch (err) {
      console.error('[socket] broadcastOnlineUsers error', err);
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
  io.on('connection', async (socket: AuthSocket) => {
    const { userId, email } = socket.data.user;
    console.log(`[socket] connected: ${email} (${socket.id})`);

    try {
      // Increment user socket count and add to online set if it's the first socket
      const userSocketsKey = `user_sockets:${userId}`;
      const count = await pubClient.incr(userSocketsKey);
      if (count === 1) {
        await pubClient.sAdd('online_users', JSON.stringify({ userId, email }));
      }

      broadcastOnlineUsers();
      broadcastRooms();

      socket.join(`user:${userId}`);
    } catch (err) {
      console.error('[socket] connection tracking error', err);
    }

    // ── Join conversation ──────────────────────────────────────────────────
    socket.on('join_conversation', async (conversationId: string) => {
      if (!conversationId) return;
      const cacheKey = `messages:${conversationId}`;

      try {
        socket.join(`conv:${conversationId}`);

        // 1. Try fetching from Redis cache
        const cachedMessages = await pubClient.lRange(cacheKey, 0, 49);

        if (cachedMessages.length > 0) {
          const history = cachedMessages.map(m => JSON.parse(m)).reverse();
          socket.emit('message_history', history);
          console.log(`[socket] ${email} joined conversation: ${conversationId} (Cache Hit)`);
          return;
        }

        // 2. Cache miss: Fetch from MongoDB
        const history = await Message.find({ conversationId })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();

        socket.emit('message_history', history.reverse());
        console.log(`[socket] ${email} joined conversation: ${conversationId} (Cache Miss)`);

        // 3. Populate Redis cache (async)
        if (history.length > 0) {
          const pipeline = pubClient.multi();
          // We need original order (desc) for LPUSH to maintain desc order in list
          const messagesToCache = await Message.find({ conversationId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

          pipeline.del(cacheKey);
          messagesToCache.forEach(m => {
            pipeline.rPush(cacheKey, JSON.stringify(m));
          });
          pipeline.expire(cacheKey, 3600); // 1 hour expiry
          await pipeline.exec();
        }

      } catch (err) {
        console.error('[socket] join_conversation error:', err);
        socket.emit('error', { message: 'Failed to load messages' });
      }
    });

    // ── Send message ───────────────────────────────────────────────────────
    socket.on('send_message', async (data: SendMessagePayload) => {
      const { conversationId, content } = data;
      if (!conversationId || !content?.trim()) return;

      // Rate limit: 5 messages per 2 seconds
      if (await isRateLimited(`ratelimit:msg:${userId}`, 5, 2)) {
        socket.emit('error', { message: 'Slow down! You are sending messages too fast.' });
        return;
      }

      try {
        const message = await Message.create({
          conversationId,
          senderId: userId,
          senderEmail: email,
          content: content.trim(),
        });

        // Update Redis cache (LPUSH + LTRIM)
        const cacheKey = `messages:${conversationId}`;
        const pipeline = pubClient.multi();
        pipeline.lPush(cacheKey, JSON.stringify(message));
        pipeline.lTrim(cacheKey, 0, 49);
        await pipeline.exec();

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
    socket.on('disconnect', async (reason) => {
      console.log(`[socket] disconnected: ${email} — ${reason}`);

      try {
        const userSocketsKey = `user_sockets:${userId}`;
        const count = await pubClient.decr(userSocketsKey);

        if (count <= 0) {
          await pubClient.del(userSocketsKey);
          await pubClient.sRem('online_users', JSON.stringify({ userId, email }));
        }

        setTimeout(() => broadcastOnlineUsers(), 100);
      } catch (err) {
        console.error('[socket] disconnect tracking error', err);
      }
    });

    // ── Create room ───────────────────────────────────────────────────────
    socket.on('create_room', async ({ name, icon }: { name: string; icon?: string }) => {
      if (!name?.trim()) return;

      // Rate limit: 1 room per 10 seconds
      if (await isRateLimited(`ratelimit:room:${userId}`, 1, 10)) {
        socket.emit('error', { message: 'Please wait before creating another room.' });
        return;
      }

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