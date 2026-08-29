import React from 'react';

export default function VideoPlayer({ videoId }) {
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
        border: '1px dashed #3f3f46'
      }}>
        <p style={{ fontSize: '18px', fontWeight: '600' }}>No video playing</p>
        <p style={{ fontSize: '14px' }}>The Host can paste a YouTube URL below to start the stream.</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px' }}>
      <iframe
        title="YouTube Watch Party"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}