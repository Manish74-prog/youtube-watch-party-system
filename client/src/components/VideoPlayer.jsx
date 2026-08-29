import React, { useEffect, useRef } from 'react';

export default function VideoPlayer({ videoId, socket }) {
  const playerRef = useRef(null);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    const createPlayer = () => {
      if (!videoId || !window.YT || !window.YT.Player) return;

      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        playerRef.current.loadVideoById(videoId);
        return;
      }

      playerRef.current = new window.YT.Player('party-player-frame', {
        width: '100%',
        height: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            try {
              e.target.playVideo();
            } catch (err) {
              // Ignore autoplay restrictions
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [videoId]);

  // Synchronize playback events on both Host and Participant screens
  useEffect(() => {
    if (!socket) return;

    const handleSyncAction = ({ action, offset }) => {
      const player = playerRef.current;
      if (!player) return;

      try {
        if (action === 'play' && typeof player.playVideo === 'function') {
          player.playVideo();
        } else if (action === 'pause' && typeof player.pauseVideo === 'function') {
          player.pauseVideo();
        } else if (action === 'seek' && typeof player.getCurrentTime === 'function' && typeof player.seekTo === 'function') {
          const currentTime = player.getCurrentTime() || 0;
          player.seekTo(Math.max(0, currentTime + (offset || 0)), true);
        }
      } catch (err) {
        console.warn('Playback sync error:', err);
      }
    };

    socket.on('sync_action', handleSyncAction);

    return () => {
      socket.off('sync_action', handleSyncAction);
    };
  }, [socket]);

  if (!videoId) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '380px',
        background: '#18181b',
        borderRadius: '12px',
        color: '#71717a',
        border: '1px dashed #3f3f46',
      }}>
        <p style={{ fontSize: '18px', fontWeight: '600' }}>No video playing</p>
        <p style={{ fontSize: '14px' }}>The Host can paste a YouTube URL below to start the stream.</p>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      paddingTop: '56.25%',
      background: '#000',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      <div
        id="party-player-frame"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}