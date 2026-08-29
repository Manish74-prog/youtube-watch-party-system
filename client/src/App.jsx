import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import VideoPlayer from './components/VideoPlayer';
import Controls from './components/Controls';
import Sidebar from './components/Sidebar';
import './App.css';

const SOCKET_SERVER_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
const socket = io(SOCKET_SERVER_URL);

export default function App() {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('PARTICIPANT');
  const [participants, setParticipants] = useState([]);
  const [videoId, setVideoId] = useState(null);

  const syncUserRole = (list) => {
    if (!list || !socket.id) return;
    const me = list.find((p) => p.userId === socket.id);
    if (me && me.role) {
      setUserRole(me.role);
    }
  };

  useEffect(() => {
    socket.on('sync_state', (state) => {
      if (state.videoId) setVideoId(state.videoId);
      if (state.role) setUserRole(state.role);
      if (state.participants) {
        setParticipants(state.participants);
        syncUserRole(state.participants);
      }
    });

    socket.on('user_joined', ({ participants: updatedList }) => {
      if (updatedList) {
        setParticipants(updatedList);
        syncUserRole(updatedList);
      }
    });

    socket.on('user_left', ({ participants: updatedList }) => {
      if (updatedList) {
        setParticipants(updatedList);
        syncUserRole(updatedList);
      }
    });

    socket.on('role_assigned', ({ userId, role, participants: updatedList }) => {
      if (updatedList) {
        setParticipants(updatedList);
        syncUserRole(updatedList);
      }
      if (userId === socket.id) {
        setUserRole(role);
      }
    });

    socket.on('participant_removed', ({ userId, participants: updatedList }) => {
      if (updatedList) {
        setParticipants(updatedList);
        syncUserRole(updatedList);
      }
      if (userId === socket.id) {
        alert('You have been removed from the watch party.');
        setJoined(false);
        setVideoId(null);
        setRoomId('');
        setParticipants([]);
        setUserRole('PARTICIPANT');
      }
    });

    socket.on('change_video', ({ videoId: newId }) => {
      setVideoId(newId);
    });

    return () => {
      socket.off('sync_state');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('role_assigned');
      socket.off('participant_removed');
      socket.off('change_video');
    };
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomId.trim() || !username.trim()) return;

    socket.emit('join_room', { roomId: roomId.trim(), username: username.trim() });
    setJoined(true);
  };

  const handleLeaveRoom = () => {
    if (window.confirm('Are you sure you want to leave the watch party?')) {
      socket.emit('leave_room');
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
      {/* Top Navbar */}
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

      {/* Main Layout */}
      <main className="room-main-layout">
        <section className="video-column">
          <div className="player-container">
            <VideoPlayer videoId={videoId} userRole={userRole} socket={socket} />
          </div>

          <Controls
            socket={socket}
            userRole={userRole}
            onVideoChange={(newId) => setVideoId(newId)}
          />
        </section>

        <Sidebar
          participants={participants}
          currentUserId={socket.id}
          isHost={userRole === 'HOST'}
          socket={socket}
          roomId={roomId}
          username={username}
        />
      </main>
    </div>
  );
}