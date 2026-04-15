import React from 'react';
import './Sidebar.css';

const Sidebar = ({ user, profileOpen, setProfileOpen, profileRef, onLogout, onNewChat }) => {
  return (
    <div className="sidebar">
      <ul>
        <li onClick={onNewChat} style={{ cursor: 'pointer' }}>
          <span className="sidebar-icon" role="img" aria-label="New chat">📝</span>
          <span className="sidebar-text">New chat</span>
        </li>
        <li>
          <span className="sidebar-icon" role="img" aria-label="Search chats">🔍</span>
          <span className="sidebar-text">Search chats</span>
        </li>
      </ul>
      {user && (
        <div className="sidebar-profile" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((open) => !open)}
            style={{
              background: 'none',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: 'pointer',
              color: '#333',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              marginTop: 'auto',
              width: '100%',
              padding: '1.2rem 1.5rem',
              justifyContent: 'flex-start',
            }}
            aria-haspopup="true"
            aria-expanded={profileOpen}
          >
            <span style={{fontSize: '2.2rem', marginBottom: 4}} role="img" aria-label="profile">👤</span>
            <span>{user.email}</span>
          </button>
          {profileOpen && (
            <div style={{ position: 'absolute', left: 230, bottom: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 180, zIndex: 10 }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid #eee', color: '#555' }}>
                <strong>{user.email}</strong>
                <div style={{ fontSize: '0.9em', color: '#888' }}>{user.role}</div>
              </div>
              <button onClick={onLogout} style={{ width: '100%', padding: '0.7rem', border: 'none', background: 'none', color: '#d32f2f', fontWeight: 'bold', cursor: 'pointer', borderRadius: '0 0 6px 6px' }}>Logout</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
