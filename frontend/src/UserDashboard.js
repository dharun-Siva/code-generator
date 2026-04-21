import React from 'react';
import ChatBot from './ChatBot';
import Sidebar from './Sidebar';
import { useRef, useState, useEffect } from 'react';

const UserDashboard = ({ user, profileOpen, setProfileOpen, profileRef, onLogout }) => {
  const chatBotRef = useRef();
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showAppNameInput, setShowAppNameInput] = useState(false);
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
      <div style={{ flex: 1, padding: '2rem', marginLeft: 220, minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {showAppNameInput ? (
          <form onSubmit={handleCreateApp} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 400, background: '#fff', padding: 32, borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <label htmlFor="appName" style={{ fontWeight: 600, fontSize: 18, marginBottom: '2em' }}>Enter Application Name</label>
            <input
              id="appName"
              type="text"
              value={appName}
              onChange={e => setAppName(e.target.value)}
              placeholder="Application name"
              autoFocus
              style={{ width: '100%', padding: 8, fontSize: 16, marginBottom: '2em', border: '1px solid #ccc', borderRadius: 4 }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" style={{ fontSize: 16, padding: '6px 18px' }}>Create</button>
              <button type="button" style={{ fontSize: 16, padding: '6px 18px' }} onClick={() => { setShowAppNameInput(false); setAppName(""); }}>Cancel</button>
              <button type="button" style={{ fontSize: 16, padding: '6px 18px' }} onClick={() => { setShowAppNameInput(false); setShowOpenList(true); setSearchTerm(""); }}>Open</button>
            </div>
          </form>
        ) : showOpenList ? (
          <div style={{ width: 400, background: '#fff', padding: 32, borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {searchTerm === "" ? (
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center', marginBottom: '2em' }}>
                <span style={{ fontWeight: 600, fontSize: 18 }}>Select Application to Open</span>
                <button
                  style={{ background: 'none', border: 'none', marginLeft: 10, cursor: 'pointer', fontSize: 20 }}
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
                style={{ width: '100%', padding: 8, fontSize: 16, marginBottom: '2em', border: '1px solid #ccc', borderRadius: 4 }}
                onBlur={() => { if (searchTerm.trim() === "") setSearchTerm(""); }}
              />
            )}
            <div style={{ width: '100%', maxHeight: 200, overflowY: 'auto', marginBottom: '2em' }}>
              {chats.filter(chat => chat.title.toLowerCase().includes(searchTerm.trim().toLowerCase())).length === 0 ? (
                <div style={{ color: '#888', textAlign: 'center' }}>No applications found.</div>
              ) : (
                chats
                  .filter(chat => chat.title.toLowerCase().includes(searchTerm.trim().toLowerCase()))
                  .map(chat => (
                    <div
                      key={chat.id}
                      style={{ padding: '10px 0', borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: 16 }}
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
            <button type="button" style={{ fontSize: 16, padding: '6px 18px' }} onClick={() => { setShowOpenList(false); setSearchTerm(""); }}>Cancel</button>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            <ChatBot 
              ref={chatBotRef} 
              user={user}
              currentChatId={currentChatId}
              onChatSaved={handleChatSaved}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
