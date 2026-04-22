import React from 'react';
import ChatBot from './ChatBot';
import Sidebar from './Sidebar';
import { useRef, useState, useEffect } from 'react';
import './UserDashboard.css';

const UserDashboard = ({ user, profileOpen, setProfileOpen, profileRef, onLogout }) => {
  const chatBotRef = useRef();
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showAppNameInput, setShowAppNameInput] = useState(true);
  const [appName, setAppName] = useState("");
  const [showOpenList, setShowOpenList] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

  // Handler to create a new chat with application name
  // Handler to show app name input
  const handleNewChat = () => {
    setShowAppNameInput(true);
    setAppName("");
  };

  // Handler to actually create the chat after name is entered
  const handleCreateApp = async (e) => {
    e.preventDefault();
    if (!appName.trim() || !user || !user.id) return;
    try {
      const response = await fetch(`${API_URL}/chats?user_id=${user.id}&title=${encodeURIComponent(appName.trim())}`, { method: 'POST' });
      if (response.ok) {
        const newChat = await response.json();
        setChats([newChat, ...chats]);
        setCurrentChatId(newChat.id);
        setShowAppNameInput(false);
        setAppName("");
        // Reset and load the new chat in ChatBot
        if (chatBotRef.current && chatBotRef.current.loadChatData) {
          await chatBotRef.current.loadChatData(newChat.id);
        }
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  // Handler to select a chat from sidebar
  const handleSelectChat = (chatId) => {
    setShowAppNameInput(false);
    setShowOpenList(false);
    setCurrentChatId(null);
    setTimeout(() => setCurrentChatId(chatId), 0);
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
    <div style={{ position: 'relative', display: 'flex', width: '100%', minHeight: 'calc(100vh - 100px)' }}>
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
      <div style={{ flex: 1, padding: '2rem', marginLeft: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {showAppNameInput ? (
          <form onSubmit={handleCreateApp} className="app-form-container">
            <div style={{ width: '100%' }}>
              <div className="app-form-heading">Enter Application Name</div>
              <div className="floating-label-group" style={{ width: '100%', marginBottom: '2em' }}>
                <input
                  id="appName"
                  type="text"
                  value={appName}
                  onChange={e => setAppName(e.target.value)}
                  className="floating-input"
                  autoFocus
                  style={{ marginBottom: 0 }}
                  required
                />
                <label htmlFor="appName" className={appName ? 'floating-label filled' : 'floating-label'}>Application name</label>
              </div>
            </div>
            <div className="app-form-button-group">
              <button type="submit" className="app-form-btn-primary">Create</button>
              <button type="button" className="app-form-btn-secondary" onClick={() => { setShowAppNameInput(false); setAppName(""); }}>Cancel</button>
              <button type="button" className="app-form-btn-secondary" onClick={() => { setShowAppNameInput(false); setShowOpenList(true); setSearchTerm(""); }}>Open</button>
            </div>
          </form>
        ) : showOpenList ? (
          <div className="app-open-list-container">
            {searchTerm === "" ? (
              <div className="app-open-list-header">
                <span className="app-open-list-title">Select Application to Open</span>
                <button
                  className="app-search-btn"
                  title="Search"
                  onClick={() => setSearchTerm(" ")}
                >
                  🔍
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search applications..."
                autoFocus
                className="app-search-input"
                onBlur={() => { if (searchTerm.trim() === "") setSearchTerm(""); }}
              />
            )}
            <div className="app-chat-list">
              {chats.filter(chat => chat.title.toLowerCase().includes(searchTerm.trim().toLowerCase())).length === 0 ? (
                <div className="app-no-results">No applications found.</div>
              ) : (
                chats
                  .filter(chat => chat.title.toLowerCase().includes(searchTerm.trim().toLowerCase()))
                  .map(chat => (
                    <div
                      key={chat.id}
                      className="app-chat-item"
                      onClick={() => {
                        setShowOpenList(false);
                        setSearchTerm("");
                        handleSelectChat(chat.id);
                      }}
                    >
                      {chat.title}
                    </div>
                  ))
              )}
            </div>
            <button type="button" className="app-form-btn-secondary" onClick={() => { setShowOpenList(false); setShowAppNameInput(true); setSearchTerm(""); }}>Cancel</button>
          </div>
        ) : currentChatId ? (
          <div style={{ width: '100%' }}>
            <ChatBot 
              ref={chatBotRef} 
              user={user}
              currentChatId={currentChatId}
              onChatSaved={handleChatSaved}
            />
          </div>
        ) : (
          <form onSubmit={handleCreateApp} className="app-form-container">
            <div style={{ width: '100%' }}>
              <div className="app-form-heading">Enter Application Name</div>
              <div className="floating-label-group" style={{ width: '100%', marginBottom: '2em' }}>
                <input
                  id="appName"
                  type="text"
                  value={appName}
                  onChange={e => setAppName(e.target.value)}
                  className="floating-input"
                  autoFocus
                  style={{ marginBottom: 0 }}
                  required
                />
                <label htmlFor="appName" className={appName ? 'floating-label filled' : 'floating-label'}>Application name</label>
              </div>
            </div>
            <div className="app-form-button-group">
              <button type="submit" className="app-form-btn-primary">Create</button>
              <button type="button" className="app-form-btn-secondary" onClick={() => { setAppName(""); }}>Cancel</button>
              <button type="button" className="app-form-btn-secondary" onClick={() => { setShowOpenList(true); setSearchTerm(""); }}>Open</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
