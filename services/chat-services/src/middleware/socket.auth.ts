import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { SocketUser } from '../types';

export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void
): void => {
  try {
    // Read token from auth object OR query params
    // Postman sends via query: ?token=eyJ...
    // Frontend sends via: socket = io(URL, { auth: { token } })
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.query?.token as string | undefined);

    if (!token) {
      next(new Error('AUTH_MISSING: No token provided'));
      return;
    }

    const payload = jwt.verify(token, config.jwt.accessSecret, {
      issuer:     config.jwt.issuer,
      audience:   config.jwt.audience,
      algorithms: ['HS256'],
    }) as { sub: string; email: string; role: string };

    socket.data.user = {
      userId: payload.sub,
      email:  payload.email,
      role:   payload.role,
    } as SocketUser;

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      next(new Error('AUTH_EXPIRED: Token expired'));
    } else {
      next(new Error('AUTH_INVALID: Invalid token'));
    }
  }
};