import React from 'react';
import ChatBot from './ChatBot';
import Sidebar from './Sidebar';
import { useRef, useState, useEffect } from 'react';
import './UserDashboard.css';

const UserDashboard = ({ user, profileOpen, setProfileOpen, profileRef, onLogout }) => {
  const chatBotRef = useRef();
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [showAppNameInput, setShowAppNameInput] = useState(false);
  const [showApplicationsDashboard, setShowApplicationsDashboard] = useState(true);
  const [showAppDashboard, setShowAppDashboard] = useState(false);
  const [appName, setAppName] = useState("");
  const [showOpenList, setShowOpenList] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dashboardSearchTerm, setDashboardSearchTerm] = useState("");
  const [showDashboardDialog, setShowDashboardDialog] = useState(false);

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
  // Handler to show applications dashboard
  const handleNewChat = () => {
    setShowApplicationsDashboard(true);
    setShowAppNameInput(false);
    setShowOpenList(false);
    setCurrentChatId(null);
    setAppName("");
    setShowDashboardDialog(false);
    setShowAppDashboard(false);
    setSelectedAppId(null);
  };

  // Handler to show dashboard
  const handleDashboard = () => {
    setShowApplicationsDashboard(false);
    setShowAppNameInput(false);
    setShowOpenList(false);
    setCurrentChatId(null);
    setShowDashboardDialog(true);
  };

  // Handler to open creation form from dashboard
  const handleCreateNewApp = () => {
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
        setShowAppNameInput(false);
        setShowApplicationsDashboard(true);
        setAppName("");
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  // Handler to select a chat from sidebar
  const handleSelectChat = (chatId) => {
    setShowAppNameInput(false);
    setShowOpenList(false);
    setShowApplicationsDashboard(false);
    setSelectedAppId(chatId);
    setShowAppDashboard(true);
  };

  // Handler to open chat for a specific workflow
  const handleOpenWorkflow = (chatId, workflowType) => {
    setCurrentChatId(chatId);
    setShowAppDashboard(false);
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
        onDashboard={handleDashboard}
      />
      <div style={{ flex: 1, padding: '2rem', marginLeft: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>
        {showDashboardDialog ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: 'calc(100vh - 200px)'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '3rem',
              maxWidth: '700px',
              width: '100%',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.5rem'
              }}>
                <div style={{
                  padding: '2rem',
                  border: '2px solid #3f51b5',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: '#f5f7ff'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(63, 81, 181, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  <div style={{
                    fontSize: '32px',
                    marginBottom: '1rem'
                  }}>📖</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#3f51b5', fontSize: '18px', fontWeight: '600' }}>Story Grooming</h3>
                  <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Prepare and refine stories</p>
                </div>
                
                <div style={{
                  padding: '2rem',
                  border: '2px solid #3f51b5',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: '#f5f7ff'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(63, 81, 181, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  <div style={{
                    fontSize: '32px',
                    marginBottom: '1rem'
                  }}>💻</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#3f51b5', fontSize: '18px', fontWeight: '600' }}>Codegen / Implementation</h3>
                  <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Generate and implement code</p>
                </div>
              </div>
            </div>
          </div>
        ) : showAppDashboard && selectedAppId ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: 'calc(100vh - 200px)'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '3rem',
              maxWidth: '700px',
              width: '100%',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                marginBottom: '2rem'
              }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#333' }}>{chats.find(c => c.id === selectedAppId)?.title || 'Application'}</h2>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.5rem'
              }}>
                <div style={{
                  padding: '2rem',
                  border: '2px solid #3f51b5',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: '#f5f7ff'
                }}
                onClick={() => handleOpenWorkflow(selectedAppId, 'grooming')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(63, 81, 181, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  <div style={{
                    fontSize: '32px',
                    marginBottom: '1rem'
                  }}>📖</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#3f51b5', fontSize: '18px', fontWeight: '600' }}>Story Grooming</h3>
                  <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Prepare and refine stories</p>
                </div>
                
                <div style={{
                  padding: '2rem',
                  border: '2px solid #3f51b5',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: '#f5f7ff'
                }}
                onClick={() => handleOpenWorkflow(selectedAppId, 'codegen')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(63, 81, 181, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  <div style={{
                    fontSize: '32px',
                    marginBottom: '1rem'
                  }}>💻</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#3f51b5', fontSize: '18px', fontWeight: '600' }}>Codegen / Implementation</h3>
                  <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Generate and implement code</p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setShowAppDashboard(false);
                  setShowApplicationsDashboard(true);
                  setSelectedAppId(null);
                }}
                style={{
                  width: '100%',
                  marginTop: '2rem',
                  padding: '0.75rem',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#666',
                  fontWeight: '500'
                }}
              >
                Back
              </button>
            </div>
          </div>
        ) : showApplicationsDashboard && !currentChatId ? (
          <div className="apps-dashboard-container">
            <div className="apps-dashboard-header">
              <div className="apps-header-left">
                <h1 className="apps-dashboard-title">Your Applications</h1>
                <p className="apps-dashboard-subtitle">Manage and access your applications</p>
              </div>
              <div className="apps-header-right">
                <div className="apps-header-search">
                  <svg className="apps-search-icon-header" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                  <input
                    type="text"
                    value={dashboardSearchTerm}
                    onChange={e => setDashboardSearchTerm(e.target.value)}
                    placeholder="Search applications..."
                    className="apps-search-input-header"
                  />
                  {dashboardSearchTerm && (
                    <button
                      className="apps-search-clear-header"
                      onClick={() => setDashboardSearchTerm("")}
                      type="button"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button 
                  className="apps-create-btn-header"
                  onClick={handleCreateNewApp}
                >
                  + Create New App
                </button>
              </div>
            </div>
            
            <div className="apps-dashboard-content">
              <div className="apps-list-section">
                <div className="apps-list-info">
                  <p className="apps-count">{chats.filter(chat => chat.title.toLowerCase().includes(dashboardSearchTerm.toLowerCase())).length} application{chats.filter(chat => chat.title.toLowerCase().includes(dashboardSearchTerm.toLowerCase())).length !== 1 ? 's' : ''} found</p>
                </div>
                
                {chats.length === 0 ? (
                  <div className="apps-empty-state">
                    <div className="apps-empty-icon">📁</div>
                    <p className="apps-empty-text">No applications yet. Create your first one!</p>
                  </div>
                ) : chats.filter(chat => chat.title.toLowerCase().includes(dashboardSearchTerm.toLowerCase())).length === 0 ? (
                  <div className="apps-empty-state">
                    <div className="apps-empty-icon">🔍</div>
                    <p className="apps-empty-text">No applications found matching your search.</p>
                  </div>
                ) : (
                  <div className="apps-table-wrapper">
                    <table className="apps-table">
                      <thead>
                        <tr>
                          <th>App Name</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chats.filter(chat => chat.title.toLowerCase().includes(dashboardSearchTerm.toLowerCase())).map((chat) => (
                          <tr key={chat.id}>
                            <td className="app-name-cell">{chat.title}</td>
                            <td className="app-date-cell">
                              {new Date(chat.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </td>
                            <td className="app-actions-cell">
                              <button 
                                className="apps-action-btn apps-open-btn"
                                onClick={() => handleSelectChat(chat.id)}
                              >
                                Open
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : showOpenList ? (
          <div className="app-open-list-container">
            <div className="app-search-container">
              <div className="app-search-header">
                <span className="app-open-list-title">Select Application to Open</span>
              </div>
              <div className="app-search-wrapper">
                <svg className="app-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search applications..."
                  autoFocus
                  className="app-search-input-advanced"
                  onFocus={() => setSearchTerm(searchTerm || " ")}
                  onBlur={() => { if (searchTerm.trim() === "") setSearchTerm(""); }}
                />
                {searchTerm.trim() !== "" && (
                  <button
                    className="app-search-clear"
                    onClick={() => setSearchTerm("")}
                    type="button"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
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
            <button type="button" className="app-form-btn-secondary" onClick={() => { setShowOpenList(false); setShowApplicationsDashboard(true); setSearchTerm(""); }}>Cancel</button>
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
          <div className="apps-dashboard-container">
            <div className="apps-dashboard-header">
              <h1 className="apps-dashboard-title">Your Applications</h1>
              <p className="apps-dashboard-subtitle">Manage and access your applications</p>
            </div>
            
            <div className="apps-dashboard-content">
              <div className="apps-list-section">
                <div className="apps-list-info">
                  <p className="apps-count">{chats.length} application{chats.length !== 1 ? 's' : ''} found</p>
                </div>
                
                {chats.length === 0 ? (
                  <div className="apps-empty-state">
                    <div className="apps-empty-icon">📁</div>
                    <p className="apps-empty-text">No applications yet. Create your first one!</p>
                  </div>
                ) : (
                  <div className="apps-table-wrapper">
                    <table className="apps-table">
                      <thead>
                        <tr>
                          <th>App Name</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chats.map((chat) => (
                          <tr key={chat.id}>
                            <td className="app-name-cell">{chat.title}</td>
                            <td className="app-date-cell">
                              {new Date(chat.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </td>
                            <td className="app-actions-cell">
                              <button 
                                className="apps-action-btn apps-open-btn"
                                onClick={() => handleSelectChat(chat.id)}
                              >
                                Open
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            
            <div className="apps-dashboard-footer">
              <button 
                className="apps-create-btn"
                onClick={handleCreateNewApp}
              >
                + Create New App
              </button>
            </div>
          </div>
        )}
        
        {showAppNameInput && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <form onSubmit={handleCreateApp} className="app-form-container" style={{ margin: 0 }}>
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
                <button type="button" className="app-form-btn-secondary" onClick={() => { setShowAppNameInput(false); setShowApplicationsDashboard(true); setAppName(""); }}>Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
