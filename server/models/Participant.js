class Participant {
  constructor(id, username, role = 'PARTICIPANT') {
    this.id = id;
    this.username = username;
    this.role = role;
  }

  canControlPlayback() {
    return this.role === 'HOST' || this.role === 'MODERATOR';
  }

  isHost() {
    return this.role === 'HOST';
  }
}

module.exports = Participant;