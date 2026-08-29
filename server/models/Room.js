class Room {
  constructor(roomId) {
    this.roomId = roomId;
    this.participants = new Map();
    this.videoState = {
      videoId: null,
      isPlaying: false,
      currentTime: 0,
      lastUpdated: Date.now()
    };
  }

  addUser(socketId, username) {
  // If there is no active host or room is empty, make this user the HOST
  const isFirstUser = this.members.size === 0 || !this.hostId;
  const role = isFirstUser ? 'HOST' : 'PARTICIPANT';

  if (isFirstUser) {
    this.hostId = socketId;
  }

  const user = { socketId, username, role };
  this.members.set(socketId, user);
  return user;
}
  addParticipant(socketId, username, role = 'PARTICIPANT') {
    this.participants.set(socketId, {
      userId: socketId,
      username,
      role,
      canControlPlayback() {
        return this.role === 'HOST' || this.role === 'MODERATOR';
      },
      isHost() {
        return this.role === 'HOST';
      }
    });
  }

  getParticipant(socketId) {
    return this.participants.get(socketId);
  }

  removeParticipant(socketId) {
    this.participants.delete(socketId);
  }

  getParticipantList() {
    return Array.from(this.participants.values()).map((p) => ({
      userId: p.userId,
      username: p.username,
      role: p.role
    }));
  }

  updatePlayback(action, payload = {}) {
    if (action === 'change_video') {
      this.videoState.videoId = payload.videoId;
      this.videoState.currentTime = 0;
      this.videoState.isPlaying = true;
      this.videoState.lastUpdated = Date.now();
    } else if (action === 'play') {
      this.videoState.isPlaying = true;
      this.videoState.lastUpdated = Date.now();
    } else if (action === 'pause') {
      if (this.videoState.isPlaying && this.videoState.lastUpdated) {
        this.videoState.currentTime += (Date.now() - this.videoState.lastUpdated) / 1000;
      }
      this.videoState.isPlaying = false;
      this.videoState.lastUpdated = Date.now();
    } else if (action === 'seek') {
      if (payload.time !== undefined) {
        this.videoState.currentTime = payload.time;
      } else if (payload.offset !== undefined) {
        if (this.videoState.isPlaying && this.videoState.lastUpdated) {
          this.videoState.currentTime += (Date.now() - this.videoState.lastUpdated) / 1000;
        }
        this.videoState.currentTime = Math.max(0, this.videoState.currentTime + payload.offset);
      }
      this.videoState.lastUpdated = Date.now();
    }
  }

  getCalculatedState() {
    let currentTime = this.videoState.currentTime;

    // Calculate real-time elapsed seconds if video is actively playing
    if (this.videoState.isPlaying && this.videoState.lastUpdated) {
      const elapsedSeconds = (Date.now() - this.videoState.lastUpdated) / 1000;
      currentTime += elapsedSeconds;
    }

    return {
      ...this.videoState,
      currentTime
    };
  }
}

module.exports = Room;