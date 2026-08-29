const Room = require('../models/Room');

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  createRoom(roomId, hostId, username) {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Room(roomId);
      this.rooms.set(roomId, room);
    }
    if (hostId && username) {
      room.addParticipant(hostId, username, 'HOST');
    }
    return room;
  }

  deleteRoom(roomId) {
    this.rooms.delete(roomId);
  }

  findRoomBySocketId(socketId) {
    for (const room of this.rooms.values()) {
      if (room.participants.has(socketId)) {
        return room;
      }
    }
    return null;
  }
}

module.exports = new RoomManager();