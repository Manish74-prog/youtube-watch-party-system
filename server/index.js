require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const roomManager = require('./managers/RoomManager');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

io.on('connection', (socket) => {
  // Join Room
  // Join Room Event
  socket.on('join_room', ({ roomId, username }) => {
    let room = roomManager.getRoom(roomId);
    let assignedRole = 'PARTICIPANT';

    if (!room || room.participants.size === 0) {
      room = roomManager.createRoom(roomId, socket.id, username);
      assignedRole = 'HOST';
    } else {
      room.addParticipant(socket.id, username, 'PARTICIPANT');
      assignedRole = 'PARTICIPANT';
    }

    socket.join(roomId);

    const participantsList = room.getParticipantList();

    // Send complete initial state snapshot to joiner
    socket.emit('sync_state', {
      ...room.getCalculatedState(),
      role: assignedRole,
      participants: participantsList
    });

    // Notify room of new participant
    io.to(roomId).emit('user_joined', {
      userId: socket.id,
      username,
      role: assignedRole,
      participants: participantsList
    });
  


    socket.emit('sync_state', {
      ...room.videoState,
      role: assignedRole,
      participants: room.getParticipantList()
    });

    io.to(roomId).emit('user_joined', {
      userId: socket.id,
      username,
      role: assignedRole,
      participants: room.getParticipantList()
    });
  });

  // Playback Control Handlers
  const handlePlaybackEvent = (action, payload = {}) => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) return;

    const participant = room.getParticipant(socket.id);
    if (!participant || !participant.canControlPlayback()) {
      return socket.emit('error_message', 'Permission denied');
    }

    room.updatePlayback(action, payload);
    io.to(room.roomId).emit(action, payload);
  };

  socket.on('play', () => handlePlaybackEvent('play'));
  socket.on('pause', () => handlePlaybackEvent('pause'));
  socket.on('seek', (data) => handlePlaybackEvent('seek', data));
  socket.on('change_video', (data) => handlePlaybackEvent('change_video', data));

  // Role Assignment
  socket.on('assign_role', ({ targetUserId, newRole }) => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) return;

    const sender = room.getParticipant(socket.id);
    if (!sender || !sender.isHost()) return;

    const target = room.getParticipant(targetUserId);
    if (target) {
      target.role = newRole;
      io.to(room.roomId).emit('role_assigned', {
        userId: targetUserId,
        role: newRole,
        participants: room.getParticipantList()
      });
    }
  });

  // Host Transfer
  socket.on('transfer_host', ({ targetUserId }) => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) return;

    const sender = room.getParticipant(socket.id);
    if (!sender || !sender.isHost()) return;

    const target = room.getParticipant(targetUserId);
    if (target) {
      sender.role = 'PARTICIPANT';
      target.role = 'HOST';

      io.to(room.roomId).emit('role_assigned', {
        userId: targetUserId,
        role: 'HOST',
        participants: room.getParticipantList()
      });
    }
  });

  // Remove Participant
  socket.on('remove_participant', ({ targetUserId }) => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) return;

    const sender = room.getParticipant(socket.id);
    if (!sender || !sender.isHost()) return;

    room.removeParticipant(targetUserId);
    io.to(room.roomId).emit('participant_removed', {
      userId: targetUserId,
      participants: room.getParticipantList()
    });

    const targetSocket = io.sockets.sockets.get(targetUserId);
    if (targetSocket) targetSocket.leave(room.roomId);
  });

  // Real-Time Chat & Floating Reactions
  socket.on('send_chat', ({ roomId, message, username }) => {
    if (!message || !message.trim()) return;
    io.to(roomId).emit('new_chat', {
      id: Date.now() + Math.random().toString(),
      userId: socket.id,
      username,
      message: message.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  socket.on('send_reaction', ({ roomId, emoji, username }) => {
    io.to(roomId).emit('new_reaction', {
      id: Date.now() + Math.random(),
      emoji,
      username
    });
  });

  

  // User Disconnect with Host Auto-Migration
  const handleUserExit = (socket) => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) return;

    const leavingUser = room.getParticipant(socket.id);
    room.removeParticipant(socket.id);
    socket.leave(room.roomId);

    if (room.participants.size === 0) {
      roomManager.deleteRoom(room.roomId);
    } else {
      // If the Host left, automatically assign Host to the next remaining participant
      if (leavingUser && leavingUser.isHost()) {
        const nextParticipant = room.participants.values().next().value;
        if (nextParticipant) {
          nextParticipant.role = 'HOST';
          io.to(room.roomId).emit('role_assigned', {
            userId: nextParticipant.userId,
            role: 'HOST',
            participants: room.getParticipantList()
          });
        }
      }

      io.to(room.roomId).emit('user_left', {
        userId: socket.id,
        username: leavingUser?.username,
        participants: room.getParticipantList()
      });
    }
  };

  // Explicit Leave Event (triggered by the Leave Room button)
  socket.on('leave_room', () => {
    handleUserExit(socket);
  });

  // Disconnect Event (triggered by closing the browser tab)
  socket.on('disconnect', () => {
    handleUserExit(socket);
  });
  }); 
async function startServer() {
  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Connected to Redis Pub/Sub Adapter');
  } catch (error) {
    console.warn('⚠️ Redis connection failed, running with default memory adapter:', error.message);
  }

  const PORT = process.env.PORT || 5001;
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();