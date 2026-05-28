import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const githubConnected = searchParams.get('github_connected');
    
    if (githubConnected === 'true') {
      // Show success message and redirect
      setTimeout(() => {
        navigate('/user');
      }, 2000);
    } else {
      // Redirect to user dashboard
      navigate('/user');
    }
  }, [searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #4666a3 0%, #375087 100%)',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>✓</div>
        <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>GitHub Connected!</h1>
        <p style={{ fontSize: '16px', opacity: 0.9 }}>Your GitHub account has been successfully connected.</p>
        <p style={{ fontSize: '14px', marginTop: '20px', opacity: 0.7 }}>Redirecting you back...</p>
        <div style={{ marginTop: '30px', fontSize: '20px' }}>⏳</div>
      </div>
    </div>
  );
};

export default OAuthCallback;
