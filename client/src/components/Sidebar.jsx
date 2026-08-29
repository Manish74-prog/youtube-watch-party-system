import React, { useState, useEffect, useRef } from 'react';

export default function Sidebar({ participants, currentUserId, isHost, socket, roomId, username }) {
  const [activeTab, setActiveTab] = useState('participants');
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleNewChat = (chat) => {
      setMessages((prev) => [...prev, chat]);
      // If user is not currently looking at the chat tab, trigger unread indicator
      if (activeTab !== 'chat') {
        setHasUnreadChat(true);
      }
    };

    socket.on('new_chat', handleNewChat);
    return () => socket.off('new_chat', handleNewChat);
  }, [socket, activeTab]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'chat') {
      setHasUnreadChat(false);
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    socket.emit('send_chat', { roomId, message: inputMessage, username });
    setInputMessage('');
  };

  const sendReaction = (emoji) => {
    socket.emit('send_reaction', { roomId, emoji, username });
  };

  const handlePromote = (userId) => {
    socket.emit('assign_role', { targetUserId: userId, newRole: 'MODERATOR' });
  };

  const handleDemote = (userId) => {
    socket.emit('assign_role', { targetUserId: userId, newRole: 'PARTICIPANT' });
  };

  const handleTransferHost = (userId) => {
    if (window.confirm('Transfer Host role to this user?')) {
      socket.emit('transfer_host', { targetUserId: userId });
    }
  };

  const handleKick = (userId) => {
    if (window.confirm('Remove this participant from the room?')) {
      socket.emit('remove_participant', { targetUserId: userId });
    }
  };

  return (
    <aside className="sidebar-container">
      {/* Sidebar Tabs */}
      <div className="sidebar-tabs">
        <button 
          className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
          onClick={() => handleTabChange('participants')}
        >
          Participants ({participants.length})
        </button>
        <button 
          className={`tab-btn chat-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => handleTabChange('chat')}
        >
          <span>💬 Live Chat</span>
          {hasUnreadChat && <span className="unread-dot" />}
        </button>
      </div>

      {/* Floating Reaction Bar */}
      <div className="reaction-strip">
        <span className="reaction-title">Reactions:</span>
        <div className="emoji-row">
          {['❤️', '🔥', '😂', '👏', '🎉'].map((emoji) => (
            <button 
              key={emoji} 
              type="button" 
              className="emoji-btn" 
              onClick={() => sendReaction(emoji)}
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Participants Tab */}
      {activeTab === 'participants' && (
        <div className="tab-content participant-list">
          {participants.map((p) => {
            const isSelf = p.userId === currentUserId;
            return (
              <div key={p.userId} className={`participant-card ${isSelf ? 'is-self' : ''}`}>
                <div className="user-row">
                  <div className="user-meta">
                    <span className="user-avatar">{p.username.charAt(0).toUpperCase()}</span>
                    <span className="user-name">
                      {p.username} {isSelf && <span className="you-tag">(You)</span>}
                    </span>
                  </div>
                  <span className={`role-pill pill-${p.role.toLowerCase()}`}>{p.role}</span>
                </div>

                {isHost && !isSelf && (
                  <div className="host-action-bar">
                    {p.role === 'PARTICIPANT' && (
                      <button className="btn-act btn-mod" onClick={() => handlePromote(p.userId)}>
                        + Mod
                      </button>
                    )}
                    {p.role === 'MODERATOR' && (
                      <button className="btn-act btn-demod" onClick={() => handleDemote(p.userId)}>
                        - Demote
                      </button>
                    )}
                    <button className="btn-act btn-host-transfer" onClick={() => handleTransferHost(p.userId)}>
                      👑 Host
                    </button>
                    <button className="btn-act btn-remove" onClick={() => handleKick(p.userId)}>
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Live Chat Tab */}
      {activeTab === 'chat' && (
        <div className="tab-content chat-section">
          <div className="chat-messages">
            {messages.length === 0 ? (
              <p className="no-chat">No messages yet. Say hello!</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`chat-msg ${m.userId === currentUserId ? 'msg-self' : ''}`}>
                  <div className="msg-header">
                    <span className="msg-author">{m.username}</span>
                    <span className="msg-time">{m.time}</span>
                  </div>
                  <div className="msg-body">{m.message}</div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendChat} className="chat-input-bar">
            <input
              type="text"
              placeholder="Send message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </aside>
  );
}