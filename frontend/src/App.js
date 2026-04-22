
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
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
                  style={{ position: 'absolute', right: 0, top: 60, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)', minWidth: 240, zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                  onMouseDown={e => e.stopPropagation()}
                >
                  <div style={{ padding: '1.2rem', borderBottom: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #4666a3 0%, #375087 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '0.8rem' }}>👤</div>
                    <span style={{ fontWeight: 600, color: '#2c3e50', fontSize: '0.95rem', wordBreak: 'break-all' }}>{user.email}</span>
                    <span style={{ fontSize: '0.85em', color: '#7f8c8d', marginTop: 4 }}>Role: <strong>{user.role}</strong></span>
                  </div>
                  <button onClick={handleLogout} style={{ width: '100%', padding: '0.9rem 1.2rem', border: 'none', background: 'none', color: '#d32f2f', fontWeight: '600', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s ease', fontSize: '0.95rem' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(211, 47, 47, 0.08)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>🚪 Logout</button>
                </div>
              )}
            </div>
          </header>
          <div style={{ marginTop: '100px' }}>
            <Routes>
              <Route path="/admin" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
              <Route path="/user" element={<UserDashboard user={user} onLogout={handleLogout} profileOpen={sidebarProfileOpen} setProfileOpen={setSidebarProfileOpen} profileRef={sidebarProfileRef} />} />
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
