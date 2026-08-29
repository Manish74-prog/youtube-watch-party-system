const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.send('YouTube Watch Party Backend is Live!');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Safe Redis handling (only connects if remote REDIS_URL environment variable is defined)
if (process.env.REDIS_URL) {
  try {
    const { createClient } = require('redis');
    const { createAdapter } = require('@socket.io/redis-adapter');
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log('Connected to Redis Adapter');
      })
      .catch((err) => {
        console.warn('Redis connection failed. Running in memory mode:', err.message);
      });
  } catch (e) {
    console.warn('Redis initialization skipped. Running in memory mode.');
  }
}

// In-Memory Room Store
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // 1. Join or Create Room
  socket.on('join_room', ({ roomId, username }) => {
    if (!roomId || !username) return;

    socket.join(roomId);

    if (!rooms.has(roomId)) {
      // First person to join/create becomes the HOST
      rooms.set(roomId, {
        roomId,
        hostId: socket.id,
        videoId: null,
        currentTime: 0,
        isPlaying: false,
        participants: [{ socketId: socket.id, username, role: 'HOST' }]
      });
    } else {
      const room = rooms.get(roomId);
      const hasHost = room.participants.some((p) => p.role === 'HOST');
      const role = hasHost ? 'PARTICIPANT' : 'HOST';
      if (role === 'HOST') room.hostId = socket.id;

      // Avoid duplicate socket entries
      room.participants = room.participants.filter((p) => p.socketId !== socket.id);
      room.participants.push({ socketId: socket.id, username, role });
    }

    const currentRoom = rooms.get(roomId);
    const currentUser = currentRoom.participants.find((p) => p.socketId === socket.id);

    // Send complete state + assigned role directly to the joining user
    socket.emit('room_state', {
      ...currentRoom,
      myRole: currentUser ? currentUser.role : 'PARTICIPANT'
    });

    // Broadcast updated participant list to everyone in the room
    io.to(roomId).emit('participants_updated', currentRoom.participants);
  });

  // 2. Playback Synchronization (Play, Pause, Seek)
  socket.on('video_action', ({ roomId, action, currentTime, videoId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const sender = room.participants.find((p) => p.socketId === socket.id);
    if (!sender || (sender.role !== 'HOST' && sender.role !== 'MODERATOR')) {
      return socket.emit('error_msg', 'Only the Host or Moderators can control playback.');
    }

    if (videoId) room.videoId = videoId;
    if (currentTime !== undefined) room.currentTime = currentTime;
    if (action === 'play') room.isPlaying = true;
    if (action === 'pause') room.isPlaying = false;

    socket.to(roomId).emit('sync_action', {
      action,
      currentTime,
      videoId: room.videoId
    });
  });

  // 3. Video Selection Change
  socket.on('change_video', ({ roomId, videoId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const sender = room.participants.find((p) => p.socketId === socket.id);
    if (!sender || (sender.role !== 'HOST' && sender.role !== 'MODERATOR')) {
      return socket.emit('error_msg', 'Only the Host or Moderators can change the video.');
    }

    room.videoId = videoId;
    room.currentTime = 0;
    room.isPlaying = false;

    io.to(roomId).emit('change_video', { videoId });
  });

  // 4. Manual Leave Room
  socket.on('leave_room', ({ roomId }) => {
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    socket.leave(roomId);

    const index = room.participants.findIndex((p) => p.socketId === socket.id);
    if (index !== -1) {
      const leavingUser = room.participants[index];
      room.participants.splice(index, 1);

      // Promote next participant if Host leaves
      if (leavingUser.role === 'HOST' && room.participants.length > 0) {
        room.participants[0].role = 'HOST';
        room.hostId = room.participants[0].socketId;
        io.to(room.participants[0].socketId).emit('role_promoted', { role: 'HOST' });
      }

      io.to(roomId).emit('participants_updated', room.participants);

      if (room.participants.length === 0) {
        rooms.delete(roomId);
      }
    }
  });

  // 5. Handle Disconnect / Connection Drop
  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      const index = room.participants.findIndex((p) => p.socketId === socket.id);
      if (index !== -1) {
        const leavingUser = room.participants[index];
        room.participants.splice(index, 1);

        // Host Migration
        if (leavingUser.role === 'HOST' && room.participants.length > 0) {
          room.participants[0].role = 'HOST';
          room.hostId = room.participants[0].socketId;
          io.to(room.participants[0].socketId).emit('role_promoted', { role: 'HOST' });
        }

        io.to(roomId).emit('participants_updated', room.participants);

        if (room.participants.length === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});