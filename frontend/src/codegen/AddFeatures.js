import React, { useState, useEffect } from 'react';
import './AddFeatures.css';

const AddFeatures = ({ projectId, userId, appName, allStories, generatedStoryIds, onBack, onGenerate }) => {
  const [activeTab, setActiveTab] = useState('planned'); // 'planned' or 'custom'
  const [featureType, setFeatureType] = useState('fullstack'); // 'frontend', 'backend', 'fullstack'
  const [selectedStories, setSelectedStories] = useState([]);
  const [customFeatureDescription, setCustomFeatureDescription] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState(null);
  const [showGitHubUrlDialog, setShowGitHubUrlDialog] = useState(false);
  const [githubUrlInput, setGithubUrlInput] = useState('');
  const [githubUrlError, setGithubUrlError] = useState(null);
  const API_URL = 'http://localhost:8000';

  // Get available stories (not already generated)
  const availableStories = allStories.filter(story => 
    !generatedStoryIds.includes(story.id)
  );

  const handleStoryToggle = (storyId) => {
    setSelectedStories(prev => 
      prev.includes(storyId) 
        ? prev.filter(id => id !== storyId)
        : [...prev, storyId]
    );
  };

  const handleSelectAllStories = () => {
    if (selectedStories.length === availableStories.length) {
      setSelectedStories([]);
    } else {
      setSelectedStories(availableStories.map(s => s.id));
    }
  };

  const handleGeneratePreview = async () => {
    if (activeTab === 'planned' && selectedStories.length === 0) {
      alert('Please select at least one story');
      return;
    }
    
    if (activeTab === 'custom' && !customFeatureDescription.trim()) {
      alert('Please describe the feature you want to add');
      return;
    }

    setLoadingPreview(true);
    setPreviewError(null);

    try {
      const payload = {
        project_id: projectId,
        type: activeTab,
        feature_type: featureType, // Add feature type to payload
      };

      if (activeTab === 'planned') {
        payload.story_ids = selectedStories;
      } else {
        payload.custom_description = customFeatureDescription;
      }

      const response = await fetch(`${API_URL}/codegen/preview-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const data = await response.json();
      setPreviewData(data);
    } catch (err) {
      console.error('Error generating preview:', err);
      setPreviewError(err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmGenerate = async () => {
    if (!previewData) return;

    setIsGenerating(true);
    setGenerationStatus('🚀 Generating and pushing updates to GitHub...');

    try {
      const payload = {
        project_id: projectId,
        user_id: userId,
        type: activeTab,
        feature_type: featureType, // Add feature type to payload
      };

      if (activeTab === 'planned') {
        payload.story_ids = selectedStories;
      } else {
        payload.custom_description = customFeatureDescription;
      }

      const response = await fetch(`${API_URL}/codegen/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Parse response first
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        throw new Error('Failed to parse response from server');
      }

      // Check if request failed
      if (!response.ok) {
        // Check if it's specifically a GitHub URL error
        const errorDetail = responseData.detail || responseData.message || 'Unknown error';
        
        console.log('Response status:', response.status);
        console.log('Error detail:', errorDetail);
        
        // Check for GitHub URL error in the message regardless of status code
        const isGitHubUrlError = errorDetail.includes('GitHub repository URL') || errorDetail.includes('github_url');
        console.log('Is GitHub URL error?', isGitHubUrlError);
        
        if (isGitHubUrlError) {
          // Show GitHub URL dialog instead of error
          console.log('Showing GitHub URL dialog');
          setIsGenerating(false);
          setGenerationStatus(null);
          // Keep previewData so we can retry after setting URL
          setShowGitHubUrlDialog(true);
          setGithubUrlError(null);
          return;
        }
        
        // For other errors, throw normally
        throw new Error(errorDetail);
      }

      // Success case
      const result = responseData;
      setGenerationStatus(
        `✅ Success!\n\n📝 Generated:\n` +
        `• ${result.components_added} components\n` +
        `• ${result.endpoints_added} endpoints\n` +
        `• ${result.migrations_added} database migrations\n\n` +
        `🚀 Pushed to: ${result.github_url}`
      );

      setTimeout(() => {
        onGenerate({ success: true, ...result });
      }, 2000);
    } catch (err) {
      console.error('Error generating update:', err);
      setGenerationStatus(`❌ Error: ${err.message}`);
      setIsGenerating(false);
    }
  };

  const handleSetGitHubUrl = async () => {
    if (!githubUrlInput.trim()) {
      setGithubUrlError('Please enter a GitHub repository URL');
      return;
    }

    try {
      // Validate that it looks like a GitHub URL
      if (!githubUrlInput.includes('github.com')) {
        setGithubUrlError('Please enter a valid GitHub repository URL (must contain github.com)');
        return;
      }

      console.log('Setting GitHub URL:', githubUrlInput);
      
      const response = await fetch(`${API_URL}/codegen/set-github-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          github_url: githubUrlInput.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to set GitHub URL');
      }

      console.log('GitHub URL set successfully');
      setShowGitHubUrlDialog(false);
      setGithubUrlInput('');
      setGithubUrlError(null);
      
      // Wait a moment then retry generation
      setTimeout(() => {
        handleConfirmGenerate();
      }, 500);
    } catch (err) {
      console.error('Error setting GitHub URL:', err);
      setGithubUrlError(err.message);
    }
  };

  // Group stories by epic
  const groupedStories = {};
  availableStories.forEach(story => {
    if (!groupedStories[story.epicId]) {
      groupedStories[story.epicId] = {
        epicTitle: story.epicTitle,
        stories: []
      };
    }
    groupedStories[story.epicId].stories.push(story);
  });

  if (previewData) {
    return (
      <div className="add-features-container">
        <div className="add-features-header">
          <h2>Preview: {activeTab === 'planned' ? 'Planned Stories' : 'Custom Feature'}</h2>
          <p className="add-features-subtitle">Review what will be generated</p>
        </div>

        <div className="preview-content">
          {!generationStatus ? (
            <>
              <div className="preview-section">
                <h3>📱 Components to Add</h3>
                <div className="preview-list">
                  {previewData.components?.map((comp, idx) => (
                    <div key={idx} className="preview-item">
                      <span className="preview-icon">⚛️</span>
                      <div>
                        <div className="preview-item-title">{comp.name}</div>
                        <div className="preview-item-desc">{comp.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="preview-section">
                <h3>🔌 Endpoints to Add</h3>
                <div className="preview-list">
                  {previewData.endpoints?.map((endpoint, idx) => (
                    <div key={idx} className="preview-item">
                      <span className="preview-icon">🔗</span>
                      <div>
                        <div className="preview-item-title">{endpoint.method} {endpoint.path}</div>
                        <div className="preview-item-desc">{endpoint.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="preview-section">
                <h3>🗄️ Database Tables to Add</h3>
                <div className="preview-list">
                  {previewData.tables?.map((table, idx) => (
                    <div key={idx} className="preview-item">
                      <span className="preview-icon">📋</span>
                      <div>
                        <div className="preview-item-title">{table.name}</div>
                        <div className="preview-item-desc">{table.columns?.join(', ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="preview-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setPreviewData(null)}
                  disabled={isGenerating}
                >
                  ← Back to Options
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleConfirmGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? '⏳ Generating...' : '✅ Generate & Push Updates'}
                </button>
              </div>
            </>
          ) : (
            <div className="generation-status-display">
              <div className="status-spinner"></div>
              <pre className="status-message">{generationStatus}</pre>
            </div>
          )}
        </div>

        {showGitHubUrlDialog && (
          <div className="modal-overlay" onClick={() => setShowGitHubUrlDialog(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Enter GitHub Repository URL</h2>
              </div>
              <div className="modal-body">
                <p>This project doesn't have a GitHub repository URL stored yet.</p>
                <p>Please provide the GitHub repository URL where your initial project was generated:</p>
                
                <input
                  type="text"
                  className="github-url-input"
                  placeholder="e.g., https://github.com/username/student-management-system-generated"
                  value={githubUrlInput}
                  onChange={(e) => {
                    setGithubUrlInput(e.target.value);
                    setGithubUrlError(null);
                  }}
                  autoFocus
                />
                
                {githubUrlError && (
                  <div className="error-message" style={{ marginTop: '0.5rem' }}>
                    {githubUrlError}
                  </div>
                )}
                
                <p style={{ fontSize: '12px', color: '#666', marginTop: '0.5rem' }}>
                  💡 Tip: Find this in your GitHub account or check the initial generation response.
                </p>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowGitHubUrlDialog(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleSetGitHubUrl}
                >
                  Save & Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="add-features-container">
      <div className="add-features-header">
        <h2>Add Features to {appName}</h2>
        <p className="add-features-subtitle">Choose how to add new functionality</p>
      </div>

      <div className="add-features-tabs">
        <button
          className={`add-features-tab ${activeTab === 'planned' ? 'active' : ''}`}
          onClick={() => setActiveTab('planned')}
        >
          📋 Add Planned Stories
        </button>
        <button
          className={`add-features-tab ${activeTab === 'custom' ? 'active' : ''}`}
          onClick={() => setActiveTab('custom')}
        >
          ✨ Add Custom Feature
        </button>
      </div>

      <div className="feature-type-selector">
        <label className="feature-type-label">What type of feature are you adding?</label>
        <div className="feature-type-options">
          <label className="feature-type-option">
            <input
              type="radio"
              name="featureType"
              value="frontend"
              checked={featureType === 'frontend'}
              onChange={(e) => setFeatureType(e.target.value)}
            />
            <span className="option-title">🎨 Frontend Only</span>
            <span className="option-desc">Just UI components (no backend or database)</span>
          </label>
          
          <label className="feature-type-option">
            <input
              type="radio"
              name="featureType"
              value="backend"
              checked={featureType === 'backend'}
              onChange={(e) => setFeatureType(e.target.value)}
            />
            <span className="option-title">⚙️ Backend Only</span>
            <span className="option-desc">Just API endpoints (no UI components)</span>
          </label>
          
          <label className="feature-type-option">
            <input
              type="radio"
              name="featureType"
              value="fullstack"
              checked={featureType === 'fullstack'}
              onChange={(e) => setFeatureType(e.target.value)}
            />
            <span className="option-title">🚀 Full Stack</span>
            <span className="option-desc">Components + endpoints + database</span>
          </label>
        </div>
      </div>

      {activeTab === 'planned' ? (
        <div className="add-features-content">
          <div className="stories-info">
            <div className="info-badge info-generated">
              ✓ Already Generated: {generatedStoryIds.length} stories
            </div>
            <div className="info-badge info-available">
              + Available to Add: {availableStories.length} stories
            </div>
          </div>

          {availableStories.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎉</div>
              <p>All stories have been generated! Consider adding a custom feature.</p>
            </div>
          ) : (
            <>
              <div className="stories-selection">
                <div className="select-all-section">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedStories.length === availableStories.length && availableStories.length > 0}
                      onChange={handleSelectAllStories}
                    />
                    <span>Select All Available Stories</span>
                  </label>
                </div>

                {Object.entries(groupedStories).map(([epicId, epicData]) => (
                  <div key={epicId} className="epic-group">
                    <h4 className="epic-title">📚 {epicData.epicTitle}</h4>
                    <div className="stories-list">
                      {epicData.stories.map(story => (
                        <label key={story.id} className="story-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedStories.includes(story.id)}
                            onChange={() => handleStoryToggle(story.id)}
                          />
                          <span className="story-name">{story.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="selected-count">
                {selectedStories.length > 0 && (
                  <span>✓ {selectedStories.length} story{selectedStories.length !== 1 ? 'ies' : ''} selected</span>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="add-features-content">
          <div className="custom-feature-input-section">
            <label htmlFor="featureDesc" className="input-label">
              Describe the feature you want to add:
            </label>
            <textarea
              id="featureDesc"
              className="feature-textarea"
              value={customFeatureDescription}
              onChange={(e) => setCustomFeatureDescription(e.target.value)}
              placeholder="Example: Add real-time chat notifications with WebSocket support, email alerts, and notification history..."
              rows="6"
            />
            <p className="input-hint">
              💡 The more detailed your description, the better the generated code will be. Include specific features, technologies, and requirements.
            </p>
          </div>
        </div>
      )}

      <div className="add-features-actions">
        <button
          className="btn btn-secondary"
          onClick={onBack}
        >
          ← Back
        </button>
        <button
          className="btn btn-primary"
          onClick={handleGeneratePreview}
          disabled={
            loadingPreview || 
            (activeTab === 'planned' && selectedStories.length === 0) ||
            (activeTab === 'custom' && !customFeatureDescription.trim())
          }
        >
          {loadingPreview ? '⏳ Generating Preview...' : '👁️ Preview Generation'}
        </button>
      </div>

      {previewError && (
        <div className="error-message">
          ⚠️ {previewError}
        </div>
      )}

      {showGitHubUrlDialog && (
        <div className="modal-overlay" onClick={() => setShowGitHubUrlDialog(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Enter GitHub Repository URL</h2>
            </div>
            <div className="modal-body">
              <p>This project doesn't have a GitHub repository URL stored yet.</p>
              <p>Please provide the GitHub repository URL where your initial project was generated:</p>
              
              <input
                type="text"
                className="github-url-input"
                placeholder="e.g., https://github.com/username/student-management-system-generated"
                value={githubUrlInput}
                onChange={(e) => {
                  setGithubUrlInput(e.target.value);
                  setGithubUrlError(null);
                }}
                autoFocus
              />
              
              {githubUrlError && (
                <div className="error-message" style={{ marginTop: '0.5rem' }}>
                  {githubUrlError}
                </div>
              )}
              
              <p style={{ fontSize: '12px', color: '#666', marginTop: '0.5rem' }}>
                💡 Tip: Find this in your GitHub account or check the initial generation response.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowGitHubUrlDialog(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSetGitHubUrl}
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddFeatures;
