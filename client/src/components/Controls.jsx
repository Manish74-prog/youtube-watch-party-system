import React, { useState } from 'react';

export default function Controls({ socket, userRole, onVideoChange }) {
  const [url, setUrl] = useState('');
  const canControl = userRole === 'HOST' || userRole === 'MODERATOR';

  const extractVideoId = (inputUrl) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = inputUrl.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleLoadVideo = (e) => {
    e.preventDefault();
    const id = extractVideoId(url);
    if (!id) {
      alert('Please enter a valid YouTube link (e.g., https://www.youtube.com/watch?v=...)');
      return;
    }
    onVideoChange(id);
    socket.emit('change_video', { videoId: id });
    setUrl('');
  };

  const handlePlay = () => socket.emit('play');
  const handlePause = () => socket.emit('pause');
  const handleSeek = (offset) => socket.emit('seek', { offset });

  if (!canControl) {
    return (
      <div className="view-only-banner">
        🔒 <strong>View-Only Mode:</strong> Only the Host and Moderators can change videos or control playback.
      </div>
    );
  }

  return (
    <div className="controls-container">
      <form onSubmit={handleLoadVideo} className="url-input-box">
        <input
          type="text"
          placeholder="Paste any YouTube video link (e.g. https://www.youtube.com/watch?v=...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit" className="btn-load">Load Video</button>
      </form>

      <div className="playback-btn-group">
        <button className="btn-ctrl" onClick={handlePlay}>▶ Play</button>
        <button className="btn-ctrl" onClick={handlePause}>⏸ Pause</button>
        <button className="btn-ctrl" onClick={() => handleSeek(-10)}>⏪ -10s</button>
        <button className="btn-ctrl" onClick={() => handleSeek(10)}>⏩ +10s</button>
      </div>
    </div>
  );
}