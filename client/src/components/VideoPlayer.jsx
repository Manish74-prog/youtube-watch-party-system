import React, { useState, useRef, useEffect } from 'react';
import YouTube from 'react-youtube';

export default function VideoPlayer({ videoId, userRole, socket }) {
  const playerRef = useRef(null);
  const isSyncing = useRef(false);
  const [reactions, setReactions] = useState([]);

  const canControl = userRole === 'HOST' || userRole === 'MODERATOR';

  const onReady = (event) => {
    playerRef.current = event.target;
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('play', () => {
      isSyncing.current = true;
      playerRef.current?.playVideo();
      setTimeout(() => { isSyncing.current = false; }, 400);
    });

    socket.on('pause', () => {
      isSyncing.current = true;
      playerRef.current?.pauseVideo();
      setTimeout(() => { isSyncing.current = false; }, 400);
    });

    socket.on('seek', ({ time, offset }) => {
      if (!playerRef.current) return;
      isSyncing.current = true;

      if (time !== undefined) {
        playerRef.current.seekTo(time, true);
      } else if (offset !== undefined) {
        const current = playerRef.current.getCurrentTime() || 0;
        playerRef.current.seekTo(Math.max(0, current + offset), true);
      }

      setTimeout(() => { isSyncing.current = false; }, 400);
    });

    socket.on('sync_state', (state) => {
      if (!state.videoId || !playerRef.current) return;
      isSyncing.current = true;
      playerRef.current.seekTo(state.currentTime || 0, true);
      if (state.isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
      setTimeout(() => { isSyncing.current = false; }, 500);
    });

    // Floating reaction with sender's username
    socket.on('new_reaction', ({ id, emoji, username }) => {
      setReactions((prev) => [
        ...prev,
        {
          id,
          emoji,
          username: username || 'Guest',
          left: Math.random() * 65 + 15 // Keeps animations within safe screen margins
        }
      ]);

      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2500);
    });

    return () => {
      socket.off('play');
      socket.off('pause');
      socket.off('seek');
      socket.off('sync_state');
      socket.off('new_reaction');
    };
  }, [socket]);

  if (!videoId) {
    return (
      <div className="empty-player-state">
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎬</div>
        <h3 style={{ color: '#f8fafc', margin: '0 0 0.5rem 0' }}>No Video Loaded</h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>
          {canControl 
            ? 'Paste a YouTube link below and click "Load Video" to start watching.' 
            : 'Waiting for the Host to load a video...'}
        </p>
      </div>
    );
  }

  return (
    <div className="player-wrapper">
      <YouTube
        videoId={videoId}
        className="yt-iframe-responsive"
        opts={{
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: canControl ? 1 : 0,
            rel: 0,
            modestbranding: 1,
            disablekb: canControl ? 0 : 1,
            iv_load_policy: 3,
            fs: 1
          }
        }}
        onReady={onReady}
      />

      {/* Floating Reactions Layer */}
      <div className="floating-reactions-layer">
        {reactions.map((r) => (
          <div 
            key={r.id} 
            className="floating-reaction-bubble" 
            style={{ left: `${r.left}%` }}
          >
            <span className="bubble-emoji">{r.emoji}</span>
            <span className="bubble-user">{r.username}</span>
          </div>
        ))}
      </div>
    </div>
  );
}