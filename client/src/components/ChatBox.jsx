import React, { useState, useEffect, useRef } from 'react';

export default function ChatBox({ roomId, username, socket }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_chat', (chat) => {
      setMessages((prev) => [...prev, chat]);
    });

    return () => socket.off('new_chat');
  }, [socket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    socket.emit('send_chat', {
      roomId,
      message: inputMessage,
      username
    });
    setInputMessage('');
  };

  const sendReaction = (emoji) => {
    socket.emit('send_reaction', { roomId, emoji, username });
  };

  return (
    <div className="chat-container">
      <div className="reaction-bar">
        {['❤️', '🔥', '😂', '👏', '🎉'].map((emoji) => (
          <button 
            key={emoji} 
            type="button" 
            className="btn-reaction" 
            onClick={() => sendReaction(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="empty-chat">No messages yet. Say hello!</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`chat-bubble ${m.userId === socket.id ? 'self' : ''}`}>
              <div className="chat-meta">
                <span className="chat-user">{m.username}</span>
                <span className="chat-time">{m.time}</span>
              </div>
              <p className="chat-text">{m.message}</p>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSend} className="chat-input-form">
        <input
          type="text"
          placeholder="Send a message..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}