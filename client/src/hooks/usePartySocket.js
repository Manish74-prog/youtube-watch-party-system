import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://youtube-watch-party-system-sg19.onrender.com';

export function usePartySocket(roomId, username) {
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [userRole, setUserRole] = useState('PARTICIPANT');
  const [videoId, setVideoId] = useState('dQw4w9WgXcQ');
  const [errorMessage, setErrorMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!roomId || !username) return;

    const s = io(BACKEND_URL);
    setSocket(s);

    s.emit('join-room', { roomId, username });

    s.on('room-state', (state) => {
      if (state.videoId) setVideoId(state.videoId);
      if (state.members) {
        setParticipants(state.members);
        const me = state.members.find((m) => m.socketId === s.id || m.username === username);
        if (me && me.role) setUserRole(me.role);
      }
    });

    s.on('user-joined', ({ members }) => {
      if (members) setParticipants(members);
    });

    s.on('role-updated', ({ socketId, role }) => {
      if (socketId === s.id) setUserRole(role);
    });

    s.on('error-msg', (msg) => {
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
    messages,
  };
}