import React from 'react';

export default function ParticipantList({ participants, currentUserId, isHost, socket }) {
  const handlePromote = (userId) => {
    socket.emit('assign_role', { targetUserId: userId, newRole: 'MODERATOR' });
  };

  const handleDemote = (userId) => {
    socket.emit('assign_role', { targetUserId: userId, newRole: 'PARTICIPANT' });
  };

  const handleKick = (userId) => {
    if (window.confirm('Are you sure you want to remove this participant?')) {
      socket.emit('remove_participant', { targetUserId: userId });
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'HOST':
        return <span className="role-pill pill-host">Host</span>;
      case 'MODERATOR':
        return <span className="role-pill pill-mod">Moderator</span>;
      default:
        return <span className="role-pill pill-part">Participant</span>;
    }
  };
  const handleTransferHost = (userId) => {
  if (window.confirm('Are you sure you want to make this user the Host?')) {
    socket.emit('transfer_host', { targetUserId: userId });
  }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Participants</h3>
        <span className="participant-count">{participants.length}</span>
      </div>

      <div className="participant-list">
        {participants.map((p) => {
          const isSelf = p.userId === currentUserId;

          return (
            <div key={p.userId} className={`participant-card ${isSelf ? 'is-self' : ''}`}>
              <div className="participant-info">
                <div className="user-details">
                  <span className="user-avatar">{p.username.charAt(0).toUpperCase()}</span>
                  <span className="user-name">
                    {p.username} {isSelf && <small className="you-label">(You)</small>}
                  </span>
                </div>
                {getRoleBadge(p.role)}
              </div>

              {isHost && !isSelf && (
                <div className="action-row">
                  {p.role === 'PARTICIPANT' && (
                    <button 
                      className="btn-action btn-mod" 
                      onClick={() => handlePromote(p.userId)}
                    >
                      + Make Mod
                    </button>
                  )}
                  {p.role === 'MODERATOR' && (
                    <button 
                      className="btn-action btn-demod" 
                      onClick={() => handleDemote(p.userId)}
                    >
                      - Demote
                    </button>
                  )}
                  <button 
                    className="btn-action btn-remove" 
                    onClick={() => handleKick(p.userId)}
                  >
                    Remove
                  </button>

                  // Add button in the JSX action-row (isHost && !isSelf):
                  <button 
                    className="btn-action btn-host-transfer" 
                    onClick={() => handleTransferHost(p.userId)}
                    >
                    👑 Make Host
                  </button>

                  
                </div>

              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}