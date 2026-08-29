import React, { useState } from 'react';

export default function Controls({ socket, roomId, canControl, onVideoChange }) {
  const [urlInput, setUrlInput] = useState('');

  const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=[^#&?]*|&v=[^#&?]*)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2] && match[2].length === 11) return match[2];
    if (url.trim().length === 11) return url.trim();
    const vParam = new URLSearchParams(url.split('?')[1] || '').get('v');
    return vParam || url.trim();
  };

  const handleLoadVideo = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const id = extractVideoId(urlInput);
    if (!id) return;

    if (onVideoChange) onVideoChange(id);

    if (socket && roomId) {
      socket.emit('change_video', { roomId, videoId: id });
    }

    setUrlInput('');
  };

  const sendAction = (action, offset = 0) => {
    if (!canControl || !socket || !roomId) return;
    socket.emit('video_action', { roomId, action, offset });
  };

  return (
    <div className="controls-panel" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {canControl ? (
        <>
          <form onSubmit={handleLoadVideo} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid #374151',
                background: '#1f2937',
                color: '#fff',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Load Video
            </button>
          </form>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => sendAction('play')}
              style={{ padding: '8px 18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ▶ Play
            </button>
            <button
              onClick={() => sendAction('pause')}
              style={{ padding: '8px 18px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ⏸ Pause
            </button>
            <button
              onClick={() => sendAction('seek', -10)}
              style={{ padding: '8px 18px', background: '#374151', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ⏪ -10s
            </button>
            <button
              onClick={() => sendAction('seek', 10)}
              style={{ padding: '8px 18px', background: '#374151', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ⏩ +10s
            </button>
          </div>
        </>
      ) : (
        <div style={{ padding: '12px', background: '#1f2937', borderRadius: '6px', color: '#9ca3af', fontSize: '14px', textAlign: 'center', border: '1px solid #374151' }}>
          🔒 <strong>View-Only Mode:</strong> Only the Host and Moderators can control video playback.
        </div>
      )}
    </div>
  );
}