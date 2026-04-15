
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

  // Profile dropdown state and ref
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

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
      const userObj = { email: data.email, role: data.role };
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
      {/* Header with profile dropdown */}
      {user && (
        <header style={{ height: '100px', background: '#f5f5f5', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <span style={{ fontWeight: '900', fontSize: '2.5rem', letterSpacing: '3px', color: '#222', textTransform: 'uppercase', width: '100%', textAlign: 'center' }}>
            CODE GENERATOR
          </span>
          <span
            style={{
              position: 'absolute',
              right: 32,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '1.5rem',
              color: '#444',
              cursor: 'pointer',
              background: '#e0e0e0',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)'
            }}
            title={user.email}
            onClick={() => setProfileOpen((open) => !open)}
            ref={profileRef}
          >
            👤
            {profileOpen && (
              <div style={{ position: 'absolute', right: 0, top: 50, background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 180, zIndex: 1000 }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #eee', color: '#555' }}>
                  <strong>{user.email}</strong>
                  <div style={{ fontSize: '0.9em', color: '#888' }}>{user.role}</div>
                </div>
                <button onClick={handleLogout} style={{ width: '100%', padding: '0.7rem', border: 'none', background: 'none', color: '#d32f2f', fontWeight: 'bold', cursor: 'pointer', borderRadius: '0 0 6px 6px' }}>Logout</button>
              </div>
            )}
          </span>
        </header>
      )}
      <Routes>
        <Route path="/admin" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
        <Route path="/user" element={<UserDashboard user={user} onLogout={handleLogout} profileOpen={profileOpen} setProfileOpen={setProfileOpen} profileRef={profileRef} onLogout={handleLogout} />} />
        <Route path="/" element={<AuthPage onAuth={handleAuth} />} />
      </Routes>
    </div>
  );
}

export default App;
