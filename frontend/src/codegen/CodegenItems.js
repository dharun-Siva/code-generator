import React, { useState, useEffect } from 'react';
import './CodegenItems.css';

const CodegenItems = ({ projectId, userId, appName, onBack }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState(null);
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState(null);
  const API_URL = 'http://localhost:8000';

  useEffect(() => {
    if (projectId) {
      fetchCodegenItems();
      checkGitHubConnection();
    }
  }, [projectId]);

  const checkGitHubConnection = async () => {
    try {
      const response = await fetch(`${API_URL}/github/status/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setIsGitHubConnected(data.connected);
        setGithubUsername(data.github_username);
      }
    } catch (error) {
      console.error('Error checking GitHub connection:', error);
    }
  };

  const fetchCodegenItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/project-items/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      const data = await response.json();
      
      // Flatten the grouped data into a list of items
      const itemsList = [];
      if (data.epics) {
        Object.entries(data.epics).forEach(([epicId, epicData]) => {
          // Add epic
          if (epicData.epic) {
            itemsList.push({
              id: epicData.epic.id,
              type: 'epic',
              title: epicData.epic.epic_title,
              epicId: epicData.epic.epic_id,
            });
          }
          
          // Add stories
          if (epicData.stories && epicData.stories.length > 0) {
            epicData.stories.forEach(story => {
              itemsList.push({
                id: story.id,
                type: 'story',
                title: story.story_title,
                epicId: story.epic_id,
                epicTitle: story.epic_title,
              });
            });
          }
        });
      }
      
      setItems(itemsList);
      setError(null);
    } catch (err) {
      console.error('Error fetching codegen items:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeGeneration = () => {
    if (!isGitHubConnected) {
      alert('Please connect your GitHub account first. Click the "Connect GitHub" button in the header.');
      return;
    }
    // Show generation confirmation modal
    setShowGitHubModal(true);
  };

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    setGenerationStatus('Generating code and pushing to GitHub...');

    try {
      const response = await fetch(`${API_URL}/codegen/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          user_id: userId,
          app_name: appName,
          // Note: github_token is optional - backend will use stored token
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate code');
      }

      const result = await response.json();
      setGenerationStatus(`✅ Code generated and pushed to GitHub!\nRepository: ${result.repo_url}`);
      
      setTimeout(() => {
        setShowGitHubModal(false);
        setIsGenerating(false);
        setGenerationStatus(null);
      }, 3000);
    } catch (err) {
      console.error('Error generating code:', err);
      setGenerationStatus(`❌ Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="codegen-items-container">
        <div className="codegen-loading">
          <div className="spinner"></div>
          <p>Loading project items...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="codegen-items-container">
        <div className="codegen-error">
          <div className="error-icon">⚠️</div>
          <h2>Error Loading Items</h2>
          <p>{error}</p>
          <button className="codegen-back-btn" onClick={onBack}>
            ← Back to Applications
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="codegen-items-container">
      <div className="codegen-header">
        <div className="codegen-title-section">
          <h1 className="codegen-title">Code Generation - {appName}</h1>
          <p className="codegen-subtitle">Epics and Stories for Implementation</p>
        </div>
      </div>

      <div className="codegen-action-bar">
        <button 
          className="generate-code-btn" 
          onClick={handleCodeGeneration}
        >
          🚀 Generate Code
        </button>
      </div>

      {items.length === 0 ? (
        <div className="codegen-empty-state">
          <div className="empty-icon">📋</div>
          <h2>No Items Found</h2>
          <p>This project doesn't have any epics or stories yet.</p>
          <p className="empty-hint">Create some in the Story Grooming section to get started.</p>
        </div>
      ) : (
        <div className="codegen-items-list">
          {items.map((item, index) => (
            <div key={item.id} className={`codegen-item ${item.type}`}>
              <div className="item-icon">
                {item.type === 'epic' ? '📚' : '📖'}
              </div>
              <div className="item-content">
                <div className="item-type-badge">{item.type === 'epic' ? 'EPIC' : 'STORY'}</div>
                <h3 className="item-title">{item.title}</h3>
                {item.type === 'story' && (
                  <p className="item-epic-reference">Part of: <strong>{item.epicTitle}</strong></p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="codegen-footer">
        <button className="codegen-back-btn" onClick={onBack}>
          ← Back to Applications
        </button>
      </div>

      {/* GitHub Connection Modal */}
      {showGitHubModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Generate Code & Push to GitHub</h2>
              <button className="modal-close" onClick={() => !isGenerating && setShowGitHubModal(false)}>✕</button>
            </div>
            
            {!generationStatus ? (
              <>
                <div className="modal-body">
                  <p className="modal-description">
                    This will generate a complete React, Python, and PostgreSQL project for <strong>{appName}</strong> and push it to your GitHub account.
                  </p>
                  
                  <div className="form-group">
                    <label>Connected GitHub Account:</label>
                    <div className="github-account-display">
                      <span className="status-indicator">✓</span>
                      <span className="account-name">{githubUsername}</span>
                    </div>
                  </div>

                  <div className="generation-info">
                    <p><strong>Project Structure:</strong></p>
                    <ul>
                      <li>📁 frontend/ - React application</li>
                      <li>📁 microservice/ - Python FastAPI backend</li>
                      <li>📁 ddl/ - PostgreSQL database schemas</li>
                    </ul>
                  </div>
                </div>

                <div className="modal-footer">
                  <button 
                    className="btn-cancel" 
                    onClick={() => setShowGitHubModal(false)}
                    disabled={isGenerating}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-generate" 
                    onClick={handleGenerateCode}
                    disabled={isGenerating}
                  >
                    {isGenerating ? 'Generating...' : 'Generate & Push'}
                  </button>
                </div>
              </>
            ) : (
              <div className="modal-status">
                <div className="status-message">{generationStatus}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CodegenItems;
