
import { Routes, Route, useNavigate, Link, Navigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import UserDashboard from './UserDashboard';
import Sidebar from './Sidebar';
import React, { useState, useRef, useEffect } from 'react';
import AuthPage from './AuthPage';
import './App.css';



function App() {
  const navigate = useNavigate();
  // Load user from localStorage if available
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  // Header profile dropdown state and ref
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Sidebar profile dropdown state and ref
  const [sidebarProfileOpen, setSidebarProfileOpen] = useState(false);
  const sidebarProfileRef = useRef(null);

  // Profile stats
  const [profileStats, setProfileStats] = useState({ projects: 0, joinedDate: 'N/A' });

  // Settings modal state
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Close dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  // Fetch profile stats when profile is opened
  useEffect(() => {
    if (!profileOpen || !user || !user.id) return;
    
    const fetchStats = async () => {
      try {
        const response = await fetch(`http://localhost:8000/chats/${user.id}`);
        if (response.ok) {
          const chatsData = await response.json();
          const projectCount = user.role === 'admin' ? 'Unlimited' : chatsData.length;
          const joinedDate = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          setProfileStats({
            projects: projectCount,
            joinedDate: joinedDate
          });
        }
      } catch (error) {
        console.error('Error fetching profile stats:', error);
      }
    };
    
    fetchStats();
  }, [profileOpen, user]);

  // Logout handler
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setProfileOpen(false);
    navigate('/');
  };

  // Handle login/signup
  const handleAuth = async ({ email, password, role, isLogin }) => {
    try {
      let url = isLogin ? 'http://localhost:8000/login' : 'http://localhost:8000/signup';
      let payload = isLogin
        ? { email, password }
        : { email, password, role };
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.detail || 'Authentication failed');
        return;
      }
      const data = await response.json();
      const userObj = { id: data.id, email: data.email, role: data.role };
      setUser(userObj);
      localStorage.setItem('user', JSON.stringify(userObj));
      if (data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'All fields are required' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        setPasswordMessage({ type: 'error', text: errorData.detail || 'Failed to change password' });
        return;
      }

      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
      setTimeout(() => {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setSettingsOpen(false);
        setPasswordMessage({ type: '', text: '' });
      }, 2000);
    } catch (err) {
      setPasswordMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  return (
    <div className="App">
      {user ? (
        <>
          {/* Header with profile dropdown */}
          <header style={{ height: '100px', background: 'linear-gradient(135deg, #4666a3 0%, #375087 100%)', boxShadow: '0 4px 16px rgba(70, 102, 163, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000 }}>
            <span style={{ fontWeight: '900', fontSize: '2.5rem', letterSpacing: '3px', color: '#fff', textTransform: 'uppercase', width: '100%', textAlign: 'center' }}>
              CODE GENERATOR
            </span>
            <div style={{ position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1100, cursor: 'pointer' }}>
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.25)',
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
                  e.currentTarget.style.border = '2px solid rgba(255, 255, 255, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.border = '2px solid rgba(255, 255, 255, 0.4)';
                }}
              >
                <span>👤</span>
              </div>
              <span
                style={{
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  maxWidth: 160,
                  textAlign: 'left',
                  wordBreak: 'break-all',
                  transition: 'opacity 0.2s ease'
                }}
                title={user.email}
                onClick={() => setProfileOpen((open) => !open)}
                ref={profileRef}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {user.email}
              </span>
              {/* Dropdown remains unchanged */}
              {profileOpen && (
                <div
                  style={{ 
                    position: 'absolute', 
                    right: 0, 
                    top: 60, 
                    background: '#fff', 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 16, 
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)', 
                    minWidth: 320, 
                    zIndex: 1000, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    overflow: 'hidden',
                    animation: 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseDown={e => e.stopPropagation()}
                >
                  {/* Header Background */}
                  <div style={{
                    background: 'linear-gradient(135deg, #4666a3 0%, #375087 100%)',
                    height: '80px',
                    position: 'relative'
                  }}></div>
                  
                  {/* Profile Info */}
                  <div style={{ 
                    padding: '1.5rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    textAlign: 'center',
                    marginTop: '-40px',
                    position: 'relative',
                    zIndex: 10
                  }}>
                    {/* Avatar */}
                    <div style={{ 
                      width: '80px', 
                      height: '80px', 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #4666a3 0%, #375087 100%)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '2rem',
                      marginBottom: '0.8rem',
                      border: '4px solid #fff',
                      boxShadow: '0 4px 12px rgba(70, 102, 163, 0.3)',
                      position: 'relative'
                    }}>
                      👤
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        right: '0',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: '#4ade80',
                        border: '3px solid #fff',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
                      }}></div>
                    </div>
                    
                    {/* User Info */}
                    <span style={{ 
                      fontWeight: 700, 
                      color: '#1a202c', 
                      fontSize: '1.1rem', 
                      wordBreak: 'break-all',
                      marginBottom: '0.3rem'
                    }}>
                      {user.email}
                    </span>
                    <div style={{
                      display: 'inline-flex',
                      gap: '0.5rem',
                      alignItems: 'center',
                      marginTop: '0.5rem',
                      padding: '0.5rem 0.8rem',
                      background: 'linear-gradient(135deg, rgba(70, 102, 163, 0.1) 0%, rgba(55, 80, 135, 0.1) 100%)',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}>
                      <span style={{ color: '#4666a3', fontWeight: 600 }}>
                        {user.role === 'admin' ? '👑' : '⭐'}
                      </span>
                      <span style={{ color: '#4666a3', fontWeight: 600, textTransform: 'capitalize' }}>
                        {user.role} Account
                      </span>
                    </div>
                  </div>
                  
                  {/* Divider */}
                  <div style={{ height: '1px', background: '#f0f0f0' }}></div>
                  
                  {/* Account Stats */}
                  <div style={{
                    padding: '1rem 1.5rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '1rem'
                  }}>
                    <div style={{
                      padding: '0.8rem',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4666a3' }}>
                        {profileStats.projects}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#7f8c8d', marginTop: '0.3rem', fontWeight: 500 }}>
                        Projects
                      </div>
                    </div>
                  </div>
                  
                  {/* Divider */}
                  <div style={{ height: '1px', background: '#f0f0f0' }}></div>
                  
                  {/* Action Buttons */}
                  <div style={{
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}>
                    <button 
                      onClick={() => setSettingsMenuOpen(true)}
                      style={{ 
                        padding: '0.8rem 1rem', 
                        border: 'none', 
                        background: 'linear-gradient(135deg, #4666a3 0%, #375087 100%)',
                        color: '#fff', 
                        fontWeight: '700', 
                        cursor: 'pointer', 
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(70, 102, 163, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      ⚙️ Settings
                    </button>
                    <button 
                      onClick={handleLogout}
                      style={{ 
                        padding: '0.8rem 1rem', 
                        border: 'none', 
                        background: '#fef2f2',
                        color: '#dc2626', 
                        fontWeight: '600', 
                        cursor: 'pointer', 
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fee2e2';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fef2f2';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      🚪 Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Settings Menu Dropdown - Left side */}
          {settingsMenuOpen && (
            <>
              {/* Backdrop to close menu on click outside */}
              <div 
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 1900
                }}
                onClick={() => setSettingsMenuOpen(false)}
              />
              
              {/* Settings Container - Left of Settings button */}
              <div style={{
                position: 'fixed',
                top: '420px',
                right: '340px',
                background: '#fff',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                minWidth: '260px',
                zIndex: 2000,
                animation: 'slideDown 0.2s ease',
                overflow: 'hidden'
              }}>
                {/* Menu Items */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <button
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      setSettingsOpen(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.9rem 1.2rem',
                      border: 'none',
                      background: '#fff',
                      color: '#4666a3',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '0.95rem',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.8rem',
                      borderBottom: '1px solid #f0f0f0'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff';
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>🔐</span>
                    Change Password
                  </button>

                  <button
                    onClick={() => {
                      // Dummy upgrade button - no action for now
                    }}
                    style={{
                      width: '100%',
                      padding: '0.9rem 1.2rem',
                      border: 'none',
                      background: '#fff',
                      color: '#4666a3',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '0.95rem',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.8rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff';
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>⭐</span>
                    Upgrade
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Settings Modal - Change Password */}
          {settingsOpen && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              backdropFilter: 'blur(4px)',
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{
                background: '#fff',
                borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                padding: '2rem',
                width: '90%',
                maxWidth: '420px',
                animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <h2 style={{
                    margin: 0,
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: '#1a202c'
                  }}>
                    Change Password
                  </h2>
                  <button 
                    onClick={() => {
                      setSettingsOpen(false);
                      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setPasswordMessage({ type: '', text: '' });
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      color: '#7f8c8d'
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handlePasswordChange}>
                  {/* Current Password */}
                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: 600,
                      color: '#4666a3',
                      fontSize: '0.9rem'
                    }}>
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      placeholder="Enter current password"
                      style={{
                        width: '100%',
                        padding: '0.8rem',
                        border: '2px solid #e0e4e9',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#4666a3'}
                      onBlur={(e) => e.target.style.borderColor = '#e0e4e9'}
                    />
                  </div>

                  {/* New Password */}
                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: 600,
                      color: '#4666a3',
                      fontSize: '0.9rem'
                    }}>
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      placeholder="Enter new password (min 6 characters)"
                      style={{
                        width: '100%',
                        padding: '0.8rem',
                        border: '2px solid #e0e4e9',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#4666a3'}
                      onBlur={(e) => e.target.style.borderColor = '#e0e4e9'}
                    />
                  </div>

                  {/* Confirm Password */}
                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: 600,
                      color: '#4666a3',
                      fontSize: '0.9rem'
                    }}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      placeholder="Confirm new password"
                      style={{
                        width: '100%',
                        padding: '0.8rem',
                        border: '2px solid #e0e4e9',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#4666a3'}
                      onBlur={(e) => e.target.style.borderColor = '#e0e4e9'}
                    />
                  </div>

                  {/* Message */}
                  {passwordMessage.text && (
                    <div style={{
                      padding: '0.8rem',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      background: passwordMessage.type === 'error' ? '#fee2e2' : '#dcfce7',
                      color: passwordMessage.type === 'error' ? '#dc2626' : '#16a34a',
                      border: `1px solid ${passwordMessage.type === 'error' ? '#fca5a5' : '#86efac'}`
                    }}>
                      {passwordMessage.type === 'error' ? '❌' : '✅'} {passwordMessage.text}
                    </div>
                  )}

                  {/* Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsOpen(false);
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setPasswordMessage({ type: '', text: '' });
                      }}
                      style={{
                        padding: '0.8rem 1.5rem',
                        border: '2px solid #e0e4e9',
                        background: '#fff',
                        color: '#4666a3',
                        fontWeight: 600,
                        cursor: 'pointer',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        fontSize: '0.9rem'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f0f4ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fff';
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '0.8rem 1.5rem',
                        border: 'none',
                        background: 'linear-gradient(135deg, #4666a3 0%, #375087 100%)',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        fontSize: '0.9rem'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(70, 102, 163, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      Change Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div style={{ marginTop: '100px' }}>
            <Routes>
              <Route path="/admin" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
              <Route path="/user" element={<UserDashboard user={user} onLogout={handleLogout} profileOpen={sidebarProfileOpen} setProfileOpen={setSidebarProfileOpen} profileRef={sidebarProfileRef} />} />
              <Route path="/" element={<Navigate to="/user" />} />
            </Routes>
          </div>
        </>
      ) : (
        <Routes>
          <Route path="/" element={<AuthPage onAuth={handleAuth} />} />
        </Routes>
      )}
    </div>
  );
}

export default App;
