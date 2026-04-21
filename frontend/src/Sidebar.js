import React, { useState } from 'react';
import './Sidebar.css';

const Sidebar = ({ user, profileOpen, setProfileOpen, profileRef, onLogout, onNewChat, chats = [], onSelectChat, onDeleteChat }) => {
  const [showChats, setShowChats] = useState(false);

  return (
    <div className="sidebar">
      <ul>
        <li style={{ cursor: 'pointer' }}>
          <span className="sidebar-text" onClick={() => onNewChat()}>Create Application</span>
        </li>
        <li onClick={() => setShowChats(!showChats)} style={{ cursor: 'pointer' }}>
          <span className="sidebar-text">Search chats ({chats.length})</span>
        </li>
      </ul>

      {/* Chat List */}
      {showChats && (
        <div className="sidebar-chat-list">
          {chats.length === 0 ? (
            <div className="sidebar-no-chats">No chats yet. Start by creating an application!</div>
          ) : (
            chats.map((chat) => (
              <div key={chat.id} className="sidebar-chat-item">
                <div 
                  className="sidebar-chat-item-content"
                  onClick={() => onSelectChat(chat.id)}
                  title={chat.title}
                >
                  <div className="sidebar-chat-title">{chat.title}</div>
                  <div className="sidebar-chat-date">
                    {new Date(chat.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button 
                  className="sidebar-chat-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this chat?')) {
                      onDeleteChat(chat.id);
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Profile tab removed as requested */}
    </div>
  );
};

export default Sidebar;
