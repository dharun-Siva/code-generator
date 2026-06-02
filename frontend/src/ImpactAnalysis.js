import React, { useState, useEffect } from 'react';
import './ImpactAnalysis.css';

const ImpactAnalysis = ({ projectId, userId, appName, onBack, onGenerateCode }) => {
  const [stories, setStories] = useState({});
  const [microserviceAnalysis, setMicroserviceAnalysis] = useState(null);
  const [frontendAnalysis, setFrontendAnalysis] = useState(null);
  const [databaseAnalysis, setDatabaseAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedEpics, setExpandedEpics] = useState({});
  const [activeTab, setActiveTab] = useState('stories');
  const [selectedStories, setSelectedStories] = useState({});
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisPerformed, setAnalysisPerformed] = useState(false);
  
  // Save Analysis State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [analysisName, setAnalysisName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState([]);
  const [showSavedAnalysesList, setShowSavedAnalysesList] = useState(false);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  
  // Locked Analysis State
  const [isAnalysisLocked, setIsAnalysisLocked] = useState(false);
  const [lockedAnalysisId, setLockedAnalysisId] = useState(null);
  const [lockedAnalysisName, setLockedAnalysisName] = useState(null);

  const API_URL = 'http://localhost:8000';

  useEffect(() => {
    if (projectId && userId) {
      fetchProjectItems();
    }
  }, [projectId, userId]);

  // Check for saved analysis after stories are loaded
  useEffect(() => {
    if (stories.epics && Object.keys(stories.epics).length > 0 && projectId && userId && !isAnalysisLocked) {
      checkForSavedAnalysis();
    }
  }, [stories.epics]);

  const fetchProjectItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/project-items/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setStories(data);
      } else {
        setError('Failed to load project items');
      }
    } catch (err) {
      console.error('Error fetching project items:', err);
      setError('Error loading project items');
    } finally {
      setLoading(false);
    }
  };

  // Check if this project already has a saved analysis
  const checkForSavedAnalysis = async () => {
    try {
      const response = await fetch(`${API_URL}/analysis-results/${projectId}?user_id=${userId}`);
      if (response.ok) {
        const analyses = await response.json();
        
        // If there's at least one saved analysis, lock the interface and load it
        if (analyses.length > 0) {
          const latestAnalysis = analyses[0]; // Get the most recent one
          
          // Load the full analysis data
          const detailResponse = await fetch(
            `${API_URL}/analysis-results/${projectId}/${latestAnalysis.id}?user_id=${userId}`
          );
          
          if (detailResponse.ok) {
            const fullAnalysis = await detailResponse.json();
            
            // Load the analysis data
            setMicroserviceAnalysis(fullAnalysis.microservice_analysis);
            setFrontendAnalysis(fullAnalysis.frontend_analysis);
            setDatabaseAnalysis(fullAnalysis.database_analysis);
            
            // Restore selected stories - build a mapping of storyId -> epic ID from stories state
            const newSelectedStories = {};
            if (fullAnalysis.selected_story_ids && stories.epics) {
              const storyIdToEpic = {};
              
              // Build reverse mapping of story ID to epic ID
              Object.entries(stories.epics).forEach(([epicId, epicData]) => {
                if (epicData.stories && Array.isArray(epicData.stories)) {
                  epicData.stories.forEach(story => {
                    storyIdToEpic[story.story_id] = epicId;
                  });
                }
              });
              
              // Now restore selected stories using the mapping
              fullAnalysis.selected_story_ids.forEach(storyId => {
                const epicId = storyIdToEpic[storyId];
                if (epicId) {
                  newSelectedStories[`${epicId}-${storyId}`] = true;
                }
              });
            }
            setSelectedStories(newSelectedStories);
            
            // Lock the analysis
            setAnalysisPerformed(true);
            setIsAnalysisLocked(true);
            setLockedAnalysisId(latestAnalysis.id);
            setLockedAnalysisName(latestAnalysis.analysis_name);
          }
        }
      }
    } catch (err) {
      console.error('Error checking for saved analysis:', err);
    }
  };

  const fetchMicroserviceAnalysis = async (projectId, storyIds = null) => {
    try {
      const url = storyIds && storyIds.length > 0 
        ? `${API_URL}/microservice-analysis/${projectId}?story_ids=${storyIds.join(',')}`
        : `${API_URL}/microservice-analysis/${projectId}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMicroserviceAnalysis(data);
      }
    } catch (err) {
      console.error('Error fetching microservice analysis:', err);
    }
  };

  const fetchFrontendAnalysis = async (projectId, storyIds = null) => {
    try {
      const url = storyIds && storyIds.length > 0 
        ? `${API_URL}/frontend-analysis/${projectId}?story_ids=${storyIds.join(',')}`
        : `${API_URL}/frontend-analysis/${projectId}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setFrontendAnalysis(data);
      }
    } catch (err) {
      console.error('Error fetching frontend analysis:', err);
    }
  };

  const fetchDatabaseAnalysis = async (projectId, storyIds = null) => {
    try {
      const url = storyIds && storyIds.length > 0 
        ? `${API_URL}/database-analysis/${projectId}?story_ids=${storyIds.join(',')}`
        : `${API_URL}/database-analysis/${projectId}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setDatabaseAnalysis(data);
      }
    } catch (err) {
      console.error('Error fetching database analysis:', err);
    }
  };

  const toggleEpicExpand = (epicId) => {
    setExpandedEpics(prev => ({
      ...prev,
      [epicId]: !prev[epicId]
    }));
  };

  const toggleStorySelection = (epicId, storyId) => {
    const key = `${epicId}-${storyId}`;
    setSelectedStories(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleAnalyse = async () => {
    // Extract selected story IDs
    const selectedStoryIds = Object.keys(selectedStories)
      .filter(key => selectedStories[key])
      .map(key => {
        const [epicId, storyId] = key.split('-');
        return parseInt(storyId);
      });

    if (selectedStoryIds.length === 0) {
      // Clear analysis if no stories selected
      setMicroserviceAnalysis(null);
      setFrontendAnalysis(null);
      setDatabaseAnalysis(null);
      setAnalysisPerformed(true);
      return;
    }

    setAnalysisLoading(true);
    try {
      await Promise.all([
        fetchMicroserviceAnalysis(projectId, selectedStoryIds),
        fetchFrontendAnalysis(projectId, selectedStoryIds),
        fetchDatabaseAnalysis(projectId, selectedStoryIds)
      ]);
      setAnalysisPerformed(true);
    } catch (err) {
      console.error('Error performing analysis:', err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    // Extract selected story IDs
    const selectedStoryIds = Object.keys(selectedStories)
      .filter(key => selectedStories[key])
      .map(key => {
        const [epicId, storyId] = key.split('-');
        return parseInt(storyId);
      });

    if (selectedStoryIds.length === 0) {
      alert('Please select at least one story to generate code');
      return;
    }

    // Prepare analysis data to pass to implementation page
    const analysisData = {
      microservice_analysis: microserviceAnalysis,
      frontend_analysis: frontendAnalysis,
      database_analysis: databaseAnalysis
    };

    // Call the onGenerateCode callback to navigate to implementation page
    if (onGenerateCode) {
      onGenerateCode(selectedStoryIds, analysisData);
    }
  };

  // ============ SAVE ANALYSIS FUNCTIONS ============

  const fetchSavedAnalyses = async () => {
    try {
      setLoadingAnalyses(true);
      const response = await fetch(
        `${API_URL}/analysis-results/${projectId}?user_id=${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        setSavedAnalyses(data);
      }
    } catch (err) {
      console.error('Error fetching saved analyses:', err);
    } finally {
      setLoadingAnalyses(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!analysisName.trim()) {
      alert('Please enter a name for this analysis');
      return;
    }

    // Get selected story IDs
    const selectedStoryIds = Object.keys(selectedStories)
      .filter(key => selectedStories[key])
      .map(key => {
        const [epicId, storyId] = key.split('-');
        return parseInt(storyId);
      });

    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/analysis-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          user_id: userId,
          analysis_name: analysisName.trim(),
          selected_story_ids: selectedStoryIds,
          microservice_analysis: microserviceAnalysis,
          frontend_analysis: frontendAnalysis,
          database_analysis: databaseAnalysis,
        }),
      });

      if (response.ok) {
        const savedAnalysis = await response.json();
        setSaveSuccess(true);
        setAnalysisName('');
        setShowSaveModal(false);
        
        // Lock the analysis - this is now the definitive version for this project
        setIsAnalysisLocked(true);
        setLockedAnalysisId(savedAnalysis.id);
        setLockedAnalysisName(savedAnalysis.analysis_name);
        
        // Refresh the saved analyses list
        await fetchSavedAnalyses();
        
        // Show success message
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert('Failed to save analysis. Please try again.');
      }
    } catch (err) {
      console.error('Error saving analysis:', err);
      alert('Error saving analysis: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadAnalysis = async (analysisId) => {
    try {
      const response = await fetch(
        `${API_URL}/analysis-results/${projectId}/${analysisId}?user_id=${userId}`
      );
      if (response.ok) {
        const analysis = await response.json();
        
        // Load the analysis data
        setMicroserviceAnalysis(analysis.microservice_analysis);
        setFrontendAnalysis(analysis.frontend_analysis);
        setDatabaseAnalysis(analysis.database_analysis);
        
        // Restore selected stories
        const newSelectedStories = {};
        if (analysis.selected_story_ids) {
          analysis.selected_story_ids.forEach(storyId => {
            // Find the epic ID for this story
            Object.entries(stories.epics || {}).forEach(([epicId, epicData]) => {
              const story = epicData.stories.find(s => s.story_id === storyId);
              if (story) {
                newSelectedStories[`${epicId}-${storyId}`] = true;
              }
            });
          });
        }
        setSelectedStories(newSelectedStories);
        setAnalysisPerformed(true);
        setActiveTab('microservices');
        setShowSavedAnalysesList(false);
      }
    } catch (err) {
      console.error('Error loading analysis:', err);
      alert('Error loading analysis: ' + err.message);
    }
  };

  const handleDeleteAnalysis = async (analysisId) => {
    if (!window.confirm('Are you sure you want to delete this analysis?')) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/analysis-results/${analysisId}?user_id=${userId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        // Refresh the saved analyses list
        await fetchSavedAnalyses();
      } else {
        alert('Failed to delete analysis. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting analysis:', err);
      alert('Error deleting analysis: ' + err.message);
    }
  };

  const renderStoryDetails = (storyDetails) => {
    if (!storyDetails) return null;

    return (
      <div className="impact-story-details">
        {storyDetails.summary && (
          <div className="detail-section">
            <strong>Summary</strong>
            <p style={{ margin: '0', lineHeight: '1.8', color: '#333' }}>
              {storyDetails.summary}
            </p>
          </div>
        )}
        
        {storyDetails.description && (
          <div className="detail-section">
            <strong>Description</strong>
            <p style={{ margin: '0', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
              {storyDetails.description}
            </p>
          </div>
        )}
        
        {storyDetails.acceptance_criteria && (
          <div className="detail-section">
            <strong>Acceptance Criteria</strong>
            {Array.isArray(storyDetails.acceptance_criteria) ? (
              <ul className="criteria-list">
                {storyDetails.acceptance_criteria.map((criterion, idx) => (
                  <li key={idx}>{criterion}</li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: '0', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                {storyDetails.acceptance_criteria}
              </p>
            )}
          </div>
        )}
        
        {storyDetails.technical_notes && (
          <div className="detail-section">
            <strong>Technical Notes</strong>
            <p style={{ margin: '0', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
              {storyDetails.technical_notes}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderMicroserviceAnalysis = () => {
    if (!analysisPerformed) {
      return (
        <div className="impact-analysis-empty">
          <div className="impact-empty-icon">🔍</div>
          <p className="impact-empty-text">Select stories and click "Analyse Selected Stories" to view microservice analysis.</p>
        </div>
      );
    }

    if (!microserviceAnalysis) {
      return <div className="impact-loading">Loading microservice analysis...</div>;
    }

    const { total_microservices, total_epics, microservices } = microserviceAnalysis;

    return (
      <div className="impact-microservices-section">
        <div className="microservice-summary">
          <div className="summary-card">
            <div className="summary-number">{total_microservices}</div>
            <div className="summary-label">Microservices</div>
          </div>
          <div className="summary-card">
            <div className="summary-number">{total_epics}</div>
            <div className="summary-label">Epics</div>
          </div>
        </div>

        <div className="microservices-list">
          {microservices.map((ms, index) => (
            <div key={ms.id} className="microservice-card">
              <div className="microservice-header">
                <div className="microservice-title">
                  <span className="microservice-index">{index + 1}</span>
                  <h3>{ms.name}</h3>
                </div>
                <div className="microservice-badges">
                  <span className="badge badge-port">Port: {ms.port}</span>
                  <span className="badge badge-db">{ms.database}</span>
                </div>
              </div>

              <div className="microservice-body">
                <div className="microservice-reasoning">
                  <strong>Reasoning:</strong> {ms.reasoning}
                </div>

                <div className="microservice-epics">
                  <strong>Assigned Epics & Stories:</strong>
                  {ms.epics.map((epic, idx) => (
                    <div key={idx} className="epic-assignment">
                      <div className="epic-name">📚 {epic.title}</div>
                      <div className="epic-stories">
                        {epic.stories.map((story, sIdx) => (
                          <div key={sIdx} className="story-name">
                            📖 {story}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="microservice-stats">
                  <div className="stat">
                    <span className="stat-label">Total Epics:</span>
                    <span className="stat-value">{ms.total_epics}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Total Stories:</span>
                    <span className="stat-value">{ms.total_stories}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFrontendAnalysis = () => {
    if (!analysisPerformed) {
      return (
        <div className="impact-analysis-empty">
          <div className="impact-empty-icon">🔍</div>
          <p className="impact-empty-text">Select stories and click "Analyse Selected Stories" to view frontend analysis.</p>
        </div>
      );
    }

    if (!frontendAnalysis) {
      return <div className="impact-loading">Loading frontend analysis...</div>;
    }

    const { total_pages, total_components, pages, services, summary } = frontendAnalysis;

    return (
      <div className="impact-frontend-section">
        <div className="frontend-summary">
          <div className="summary-card">
            <div className="summary-number">{total_pages}</div>
            <div className="summary-label">React Pages</div>
          </div>
          <div className="summary-card">
            <div className="summary-number">{total_components}</div>
            <div className="summary-label">Components</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Framework</div>
            <div className="summary-tech">{summary.framework}</div>
          </div>
        </div>

        <div className="frontend-details">
          <div className="frontend-section">
            <h3 className="section-title">📄 React Pages & Components</h3>
            <div className="pages-list">
              {pages.map((page) => (
                <div key={page.id} className="page-card">
                  <div className="page-header">
                    <h4 className="page-name">{page.name}</h4>
                    <span className="page-route">{page.route}</span>
                  </div>
                  
                  {page.microservice && (
                    <div className="page-microservice-info">
                      <div className="microservice-badge-small">
                        🔗 {page.microservice.name}
                        <span className="port-badge">Port {page.microservice.port}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="page-components">
                    <strong>Components:</strong>
                    <div className="components-detailed-list">
                      {page.components.map((comp) => (
                        <div key={comp.id} className="component-detail-card">
                          <div className="component-info">
                            <div className="component-name">📦 {comp.name}</div>
                            {comp.microservice && (
                              <div className="component-api-info">
                                <span className="api-label">API:</span>
                                <span className="api-url">{comp.api_base_url}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="page-stats">
                    {page.total_components} component{page.total_components !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="frontend-section">
            <h3 className="section-title">🔧 Services & Utilities</h3>
            <div className="services-list">
              {services.map((service) => (
                <div key={service.name} className="service-card">
                  <div className="service-name">{service.name}</div>
                  <div className="service-file">{service.filename}</div>
                  <div className="service-desc">{service.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="frontend-section">
            <h3 className="section-title">📁 Folder Structure</h3>
            <div className="folder-structure">
              <div className="folder-item">
                <strong>src/</strong>
                <div className="folder-children">
                  <div className="folder-child">
                    <strong>pages/</strong> - {total_pages} React pages (one per epic)
                  </div>
                  <div className="folder-child">
                    <strong>components/</strong> - {total_components} React components (one per story)
                  </div>
                  <div className="folder-child">
                    <strong>services/</strong> - API client and utilities
                  </div>
                  <div className="folder-child">
                    <strong>App.js</strong> - Main app with auto-generated routes
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="frontend-section">
            <h3 className="section-title">🛠️ Tech Stack</h3>
            <div className="tech-stack">
              <div className="tech-item">
                <strong>Framework:</strong> {summary.framework}
              </div>
              <div className="tech-item">
                <strong>Routing:</strong> {summary.routing_library}
              </div>
              <div className="tech-item">
                <strong>API Client:</strong> {summary.api_client}
              </div>
              <div className="tech-item">
                <strong>State Management:</strong> {summary.state_management}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDatabaseAnalysis = () => {
    if (!analysisPerformed) {
      return (
        <div className="impact-analysis-empty">
          <div className="impact-empty-icon">🔍</div>
          <p className="impact-empty-text">Select stories and click "Analyse Selected Stories" to view database analysis.</p>
        </div>
      );
    }

    if (!databaseAnalysis) {
      return <div className="impact-loading">Loading database analysis...</div>;
    }

    const { total_tables, total_relationships, tables, relationships, microservices_with_tables, summary } = databaseAnalysis;

    return (
      <div className="impact-database-section">
        <div className="database-summary">
          <div className="summary-card">
            <div className="summary-number">{total_tables}</div>
            <div className="summary-label">Total Tables</div>
          </div>
          <div className="summary-card">
            <div className="summary-number">{total_relationships}</div>
            <div className="summary-label">Relationships</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Architecture</div>
            <div className="summary-tech">{summary.architecture}</div>
          </div>
        </div>

        <div className="database-details">
          {microservices_with_tables && microservices_with_tables.length > 0 ? (
            <>
              <h3 className="section-title">🗄️ Databases by Microservice</h3>
              {microservices_with_tables.map((ms) => (
                <div key={ms.id} className="microservice-database-section">
                  <div className="microservice-db-header">
                    <div>
                      <h4 className="ms-db-name">{ms.name}</h4>
                      <div className="ms-db-info">
                        <span className="db-badge">Database: {ms.database}</span>
                        <span className="port-badge">Port {ms.port}</span>
                      </div>
                    </div>
                    <div className="table-count-badge">{ms.total_tables} table{ms.total_tables !== 1 ? 's' : ''}</div>
                  </div>

                  <div className="microservice-tables-list">
                    {ms.tables.map((table) => (
                      <div key={table.id} className="table-card">
                        <div className="table-header">
                          <h5 className="table-name">{table.display_name}</h5>
                        </div>
                        <div className="table-content">
                          <div className="table-columns">
                            <strong>Columns ({table.total_columns}):</strong>
                            <div className="columns-list">
                              {table.columns.map((col) => (
                                <div key={col.name} className="column-item">
                                  <span className="column-name">{col.name}</span>
                                  <span className="column-type">{col.type}</span>
                                  {col.foreign_key && <span className="column-fk">FK</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="database-section">
              <h3 className="section-title">📊 Tables</h3>
              <div className="tables-list">
                {tables.map((table) => (
                  <div key={table.id} className="table-card">
                    <div className="table-header">
                      <h4 className="table-name">{table.display_name}</h4>
                    </div>
                    <div className="table-content">
                      <div className="table-columns">
                        <strong>Columns:</strong>
                        <div className="columns-list">
                          {table.columns.map((col) => (
                            <div key={col.name} className="column-item">
                              <span className="column-name">{col.name}</span>
                              <span className="column-type">{col.type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="database-section">
            <h3 className="section-title">🔗 Relationships</h3>
            <div className="relationships-list">
              {relationships && relationships.length > 0 ? (
                relationships.map((rel, idx) => (
                  <div key={idx} className="relationship-card">
                    <div className="relationship-flow">
                      <div className="relationship-from">
                        <span className="table-ref">{rel.from_table}</span>
                        {rel.from_microservice && (
                          <span className="ms-label">[{rel.from_microservice}]</span>
                        )}
                      </div>
                      <span className="relationship-arrow">→</span>
                      <div className="relationship-to">
                        <span className="table-ref">{rel.to_table}</span>
                        {rel.to_microservice && (
                          <span className="ms-label">[{rel.to_microservice}]</span>
                        )}
                      </div>
                    </div>
                    <div className="relationship-detail">
                      {rel.from_column} → {rel.to_column}
                    </div>
                    <div className={`relationship-type ${rel.type}`}>
                      {rel.type === 'api_call' ? '🔗 Service-to-Service API Call' : '🔐 Foreign Key'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-relationships">No relationships defined</div>
              )}
            </div>
          </div>

          <div className="database-section">
            <h3 className="section-title">📁 Folder Structure</h3>
            <div className="folder-structure">
              <div className="folder-item">
                <strong>ddl/</strong>
                <div className="folder-children">
                  <div className="folder-child">
                    <strong>init.sql</strong> - Database initialization
                  </div>
                  <div className="folder-child">
                    <strong>migrations/</strong> - Schema version control
                  </div>
                  <div className="folder-child">
                    <strong>microservices/</strong> - Separate DDL per service
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="database-section">
            <h3 className="section-title">🛠️ Database Configuration</h3>
            <div className="tech-stack">
              <div className="tech-item">
                <strong>Database:</strong> {summary.database_type}
              </div>
              <div className="tech-item">
                <strong>Timestamps:</strong> {summary.timestamp_handling}
              </div>
              <div className="tech-item">
                <strong>Relationships:</strong> {summary.relationships}
              </div>
              <div className="tech-item">
                <strong>Indexing:</strong> {summary.indexing}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="impact-analysis-container">
        <div className="impact-loading">Loading stories...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="impact-analysis-container">
        <div className="impact-error">{error}</div>
        <button className="impact-back-btn" onClick={onBack}>← Back</button>
      </div>
    );
  }

  const groupedData = stories.epics || {};
  const hasStories = Object.keys(groupedData).length > 0;

  return (
    <div className="impact-analysis-container">
      <div className="impact-analysis-header">
        <h1 className="impact-title">Impact Analysis</h1>
        <p className="impact-subtitle">Project: {appName}</p>
      </div>

      {!hasStories ? (
        <div className="impact-empty-state">
          <div className="impact-empty-icon">📋</div>
          <p className="impact-empty-text">No stories available for this project.</p>
        </div>
      ) : (
        <>
          <div className="impact-tabs">
            <button
              className={`impact-tab ${activeTab === 'stories' ? 'active' : ''}`}
              onClick={() => setActiveTab('stories')}
            >
              📖 Stories ({Object.keys(groupedData).length} Epics)
            </button>
            <button
              className={`impact-tab ${activeTab === 'microservices' ? 'active' : ''}`}
              onClick={() => setActiveTab('microservices')}
            >
              🏗️ Microservices ({microserviceAnalysis?.total_microservices || 0})
            </button>
            <button
              className={`impact-tab ${activeTab === 'frontend' ? 'active' : ''}`}
              onClick={() => setActiveTab('frontend')}
            >
              💻 Frontend ({frontendAnalysis?.total_pages || 0} Pages)
            </button>
            <button
              className={`impact-tab ${activeTab === 'database' ? 'active' : ''}`}
              onClick={() => setActiveTab('database')}
            >
              🗄️ Database ({databaseAnalysis?.total_tables || 0} Tables)
            </button>
          </div>

          {activeTab === 'stories' && (
            <div>
              {isAnalysisLocked && (
                <div className="impact-locked-indicator">
                  <span>🔒 Analysis Locked</span>
                  <span className="locked-name">Saved as: {lockedAnalysisName}</span>
                </div>
              )}
              <div className="impact-stories-header">
                <button 
                  className="impact-analyse-btn"
                  onClick={handleAnalyse}
                  disabled={analysisLoading || isAnalysisLocked}
                  title={isAnalysisLocked ? "Analysis is locked for this project" : "Analyse selected stories"}
                >
                  {analysisLoading ? '⏳ Analysing...' : '🔍 Analyse Selected Stories'}
                </button>
                <button 
                  className="impact-generate-btn"
                  onClick={handleGenerateCode}
                  disabled={!microserviceAnalysis}
                  title="Generate code for selected stories"
                >
                  💻 Generate Code
                </button>
                {analysisPerformed && microserviceAnalysis && !isAnalysisLocked && (
                  <>
                    <button 
                      className="impact-save-btn"
                      onClick={() => setShowSaveModal(true)}
                      disabled={isSaving}
                    >
                      {isSaving ? '💾 Saving...' : '💾 Save Analysis'}
                    </button>
                    <button 
                      className="impact-view-saved-btn"
                      onClick={() => {
                        setShowSavedAnalysesList(!showSavedAnalysesList);
                        if (!showSavedAnalysesList) {
                          fetchSavedAnalyses();
                        }
                      }}
                    >
                      📂 View Saved ({savedAnalyses.length})
                    </button>
                  </>
                )}
                <span className="impact-selected-count">
                  {Object.values(selectedStories).filter(Boolean).length} selected
                </span>
              </div>
              <div className="impact-content">
                {Object.entries(groupedData).map(([epicId, epicData]) => (
                  <div key={epicId} className="impact-epic-group">
                    <div
                      className="impact-epic-header"
                      onClick={() => toggleEpicExpand(epicId)}
                    >
                    <span className="impact-epic-toggle">
                      {expandedEpics[epicId] ? '▼' : '▶'}
                    </span>
                    <h2 className="impact-epic-title">
                      {epicData.epic?.epic_title || `Epic ${epicId}`}
                    </h2>
                    <span className="impact-story-count">
                      {epicData.stories.length} stories
                    </span>
                  </div>

                  {expandedEpics[epicId] && epicData.stories.length > 0 && (
                    <div className="impact-stories-list">
                      {epicData.stories.map((story, idx) => {
                        const storyKey = `${epicId}-${story.story_id}`;
                        const isSelected = selectedStories[storyKey] || false;
                        return (
                          <div key={storyKey} className={`impact-story-item ${isSelected ? 'selected' : ''} ${isAnalysisLocked ? 'locked' : ''}`}>
                            <div className="impact-story-header">
                              <input
                                type="checkbox"
                                className="impact-story-checkbox"
                                checked={isSelected}
                                onChange={() => toggleStorySelection(epicId, story.story_id)}
                                disabled={isAnalysisLocked}
                                aria-label={`Select ${story.story_title}`}
                                title={isAnalysisLocked ? "Analysis is locked for this project" : "Select story"}
                              />
                              <span className="impact-story-number">Story {story.story_id}:</span>
                              <h3 className="impact-story-title">{story.story_title}</h3>
                            </div>
                            {renderStoryDetails(story.story_details)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              </div>
            </div>
          )}

          {/* Show Saved Analyses List */}
          {showSavedAnalysesList && (
            <div className="impact-saved-analyses-panel">
              <div className="impact-saved-header">
                <h3>Saved Analyses</h3>
                <button 
                  className="impact-close-btn"
                  onClick={() => setShowSavedAnalysesList(false)}
                >
                  ✕
                </button>
              </div>
              {loadingAnalyses ? (
                <div className="impact-loading">Loading saved analyses...</div>
              ) : savedAnalyses.length === 0 ? (
                <div className="impact-no-saved">No saved analyses yet</div>
              ) : (
                <div className="impact-analyses-list">
                  {savedAnalyses.map((analysis) => (
                    <div key={analysis.id} className="impact-analysis-item">
                      <div className="impact-analysis-content">
                        <div className="impact-analysis-name">{analysis.analysis_name}</div>
                        <div className="impact-analysis-meta">
                          <span className="impact-analysis-date">
                            {new Date(analysis.created_at).toLocaleDateString()} {new Date(analysis.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          <span className="impact-analysis-stories">{analysis.story_count} stories</span>
                        </div>
                      </div>
                      <div className="impact-analysis-actions">
                        <button 
                          className="impact-load-btn"
                          onClick={() => handleLoadAnalysis(analysis.id)}
                          title="Load this analysis"
                        >
                          📂 Load
                        </button>
                        <button 
                          className="impact-delete-btn"
                          onClick={() => handleDeleteAnalysis(analysis.id)}
                          title="Delete this analysis"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save Analysis Modal */}
          {showSaveModal && (
            <div className="impact-modal-overlay" onClick={() => setShowSaveModal(false)}>
              <div className="impact-save-modal" onClick={(e) => e.stopPropagation()}>
                <div className="impact-modal-header">
                  <h3>Save Analysis</h3>
                  <button 
                    className="impact-close-btn"
                    onClick={() => setShowSaveModal(false)}
                  >
                    ✕
                  </button>
                </div>
                
                <div className="impact-modal-body">
                  <p>Enter a name for this analysis:</p>
                  <input
                    type="text"
                    className="impact-analysis-name-input"
                    placeholder="e.g., Student Management - Initial Design"
                    value={analysisName}
                    onChange={(e) => setAnalysisName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveAnalysis();
                      }
                    }}
                    maxLength={100}
                    autoFocus
                  />
                  <div className="impact-modal-info">
                    <strong>Selected Stories:</strong> {Object.values(selectedStories).filter(Boolean).length}
                  </div>
                </div>

                <div className="impact-modal-footer">
                  <button 
                    className="impact-modal-cancel-btn"
                    onClick={() => setShowSaveModal(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button 
                    className="impact-modal-save-btn"
                    onClick={handleSaveAnalysis}
                    disabled={isSaving || !analysisName.trim()}
                  >
                    {isSaving ? '💾 Saving...' : '💾 Save'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {saveSuccess && (
            <div className="impact-success-message">
              ✅ Analysis saved successfully!
            </div>
          )}

          {activeTab === 'microservices' && renderMicroserviceAnalysis()}
          {activeTab === 'frontend' && renderFrontendAnalysis()}
          {activeTab === 'database' && renderDatabaseAnalysis()}
        </>
      )}

      <button className="impact-back-btn" onClick={onBack}>← Back</button>
    </div>
  );
};

export default ImpactAnalysis;
