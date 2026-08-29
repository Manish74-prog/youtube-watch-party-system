import { useEffect, useState, useRef } from 'react';
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

    const s = io(BACKEND_URL);
    setSocket(s);

    s.emit('join_room', { roomId, username });

    socket.on('room-joined', ({ roomState, user }) => {
  // Save your assigned role directly from the server response
  if (user && user.role) {
    setUserRole(user.role);
  }
});

socket.on('sync-state', (roomState) => {
  // If the server sends the full members list, find yourself by socket ID
  const currentUser = roomState.members?.find((m) => m.socketId === socket.id);
  if (currentUser) {
    setUserRole(currentUser.role);
  }
});

    s.on('user_joined', (data) => {
      setParticipants(data.participants);
      if (data.userId === s.id) setUserRole(data.role);
    });

    s.on('role_assigned', (data) => {
      setParticipants(data.participants);
      if (data.userId === s.id) setUserRole(data.role);
    });

    s.on('participant_removed', (data) => {
      if (data.userId === s.id) {
        alert('You have been removed from the room.');
        window.location.reload();
      } else {
        setParticipants(data.participants);
      }
    });

    s.on('user_left', (data) => {
      setParticipants(data.participants);
    });

    s.on('change_video', ({ videoId: newId }) => {
      setVideoId(newId);
    });

    s.on('error_message', (msg) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 3000);
    });



    return () => s.disconnect();
  }, [roomId, username]);

  return { socket, participants, userRole, videoId, setVideoId, errorMessage };
}