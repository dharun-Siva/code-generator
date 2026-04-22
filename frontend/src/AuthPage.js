import React, { useState } from 'react';
import './AuthPage.css';

const AuthPage = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Pass credentials and role to parent for handling
    onAuth({ email, password, role, isLogin });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: '1rem' }}>
      <form className="auth-form" onSubmit={handleSubmit} style={{ minWidth: 400, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: '2.5rem', maxWidth: 500, backdropFilter: 'blur(10px)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 28, fontSize: '1.8rem', fontWeight: '700', color: '#2c3e50', letterSpacing: '-0.5px' }}>{isLogin ? '🔐 Login' : '✨ Sign Up'}</h2>
        <div className="floating-label-group">
          <input
            type="email"
            id="auth-email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="floating-input"
            autoComplete="username"
          />
          <label htmlFor="auth-email" className={email ? 'floating-label filled' : 'floating-label'}>Email</label>
        </div>
        <div className="floating-label-group">
          <input
            type="password"
            id="auth-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="floating-input"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
          <label htmlFor="auth-password" className={password ? 'floating-label filled' : 'floating-label'}>Password</label>
        </div>
        {isLogin && (
          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <span style={{ color: '#7f8c8d', fontSize: '0.9rem', cursor: 'not-allowed', fontWeight: '500' }}>Forgot password?</span>
          </div>
        )}
        {!isLogin && (
          <div className="role-select" style={{ marginBottom: 20, padding: '1rem', background: '#f8f9fa', borderRadius: '10px', display: 'flex', gap: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500', color: '#2c3e50' }}>
              <input type="radio" value="admin" checked={role === 'admin'} onChange={() => setRole('admin')} style={{ cursor: 'pointer' }} /> Admin
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500', color: '#2c3e50' }}>
              <input type="radio" value="user" checked={role === 'user'} onChange={() => setRole('user')} style={{ cursor: 'pointer' }} /> User
            </label>
          </div>
        )}
        <button type="submit" style={{ width: '100%', background: 'linear-gradient(135deg, #4666a3 0%, #375087 100%)', color: '#fff', fontWeight: '600', border: 'none', borderRadius: 10, padding: '1rem', marginTop: 16, marginBottom: 16, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', boxShadow: '0 4px 12px rgba(70, 102, 163, 0.2)', letterSpacing: '0.5px' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(70, 102, 163, 0.3)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(70, 102, 163, 0.2)'; }}>{isLogin ? 'Login' : 'Sign Up'}</button>
        <div style={{ textAlign: 'center', fontSize: '0.95rem', color: '#2c3e50' }}>
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <span style={{ color: '#4666a3', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'} onClick={() => setIsLogin(false)}>Sign Up</span>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <span style={{ color: '#4666a3', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'} onClick={() => setIsLogin(true)}>Login</span>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default AuthPage;
