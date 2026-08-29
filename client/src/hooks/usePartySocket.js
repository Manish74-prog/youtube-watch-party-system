import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://youtube-watch-party-system-sg19.onrender.com';

export function usePartySocket(roomId, username) {
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [userRole, setUserRole] = useState('PARTICIPANT');
  const [videoId, setVideoId] = useState('dQw4w9WgXcQ');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!roomId || !username) return;

    const s = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    setSocket(s);

    s.on('connect', () => {
      // Must use underscore 'join_room' to match server/index.js
      s.emit('join_room', { roomId, username });
    });

    // 1. Catches initial room state & assigned role
    s.on('room_state', (state) => {
      if (state.videoId) setVideoId(state.videoId);
      if (state.participants) setParticipants(state.participants);
      if (state.myRole) setUserRole(state.myRole);
    });

    // 2. Updates participant list and syncs role if changed
    s.on('participants_updated', (updatedList) => {
      setParticipants(updatedList);
      const me = updatedList.find((p) => p.socketId === s.id || p.username === username);
      if (me && me.role) setUserRole(me.role);
    });

    // 3. Handles dynamic host promotion if previous host leaves
    s.on('role_promoted', ({ role }) => {
      setUserRole(role);
    });

    s.on('error_msg', (msg) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 4000);
    });

    return () => {
      s.disconnect();
    };
  }, [roomId, username]);

  return {
    socket,
    participants,
    userRole,
    videoId,
    setVideoId,
    errorMessage,
  };
}