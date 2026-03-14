import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket: Socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('send_message', (data) => {
    // Broadcast the message to all other connected clients
    socket.broadcast.emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log(`User Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
console.log(PORT)
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
