import React, { useState } from 'react';

export default function Sidebar({ participants, currentUserId, isHost, socket, roomId, username }) {
  const [activeTab, setActiveTab] = useState('participants');

  const handleAssignRole = (targetId, targetUsername, role) => {
    if (!socket || !roomId) return;
    socket.emit('assign_role', {
      roomId,
      targetUserId: targetId,
      targetUsername: targetUsername,
      role,
    });
  };

  const handleRemoveUser = (targetId, targetUsername) => {
    if (!socket || !roomId) return;
    if (window.confirm(`Remove ${targetUsername || 'participant'} from the room?`)) {
      socket.emit('remove_participant', {
        roomId,
        targetUserId: targetId,
        targetUsername: targetUsername,
      });
    }
  };

  return (
    <aside className="room-sidebar" style={{ width: '320px', background: '#111827', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #374151', paddingBottom: '12px', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('participants')}
          style={{
            flex: 1,
            padding: '8px',
            background: activeTab === 'participants' ? '#1f2937' : 'transparent',
            color: activeTab === 'participants' ? '#60a5fa' : '#9ca3af',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Participants ({participants.length})
        </button>
      </div>

      {activeTab === 'participants' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {participants.map((p) => {
            const pId = p.socketId || p.userId;
            const isMe = (currentUserId && pId === currentUserId) || p.username === username;
            const isTargetHost = p.role === 'HOST';

            return (
              <div
                key={pId || p.username}
                style={{
                  background: '#1f2937',
                  padding: '12px',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: '#f3f4f6' }}>
                    {p.username} {isMe && <span style={{ color: '#9ca3af', fontSize: '12px' }}>(You)</span>}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      background: isTargetHost ? '#854d0e' : p.role === 'MODERATOR' ? '#1e40af' : '#374151',
                      color: isTargetHost ? '#fef08a' : p.role === 'MODERATOR' ? '#bfdbfe' : '#9ca3af',
                    }}
                  >
                    {p.role || 'PARTICIPANT'}
                  </span>
                </div>

                {isHost && !isMe && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    {p.role !== 'MODERATOR' && (
                      <button
                        onClick={() => handleAssignRole(pId, p.username, 'MODERATOR')}
                        style={{ flex: 1, padding: '5px 8px', fontSize: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        + Mod
                      </button>
                    )}
                    <button
                      onClick={() => handleAssignRole(pId, p.username, 'HOST')}
                      style={{ flex: 1, padding: '5px 8px', fontSize: '12px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      👑 Host
                    </button>
                    <button
                      onClick={() => handleRemoveUser(pId, p.username)}
                      style={{ flex: 1, padding: '5px 8px', fontSize: '12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}