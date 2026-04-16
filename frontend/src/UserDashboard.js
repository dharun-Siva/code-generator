import React from 'react';
import ChatBot from './ChatBot';
import Sidebar from './Sidebar';
import { useRef, useState, useEffect } from 'react';

const UserDashboard = ({ user, profileOpen, setProfileOpen, profileRef, onLogout }) => {
  const chatBotRef = useRef();
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);

  const API_URL = 'http://localhost:8000';

  // Load user chats on mount
  useEffect(() => {
    if (user && user.id) {
      loadChats();
    }
  }, [user]);

  const loadChats = async () => {
    try {
      const response = await fetch(`${API_URL}/chats/${user.id}`);
      if (response.ok) {
        const chatsData = await response.json();
        setChats(chatsData);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  // Handler to reset chat
  const handleNewChat = () => {
    setCurrentChatId(null);
    if (chatBotRef.current && chatBotRef.current.resetChat) {
      chatBotRef.current.resetChat();
    }
  };

  // Handler to select a chat from sidebar
  const handleSelectChat = async (chatId) => {
    setCurrentChatId(chatId);
    if (chatBotRef.current && chatBotRef.current.loadChatData) {
      await chatBotRef.current.loadChatData(chatId);
    }
  };

  // Handler to delete a chat
  const handleDeleteChat = async (chatId) => {
    try {
      const response = await fetch(
        `${API_URL}/chats/${user.id}/${chatId}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        setChats(chats.filter(c => c.id !== chatId));
        if (currentChatId === chatId) {
          handleNewChat();
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  // Handler when a new chat is saved
  const handleChatSaved = () => {
    loadChats();
  };

  return (
    <div style={{ position: 'relative', minHeight: 'calc(100vh - 72px)', display: 'flex' }}>
      <Sidebar 
        user={user} 
        profileOpen={profileOpen} 
        setProfileOpen={setProfileOpen} 
        profileRef={profileRef} 
        onLogout={onLogout} 
        onNewChat={handleNewChat}
        chats={chats}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
      />
      <div style={{ flex: 1, padding: '2rem', marginLeft: 220 }}>
        <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center' }}>
          <ChatBot 
            ref={chatBotRef} 
            user={user}
            currentChatId={currentChatId}
            onChatSaved={handleChatSaved}
          />
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
