import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import VideoPlayer from './components/VideoPlayer';
import Controls from './components/Controls';
import Sidebar from './components/Sidebar';
import './App.css';

// Automatically connects to localhost:5001 during local development, and Render in production
const SOCKET_SERVER_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5001'
    : 'https://youtube-watch-party-system-sg19.onrender.com');

const socket = io(SOCKET_SERVER_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

export default function App() {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('PARTICIPANT');
  const [participants, setParticipants] = useState([]);
  const [videoId, setVideoId] = useState(null);
  const [currentSocketId, setCurrentSocketId] = useState('');

  const syncUserRole = (list) => {
    if (!list) return;
    const myId = socket.id || currentSocketId;
    const me = list.find(
      (p) => (p.socketId && p.socketId === myId) || (p.username && p.username === username)
    );
    if (me && me.role) {
      setUserRole(me.role);
    }
  };

  useEffect(() => {
    const onConnect = () => {
      setCurrentSocketId(socket.id);
      if (joined && roomId && username) {
        socket.emit('join_room', { roomId, username });
      }
    };

    socket.on('connect', onConnect);

    const handleRoomState = (state) => {
      if (state.videoId) setVideoId(state.videoId);
      if (state.myRole) setUserRole(state.myRole);
      if (state.role) setUserRole(state.role);

      const list = state.participants || [];
      if (list.length > 0) {
        setParticipants(list);
        syncUserRole(list);
      }
    };

    const handleParticipantsUpdate = (data) => {
      const list = Array.isArray(data) ? data : data.participants || [];
      setParticipants(list);
      syncUserRole(list);
    };

    const handleRolePromoted = ({ role }) => {
      if (role) setUserRole(role);
    };

    const handleParticipantRemoved = ({ socketId, username: kickedUsername }) => {
      const myId = socket.id || currentSocketId;
      if (socketId === myId || kickedUsername === username) {
        alert('You have been removed from the watch party.');
        setJoined(false);
        setVideoId(null);
        setRoomId('');
        setParticipants([]);
        setUserRole('PARTICIPANT');
      }
    };

    const handleVideoChange = ({ videoId: newId }) => {
      if (newId) setVideoId(newId);
    };

    socket.on('room_state', handleRoomState);
    socket.on('participants_updated', handleParticipantsUpdate);
    socket.on('role_promoted', handleRolePromoted);
    socket.on('participant_removed', handleParticipantRemoved);
    socket.on('change_video', handleVideoChange);

    return () => {
      socket.off('connect', onConnect);
      socket.off('room_state', handleRoomState);
      socket.off('participants_updated', handleParticipantsUpdate);
      socket.off('role_promoted', handleRolePromoted);
      socket.off('participant_removed', handleParticipantRemoved);
      socket.off('change_video', handleVideoChange);
    };
  }, [joined, roomId, username, currentSocketId]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomId.trim() || !username.trim()) return;

    socket.emit('join_room', {
      roomId: roomId.trim(),
      username: username.trim(),
    });
    setJoined(true);
  };

  const handleLeaveRoom = () => {
    if (window.confirm('Are you sure you want to leave the watch party?')) {
      socket.emit('leave_room', { roomId });
      setJoined(false);
      setRoomId('');
      setVideoId(null);
      setUserRole('PARTICIPANT');
      setParticipants([]);
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert(`Room ID "${roomId}" copied to clipboard!`);
  };

  const canControl = userRole === 'HOST' || userRole === 'MODERATOR';

  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-card">
          <div className="join-header">
            <h2>🎬 YouTube Watch Party</h2>
            <p>Watch synchronized videos together with friends in real time.</p>
          </div>

          <form onSubmit={handleJoin} className="join-form">
            <div className="input-group">
              <label>Room ID</label>
              <input
                type="text"
                placeholder="e.g. party-room-101"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Your Name</label>
              <input
                type="text"
                placeholder="e.g. Manish"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary">Join Room</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="room-container">
      <header className="room-navbar">
        <div className="nav-brand">
          <h2>Watch Party</h2>
          <div className="room-badge">
            <span>Room: <strong>{roomId}</strong></span>
            <button className="btn-copy" onClick={copyRoomId}>Copy ID</button>
          </div>
        </div>

        <div className="user-status">
          <span className={`role-badge badge-${userRole.toLowerCase()}`}>
            Role: <strong>{userRole}</strong>
          </span>
          <button className="btn-leave" onClick={handleLeaveRoom}>
            🚪 Leave Room
          </button>
        </div>
      </header>

      <main className="room-main-layout">
        <section className="video-column">
          <div className="player-container">
            <VideoPlayer
              videoId={videoId}
              userRole={userRole}
              socket={socket}
              roomId={roomId}
            />
          </div>

          <Controls
            socket={socket}
            roomId={roomId}
            userRole={userRole}
            canControl={canControl}
            onVideoChange={(newId) => setVideoId(newId)}
          />
        </section>

        <Sidebar
          participants={participants}
          currentUserId={socket.id || currentSocketId}
          isHost={userRole === 'HOST'}
          userRole={userRole}
          socket={socket}
          roomId={roomId}
          username={username}
        />
      </main>
    </div>
  );
}