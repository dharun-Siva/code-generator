import React from 'react';
import './UnderConstruction.css';

const UnderConstruction = ({ appName, onBack }) => {
  return (
    <div className="under-construction-container">
      <div className="under-construction-content">
        <div className="construction-icon">🚧</div>
        
        <h1 className="construction-title">Under Construction</h1>
        
        <p className="construction-subtitle">
          The Code Generation feature is currently being built
        </p>
        
        <p className="construction-message">
          We're working on bringing you powerful code generation capabilities. 
          This feature will allow you to automatically generate and implement code based on your requirements.
        </p>
        
        <div className="construction-features">
          <h3>Coming Soon:</h3>
          <ul>
            <li>✨ Intelligent code generation from specifications</li>
            <li>🔄 Automated implementation workflows</li>
            <li>📋 Code review and validation</li>
            <li>🚀 One-click deployment</li>
          </ul>
        </div>
        
        <button className="construction-back-btn" onClick={onBack}>
          ← Back to Applications
        </button>
      </div>
    </div>
  );
};

export default UnderConstruction;
