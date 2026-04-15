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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafbfc' }}>
      <form className="auth-form" onSubmit={handleSubmit} style={{ minWidth: 320, background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: '2rem', maxWidth: 350 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>{isLogin ? 'Login' : 'Sign Up'}</h2>
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
          <div style={{ textAlign: 'right', marginBottom: 16 }}>
            <span style={{ color: '#888', fontSize: '0.95em', cursor: 'not-allowed' }}>Forgot password?</span>
          </div>
        )}
        {!isLogin && (
          <div className="role-select" style={{ marginBottom: 16 }}>
            <label style={{ marginRight: 16 }}>
              <input type="radio" value="admin" checked={role === 'admin'} onChange={() => setRole('admin')} /> Admin
            </label>
            <label>
              <input type="radio" value="user" checked={role === 'user'} onChange={() => setRole('user')} /> User
            </label>
          </div>
        )}
        <button type="submit" style={{ width: '100%', background: '#0074d9', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: 6, padding: '0.8em', marginTop: 8, marginBottom: 12, fontSize: '1.1em', cursor: 'pointer' }}>{isLogin ? 'Login' : 'Sign Up'}</button>
        <div style={{ textAlign: 'center', fontSize: '0.98em' }}>
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <span style={{ color: '#0074d9', cursor: 'pointer', fontWeight: 500 }} onClick={() => setIsLogin(false)}>Signup</span>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <span style={{ color: '#0074d9', cursor: 'pointer', fontWeight: 500 }} onClick={() => setIsLogin(true)}>Login</span>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default AuthPage;
