import React, { useState, useEffect } from 'react';
import './GitHubConnect.css';

const GitHubConnect = ({ user }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const API_URL = 'http://localhost:8000';

  // Check GitHub connection status when component mounts or user changes
  useEffect(() => {
    if (user && user.id) {
      checkGitHubStatus();
    }
  }, [user]);

  // Check if user has GitHub connected
  const checkGitHubStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/github/status/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
        setGithubUsername(data.github_username);
      }
    } catch (error) {
      console.error('Error checking GitHub status:', error);
    }
  };

  // Handle Connect GitHub button click
  const handleConnectGitHub = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/github/login?user_id=${user.id}`);
      const data = await response.json();
      
      if (data.auth_url) {
        // Redirect to GitHub OAuth
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error('Error initiating GitHub login:', error);
      alert('Failed to connect GitHub');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Disconnect GitHub
  const handleDisconnect = async () => {
    try {
      const response = await fetch(`${API_URL}/github/disconnect/${user.id}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setIsConnected(false);
        setGithubUsername(null);
        setShowMenu(false);
        alert('GitHub disconnected successfully');
      }
    } catch (error) {
      console.error('Error disconnecting GitHub:', error);
      alert('Failed to disconnect GitHub');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="github-connect-container">
      {isConnected ? (
        <div className="github-connected-menu">
          <button 
            className="github-connected-btn"
            onClick={() => setShowMenu(!showMenu)}
            title={`Connected as ${githubUsername}`}
          >
            <span className="github-icon">✓</span>
            <span className="github-username">{githubUsername}</span>
          </button>
          
          {showMenu && (
            <div className="github-dropdown-menu">
              <div className="dropdown-item connected-status">
                <span className="status-dot"></span>
                Connected as <strong>{githubUsername}</strong>
              </div>
              <hr />
              <button 
                className="dropdown-item disconnect-btn"
                onClick={handleDisconnect}
              >
                Disconnect GitHub
              </button>
            </div>
          )}
        </div>
      ) : (
        <button 
          className="github-connect-btn"
          onClick={handleConnectGitHub}
          disabled={isLoading}
        >
          <span className="github-icon">⚙️</span>
          {isLoading ? 'Connecting...' : 'Connect GitHub'}
        </button>
      )}
    </div>
  );
};

export default GitHubConnect;
