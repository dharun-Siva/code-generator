import React, { useState, useEffect } from 'react';
import AddFeatures from './AddFeatures';
import './CodegenItems.css';

const CodegenItems = ({ projectId, userId, appName, selectedStoryIds, analysisData, onBack }) => {
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState(null);
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState(null);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('microservices');
  const [activeStoryIds, setActiveStoryIds] = useState(selectedStoryIds || []);
  const [loadedAnalysisData, setLoadedAnalysisData] = useState(analysisData || null);
  const [showMode, setShowMode] = useState('initial'); // 'initial', 'addFeatures', 'preview'
  const [generatedStoryIds, setGeneratedStoryIds] = useState([]);
  const API_URL = 'http://localhost:8000';

  useEffect(() => {
    if (projectId) {
      console.log('CodegenItems received selectedStoryIds:', selectedStoryIds);
      
      // If no selectedStoryIds provided, try to fetch locked analysis
      if (!selectedStoryIds || selectedStoryIds.length === 0) {
        fetchLockedAnalysis();
      } else {
        // Use the provided selectedStoryIds
        setActiveStoryIds(selectedStoryIds);
        setGeneratedStoryIds(selectedStoryIds);
        fetchCodegenItems(selectedStoryIds);
      }
      
      checkGitHubConnection();
      fetchAllItems();
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

  const fetchAllItems = async () => {
    try {
      const response = await fetch(`${API_URL}/project-items/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      const data = await response.json();
      
      const itemsList = [];
      if (data.epics) {
        Object.entries(data.epics).forEach(([epicId, epicData]) => {
          if (epicData.stories && epicData.stories.length > 0) {
            epicData.stories.forEach(story => {
              itemsList.push({
                id: story.id,
                type: 'story',
                title: story.story_title,
                epicId: story.epic_id,
                epicTitle: epicData.epic?.epic_title || 'Unknown Epic',
              });
            });
          }
        });
      }
      setAllItems(itemsList);
    } catch (err) {
      console.error('Error fetching all items:', err);
    }
  };

  // Fetch locked analysis if opening CodegenItems directly
  const fetchLockedAnalysis = async () => {
    try {
      console.log('Fetching locked analysis for project:', projectId);
      const response = await fetch(`${API_URL}/analysis-results/${projectId}?user_id=${userId}`);
      if (response.ok) {
        const analyses = await response.json();
        
        if (analyses.length > 0) {
          const latestAnalysis = analyses[0];
          console.log('Found locked analysis:', latestAnalysis);
          
          // Fetch full analysis details
          const detailResponse = await fetch(
            `${API_URL}/analysis-results/${projectId}/${latestAnalysis.id}?user_id=${userId}`
          );
          
          if (detailResponse.ok) {
            const fullAnalysis = await detailResponse.json();
            console.log('Loaded full analysis with story IDs:', fullAnalysis.selected_story_ids);
            
            // Set the story IDs and analysis data
            setActiveStoryIds(fullAnalysis.selected_story_ids || []);
            setLoadedAnalysisData({
              microservice_analysis: fullAnalysis.microservice_analysis,
              frontend_analysis: fullAnalysis.frontend_analysis,
              database_analysis: fullAnalysis.database_analysis
            });
            
            // Now fetch items with these story IDs
            fetchCodegenItems(fullAnalysis.selected_story_ids);
          }
        } else {
          // No analysis found
          console.log('No locked analysis found');
          setActiveStoryIds([]);
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Error fetching locked analysis:', err);
      setActiveStoryIds([]);
      setLoading(false);
    }
  };

  const fetchCodegenItems = async (storyIds = null) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/project-items/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      const data = await response.json();
      
      // Use provided storyIds or activeStoryIds
      const storiesToUse = storyIds || activeStoryIds;
      
      // Show only selected stories
      const itemsList = [];
      
      // Convert storiesToUse to a Set for fast lookup
      // Handle both numeric and string IDs
      const selectedSet = new Set();
      if (storiesToUse && storiesToUse.length > 0) {
        storiesToUse.forEach(id => {
          selectedSet.add(Number(id));
          selectedSet.add(String(id));
        });
      }
      
      console.log('Selected Story IDs:', storiesToUse);
      console.log('Story IDs to match:', selectedSet);
      
      if (data.epics) {
        Object.entries(data.epics).forEach(([epicId, epicData]) => {
          if (epicData.stories && epicData.stories.length > 0) {
            epicData.stories.forEach(story => {
              // Check if story matches any of the selected IDs
              const storyNum = Number(story.story_id);
              const storyStr = String(story.story_id);
              
              const isSelected = selectedSet.has(storyNum) || 
                                selectedSet.has(storyStr) || 
                                selectedSet.has(story.id) ||
                                selectedSet.has(String(story.id));
              
              console.log(`Story ${story.story_id} (id: ${story.id}) - Selected: ${isSelected}`);
              
              if (isSelected) {
                itemsList.push({
                  id: story.id,
                  type: 'story',
                  title: story.story_title,
                  epicId: story.epic_id,
                  epicTitle: epicData.epic?.epic_title || 'Unknown Epic',
                  selected: true
                });
              }
            });
          }
        });
      }
      
      console.log('Final items count:', itemsList.length);
      console.log('Final items:', itemsList);
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
      const payload = {
        project_id: projectId,
        user_id: userId,
        app_name: appName,
        // Note: github_token is optional - backend will use stored token
      };
      
      // Add story_ids if they were selected
      if (selectedStoryIds && selectedStoryIds.length > 0) {
        payload.story_ids = selectedStoryIds;
      }
      
      // Add analysis results if available
      if (loadedAnalysisData) {
        payload.analysis_results = loadedAnalysisData;
      }
      
      const response = await fetch(`${API_URL}/codegen/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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

  // Show AddFeatures component if user clicked "Add Features"
  if (showMode === 'addFeatures') {
    return (
      <AddFeatures
        projectId={projectId}
        userId={userId}
        appName={appName}
        allStories={allItems}
        generatedStoryIds={generatedStoryIds}
        onBack={() => setShowMode('initial')}
        onGenerate={(result) => {
          if (result.success) {
            // Update generated story IDs
            if (result.story_ids) {
              setGeneratedStoryIds([...generatedStoryIds, ...result.story_ids]);
            } else {
              // For custom features, just increment
              setGeneratedStoryIds([...generatedStoryIds, Date.now()]);
            }
            
            // Show success message and return to initial
            setTimeout(() => {
              setShowMode('initial');
            }, 2000);
          }
        }}
      />
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
      {showMode === 'initial' ? (
        // Initial Mode - Show two main action buttons
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '1rem', color: '#333' }}>
            {appName}
          </h1>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '3rem' }}>
            Manage code generation and updates for your project
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            maxWidth: '700px',
            margin: '0 auto'
          }}>
            {/* Initial Generation */}
            <div style={{
              padding: '2rem',
              border: '2px solid #667eea',
              borderRadius: '8px',
              backgroundColor: '#f5f7ff',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => setShowMode('preview')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(102, 126, 234, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>✓</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#667eea', fontSize: '18px', fontWeight: '600' }}>
                Initial Generation
              </h3>
              <p style={{ margin: '0.5rem 0 1rem 0', color: '#666', fontSize: '13px' }}>
                {generatedStoryIds.length} stories generated
              </p>
              <div style={{ marginTop: '1rem', fontSize: '12px', color: '#999', lineHeight: '1.6' }}>
                <div>✓ Code generated</div>
                <div>✓ Pushed to GitHub</div>
                <div>✓ Repository ready</div>
              </div>
            </div>

            {/* Add Features */}
            <div style={{
              padding: '2rem',
              border: '2px solid #764ba2',
              borderRadius: '8px',
              backgroundColor: '#faf7ff',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => setShowMode('addFeatures')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(118, 75, 162, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>+</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#764ba2', fontSize: '18px', fontWeight: '600' }}>
                Add Features
              </h3>
              <p style={{ margin: '0.5rem 0 1rem 0', color: '#666', fontSize: '13px' }}>
                {Math.max(0, allItems.length - generatedStoryIds.length)} available
              </p>
              <div style={{ marginTop: '1rem', fontSize: '12px', color: '#999', lineHeight: '1.6' }}>
                <div>📋 Select planned stories</div>
                <div>✨ Or add custom feature</div>
                <div>🚀 Push to GitHub</div>
              </div>
            </div>
          </div>

          <button
            onClick={onBack}
            style={{
              marginTop: '3rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#666',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          >
            ← Back
          </button>
        </div>
      ) : (
        // Preview Mode - Show generated stories
        <>
          <div className="codegen-header">
            <div className="codegen-title-section">
              <h1 className="codegen-title">Code Generation - {appName}</h1>
              <p className="codegen-subtitle">Selected Stories for Implementation</p>
            </div>
          </div>

          <div className="codegen-action-bar">
            {(selectedStoryIds?.length ?? 0) > 0 && (
              <div style={{
                flex: 1,
                padding: '0.5rem 1rem',
                backgroundColor: '#e3f2fd',
                borderRadius: '4px',
                marginRight: '1rem',
                fontSize: '14px',
                color: '#1976d2'
              }}>
                📌 <strong>{selectedStoryIds.length}</strong> stories selected for code generation
              </div>
            )}
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
              <h2>No Selected Stories</h2>
              <p>Please go back and select some stories for code generation.</p>
            </div>
          ) : (
            <div className="codegen-items-list">
              {items.map((item, index) => (
                <div key={item.id} className={`codegen-item story selected`}>
                  <div className="item-icon">
                    📖
                  </div>
                  <div className="item-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 className="item-title">{item.title}</h3>
                      <span style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        ✓ Selected
                      </span>
                    </div>
                    <p className="item-epic-reference">Epic: <strong>{item.epicTitle}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="codegen-footer">
            <button className="codegen-back-btn" onClick={() => setShowMode('initial')}>
              ← Back
            </button>
          </div>
        </>
      )}

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
