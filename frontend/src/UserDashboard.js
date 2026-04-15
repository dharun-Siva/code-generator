import React from 'react';
import ChatBot from './ChatBot';
import Sidebar from './Sidebar';
import { useRef, useState } from 'react';

const UserDashboard = ({ user, profileOpen, setProfileOpen, profileRef, onLogout }) => {
  const chatBotRef = useRef();
  // Handler to reset chat
  const handleNewChat = () => {
    if (chatBotRef.current && chatBotRef.current.resetChat) {
      chatBotRef.current.resetChat();
    }
  };
  return (
    <div style={{ position: 'relative', minHeight: 'calc(100vh - 72px)', display: 'flex' }}>
      <Sidebar user={user} profileOpen={profileOpen} setProfileOpen={setProfileOpen} profileRef={profileRef} onLogout={onLogout} onNewChat={handleNewChat} />
      <div style={{ flex: 1, padding: '2rem', marginLeft: 220 }}>
        <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center' }}>
          <ChatBot ref={chatBotRef} />
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
