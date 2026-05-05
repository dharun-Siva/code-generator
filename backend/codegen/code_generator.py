"""
Code Generation Engine
Handles generation of complete project structure with React, Python, and PostgreSQL code
"""

import os
import json
import subprocess
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List
from agent import AIAgent


class CodeGenerator:
    def __init__(self):
        self.agent = AIAgent()
        self.base_output_dir = "generated_projects"
        self.ensure_output_dir()

    def ensure_output_dir(self):
        """Create base output directory if it doesn't exist"""
        if not os.path.exists(self.base_output_dir):
            os.makedirs(self.base_output_dir)
    
    def _sanitize_filename(self, name: str, max_length: int = 50) -> str:
        """
        Sanitize a string to be a valid filename and Python/JavaScript identifier
        - Removes invalid characters (quotes, slashes, special chars)
        - Truncates to reasonable length for Windows compatibility
        - Converts to CamelCase for use as class/component names
        - Converts to snake_case for use as filenames
        """
        # Remove invalid filename characters
        name = re.sub(r'[<>:"/\\|?*]', '', name)  # Invalid chars on Windows
        name = re.sub(r'[^\w\s-]', '', name)      # Keep only word chars, spaces, hyphens
        name = name.strip()                        # Remove leading/trailing spaces
        
        # Truncate to reasonable length to avoid Windows path length limits
        if len(name) > max_length:
            # Keep first part and truncate
            words = name.split()
            truncated = ""
            for word in words:
                if len(truncated) + len(word) + 1 <= max_length:
                    truncated += word + " "
                else:
                    break
            name = truncated.strip()
        
        if not name:
            name = "component"
        
        return name
    
    def _to_pascal_case(self, name: str, max_length: int = 50) -> str:
        """Convert string to PascalCase for JavaScript component names"""
        name = self._sanitize_filename(name, max_length)
        # Split by spaces or hyphens and capitalize each word
        words = re.split(r'[\s-]+', name)
        return ''.join(word.capitalize() for word in words if word)
    
    def _to_snake_case(self, name: str, max_length: int = 50) -> str:
        """Convert string to snake_case for database/URL names"""
        name = self._sanitize_filename(name, max_length)
        # Replace spaces and hyphens with underscores
        name = re.sub(r'[\s-]+', '_', name)
        # Convert to lowercase
        return name.lower()

    def generate_complete_project(
        self,
        app_name: str,
        epics_and_stories: Dict,
        github_token: str
    ) -> Dict:
        """
        Generate complete project structure and push to GitHub
        
        Args:
            app_name: Application name
            epics_and_stories: Dictionary with epics and stories
            github_token: GitHub personal access token
        
        Returns:
            Dictionary with generation status and repository URL
        """
        try:
            # Create project directory
            project_dir = os.path.join(self.base_output_dir, app_name)
            if os.path.exists(project_dir):
                import shutil
                import stat
                
                # Handle Windows file locking issues
                def handle_remove_readonly(func, path, exc):
                    """Error handler for Windows file permissions"""
                    if not os.access(path, os.W_OK):
                        os.chmod(path, stat.S_IWUSR | stat.S_IRUSR)
                        func(path)
                    else:
                        raise
                
                try:
                    shutil.rmtree(project_dir, onerror=handle_remove_readonly)
                except Exception as e:
                    print(f"Warning: Could not completely remove old directory: {e}")
                    # Continue anyway - we'll overwrite files
            
            os.makedirs(project_dir, exist_ok=True)

            # Generate frontend code
            self._generate_frontend(project_dir, app_name, epics_and_stories)
            
            # Generate backend code
            self._generate_backend(project_dir, app_name, epics_and_stories)
            
            # Generate database code
            self._generate_database(project_dir, app_name, epics_and_stories)
            
            # Generate README
            self._generate_readme(project_dir, app_name)
            
            # Initialize git and push to GitHub
            repo_url = self._push_to_github(project_dir, app_name, github_token)
            
            return {
                "status": "success",
                "message": f"Project generated and pushed to GitHub",
                "repo_url": repo_url,
                "project_path": project_dir
            }
        except Exception as e:
            print(f"ERROR in generate_complete_project: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

    def _extract_stories(self, epics_and_stories: Dict) -> List[str]:
        """Extract all story titles from the epics structure"""
        stories = []
        if epics_and_stories.get("epics"):
            for epic_id, epic_data in epics_and_stories["epics"].items():
                if epic_data.get("stories"):
                    for story in epic_data["stories"]:
                        if story.get("story_title"):
                            stories.append(story["story_title"])
        return stories
    
    def _generate_story_component(self, component_name: str, story_title: str, entity_name: str) -> str:
        """Generate a React component for a specific story using AI"""
        try:
            # Use AI to generate intelligent component code
            prompt = f"""Generate a complete, production-ready React component for this feature:
Story: {story_title}
Entity: {entity_name}
Component Name: {component_name}

REQUIREMENTS:
1. Functional component with hooks (useState, useEffect)
2. State management for form fields and API responses
3. API integration using apiClient from '../services/api'
4. Error handling and loading states
5. Form inputs or data display based on the story
6. Proper styling with inline styles or CSS classes
7. COMPLETE WORKING CODE - NO TODOs or placeholders
8. JSDoc comments
9. Data fetching on mount
10. Form submission handling

Return ONLY the JSX component code starting with 'import React'."""
            
            code = self.agent.generate_code(prompt, language="javascript", max_tokens=2048)
            
            # Ensure it has proper export
            if "export default" not in code:
                code = code + f"\n\nexport default {component_name};"
            
            return code
        except Exception as e:
            print(f"Error generating component with AI: {e}")
            # Fallback to template
            return self._generate_story_component_template(component_name, story_title, entity_name)
    
    def _generate_story_component_template(self, component_name: str, story_title: str, entity_name: str) -> str:
        """Fallback template for story component"""
        return f'''import React, {{ useState, useEffect }} from 'react';
import apiClient from '../services/api';

/**
 * {story_title}
 * @component Auto-generated React component for: {story_title}
 */
function {component_name}() {{
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [formData, setFormData] = useState({{}});

  useEffect(() => {{
    loadData();
  }}, []);

  const loadData = async () => {{
    try {{
      setLoading(true);
      const response = await apiClient.get('/{entity_name}');
      setData(response.data);
      setError(null);
    }} catch (err) {{
      setError(err.message);
    }} finally {{
      setLoading(false);
    }}
  }};

  const handleSubmit = async (e) => {{
    e.preventDefault();
    try {{
      setLoading(true);
      const response = await apiClient.post('/{entity_name}', formData);
      setData(response.data);
      setFormData({{}});
      setError(null);
    }} catch (err) {{
      setError(err.message);
    }} finally {{
      setLoading(false);
    }}
  }};

  return (
    <div className="component-container">
      <h2>{story_title}</h2>
      
      {{error && <div className="error-box">Error: {{error}}</div>}}
      {{loading && <div className="loading-box">Loading...</div>}}
      
      <form onSubmit={{handleSubmit}} className="form">
        <input
          type="text"
          placeholder="Enter data..."
          value={{Object.values(formData)[0] || ''}}
          onChange={{(e) => setFormData({{ ...formData, data: e.target.value }})}}
        />
        <button type="submit" disabled={{loading}}>Submit</button>
      </form>
      
      {{data && (
        <div className="result">
          <h3>Result:</h3>
          <pre>{{JSON.stringify(data, null, 2)}}</pre>
        </div>
      )}}
    </div>
  );
}}

export default {component_name};
'''

    def _generate_entity_page(self, page_name: str, entity_name: str, stories: List[Dict]) -> str:
        """Generate a React page for managing an entity using AI"""
        try:
            stories_list = ", ".join([s.get("story_title", "Story") for s in stories[:5]])
            
            # Use AI to generate intelligent page code
            prompt = f"""Generate a complete, production-ready React page component for managing:
Entity: {entity_name}
Page Name: {page_name}
Related Stories: {stories_list}

REQUIREMENTS:
1. Full CRUD operations (Create, Read, Update, Delete)
2. Data table/list view with all relevant fields
3. Form for creating and editing {entity_name}
4. Search and filter functionality
5. API integration using apiClient from '../services/api'
6. Complete error handling and loading states
7. Proper styling with inline styles or CSS classes
8. COMPLETE WORKING CODE - NO TODOs or placeholders
9. JSDoc comments for all functions
10. Data fetching on mount
11. Edit/delete functionality
12. Responsive design

Return ONLY the JSX page component code starting with 'import React'."""
            
            code = self.agent.generate_code(prompt, language="javascript", max_tokens=2048)
            
            # Ensure it has proper export
            if "export default" not in code:
                code = code + f"\n\nexport default {page_name};"
            
            return code
        except Exception as e:
            print(f"Error generating page with AI: {e}")
            # Fallback to template
            return self._generate_entity_page_template(page_name, entity_name, stories)
    
    def _generate_entity_page_template(self, page_name: str, entity_name: str, stories: List[Dict]) -> str:
        """Fallback template for entity page"""
        stories_list = ", ".join([f'"{s.get("story_title", "Story")}"' for s in stories[:5]])
        
        return f'''import React, {{ useState, useEffect }} from 'react';
import apiClient from '../services/api';
import './PageStyle.css';

/**
 * {page_name} Page
 * @component Manages {entity_name} entity and related operations
 */
function {page_name}() {{
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({{ name: '', description: '' }});
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {{
    fetchItems();
  }}, []);

  const fetchItems = async () => {{
    try {{
      setLoading(true);
      const response = await apiClient.get('/{entity_name}');
      setItems(response.data);
      setError(null);
    }} catch (err) {{
      setError(err.message);
    }} finally {{
      setLoading(false);
    }}
  }};

  const handleSubmit = async (e) => {{
    e.preventDefault();
    try {{
      setLoading(true);
      if (editingId) {{
        await apiClient.put(`/{entity_name}/${{editingId}}`, formData);
      }} else {{
        await apiClient.post('/{entity_name}', formData);
      }}
      setFormData({{ name: '', description: '' }});
      setEditingId(null);
      fetchItems();
    }} catch (err) {{
      setError(err.message);
    }} finally {{
      setLoading(false);
    }}
  }};

  const handleDelete = async (id) => {{
    try {{
      await apiClient.delete(`/{entity_name}/${{id}}`);
      fetchItems();
    }} catch (err) {{
      setError(err.message);
    }}
  }};

  const handleEdit = (item) => {{
    setFormData({{ name: item.name, description: item.description }});
    setEditingId(item.id);
  }};

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <h1>{{entity_name.toUpperCase()}}</h1>
      <p className="subtitle">Manage {{entity_name}} - Available operations: {{stories_list}}</p>
      
      {{error && <div className="error-message">Error: {{error}}</div>}}
      {{loading && <div className="loading-spinner">Loading...</div>}}

      <form onSubmit={{handleSubmit}} className="form-container">
        <div className="form-group">
          <label htmlFor="name">Name:</label>
          <input
            id="name"
            type="text"
            value={{formData.name}}
            onChange={{(e) => setFormData({{ ...formData, name: e.target.value }})}}
            required
            placeholder="Enter name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            value={{formData.description}}
            onChange={{(e) => setFormData({{ ...formData, description: e.target.value }})}}
            placeholder="Enter description"
          />
        </div>
        <button type="submit" disabled={{loading}}>
          {{editingId ? 'Update' : 'Create'}} {{entity_name.slice(0, -1)}}
        </button>
        {{editingId && (
          <button type="button" onClick={{() => {{
            setEditingId(null);
            setFormData({{ name: '', description: '' }});
          }}}}>
            Cancel
          </button>
        )}}
      </form>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search {{entity_name}}..."
          value={{searchTerm}}
          onChange={{(e) => setSearchTerm(e.target.value)}}
          className="search-input"
        />
      </div>

      <div className="items-list">
        <h2>Existing {{entity_name}}</h2>
        {{filteredItems.length === 0 ? (
          <p>No items found</p>
        ) : (
          <table className="items-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {{filteredItems.map((item) => (
                <tr key={{item.id}}>
                  <td>{{item.id}}</td>
                  <td>{{item.name}}</td>
                  <td>{{item.description}}</td>
                  <td>
                    <button onClick={{() => handleEdit(item)}} className="btn-edit">Edit</button>
                    <button onClick={{() => handleDelete(item.id)}} className="btn-delete">Delete</button>
                  </td>
                </tr>
              ))}}
            </tbody>
          </table>
        )}}
      </div>
    </div>
  );
}}

export default {page_name};
'''

    def _generate_frontend(self, project_dir: str, app_name: str, epics_and_stories: Dict):
        """Generate React frontend code based on domain entities"""
        frontend_dir = os.path.join(project_dir, "frontend")
        os.makedirs(frontend_dir)
        
        # Generate package.json
        package_json = {
            "name": f"{app_name.lower().replace(' ', '-')}-frontend",
            "version": "1.0.0",
            "description": f"Frontend for {app_name}",
            "dependencies": {
                "react": "^18.2.0",
                "react-dom": "^18.2.0",
                "axios": "^1.4.0",
                "react-router-dom": "^6.0.0",
                "react-bootstrap": "^2.8.0",
                "bootstrap": "^5.3.0",
                "react-hook-form": "^7.48.0",
                "react-toastify": "^9.1.3"
            },
            "scripts": {
                "start": "react-scripts start",
                "build": "react-scripts build",
                "test": "react-scripts test"
            }
        }
        
        with open(os.path.join(frontend_dir, "package.json"), "w", encoding='utf-8') as f:
            json.dump(package_json, f, indent=2)
        
        # Generate public folder with index.html
        public_dir = os.path.join(frontend_dir, "public")
        os.makedirs(public_dir)
        
        index_html = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Web site created using create-react-app" />
    <title>React App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
"""
        with open(os.path.join(public_dir, "index.html"), "w", encoding='utf-8') as f:
            f.write(index_html)
        
        # Generate folder structure
        src_dir = os.path.join(frontend_dir, "src")
        os.makedirs(os.path.join(src_dir, "components"))
        os.makedirs(os.path.join(src_dir, "pages"))
        os.makedirs(os.path.join(src_dir, "services"))
        
        # Generate API service
        api_service = """import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

export default apiClient;
"""
        with open(os.path.join(src_dir, "services", "api.js"), "w", encoding='utf-8') as f:
            f.write(api_service)
        
        # Generate pages and components based on domain entities
        routes_list = []
        imports_list = []
        processed_entities = set()
        
        if epics_and_stories.get("epics"):
            for epic_id, epic_data in epics_and_stories["epics"].items():
                epic_obj = epic_data.get("epic")
                stories = epic_data.get("stories", [])
                
                if epic_obj:
                    epic_title = epic_obj.epic_title
                    # Extract domain entity and create valid component name
                    entity_name = self._extract_domain_entity(epic_title)
                    
                    # Ensure valid JS identifier (no leading digits, valid chars)
                    if entity_name and entity_name[0].isdigit():
                        entity_name = 'Item' + entity_name
                    
                    # Create page component for entity (only once)
                    if entity_name not in processed_entities:
                        page_name = self._to_pascal_case(entity_name)
                        page_filename = f"{page_name}.js"
                        
                        # Generate entity page with CRUD operations
                        page_code = self._generate_entity_page(page_name, entity_name, stories)
                        with open(os.path.join(src_dir, "pages", page_filename), "w", encoding='utf-8') as f:
                            f.write(page_code)
                        
                        imports_list.append(f"import {page_name} from './pages/{page_name}';")
                        routes_list.append(f"        <Route path=\"/{entity_name}\" element={{<{page_name} />}} />")
                        processed_entities.add(entity_name)
                    
                    # Generate a component for each story
                    for idx, story in enumerate(stories):
                        story_title = story.get("story_title", f"Story {idx+1}")
                        # Create valid component name from story title
                        component_name = self._to_pascal_case(story_title)
                        # Ensure valid identifier
                        if not component_name or component_name[0].isdigit():
                            component_name = 'Feature' + str(idx)
                        
                        component_filename = f"{component_name}.js"
                        
                        component_code = self._generate_story_component(component_name, story_title, entity_name)
                        with open(os.path.join(src_dir, "components", component_filename), "w", encoding='utf-8') as f:
                            f.write(component_code)
        
        # Generate App.js with routes
        routes_str = "\n".join(routes_list) if routes_list else "        <Route path=\"/\" element={<Home />} />"
        imports_str = "\n".join(imports_list) if imports_list else "// Import pages here"
        
        app_js = f"""import React from 'react';
import {{ BrowserRouter, Routes, Route }} from 'react-router-dom';
import './App.css';
{imports_str}

function App() {{
  return (
    <BrowserRouter>
      <Routes>
{routes_str}
      </Routes>
    </BrowserRouter>
  );
}}

export default App;
"""
        with open(os.path.join(src_dir, "App.js"), "w", encoding='utf-8') as f:
            f.write(app_js)
        
        # Generate index.js
        index_js = """import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
"""
        with open(os.path.join(src_dir, "index.js"), "w", encoding='utf-8') as f:
            f.write(index_js)
        
        # Generate basic CSS
        index_css = """* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
    'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
"""
        with open(os.path.join(src_dir, "index.css"), "w", encoding='utf-8') as f:
            f.write(index_css)
        
        # Generate App.css
        app_css = """.app {
  text-align: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.app header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  margin-bottom: 20px;
  border-radius: 8px;
}

.app h1 {
  margin: 0;
  font-size: 2em;
}

.container {
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.component-container {
  padding: 20px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.form input,
.form textarea {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

.form button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
}

.form button:hover {
  background-color: #0056b3;
}

.loading-box,
.error-box {
  padding: 15px;
  margin: 10px 0;
  border-radius: 4px;
}

.loading-box {
  background-color: #e7f3ff;
  color: #004085;
}

.error-box {
  background-color: #f8d7da;
  color: #721c24;
}

.result {
  margin-top: 20px;
  padding: 15px;
  background-color: #d4edda;
  border-radius: 4px;
  color: #155724;
}

pre {
  background-color: #f4f4f4;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}
"""
        with open(os.path.join(src_dir, "App.css"), "w", encoding='utf-8') as f:
            f.write(app_css)
        
        # Generate .gitignore
        gitignore = """node_modules/
.env
.env.local
build/
dist/
.DS_Store
npm-debug.log
.vscode/
*.swp
*.swo
*~
"""
        with open(os.path.join(frontend_dir, ".gitignore"), "w", encoding='utf-8') as f:
            f.write(gitignore)

    def _generate_backend(self, project_dir: str, app_name: str, epics_and_stories: Dict):
        """Generate Python FastAPI backend code based on stories"""
        backend_dir = os.path.join(project_dir, "microservice")
        os.makedirs(backend_dir)
        
        # Generate requirements.txt
        requirements = """fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.0
python-dotenv==1.0.0
"""
        with open(os.path.join(backend_dir, "requirements.txt"), "w", encoding='utf-8') as f:
            f.write(requirements)
        
        # Generate main.py with endpoints based on stories
        endpoints_code = self._generate_endpoints_from_stories(epics_and_stories)
        
        main_py = f'''from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
from database import engine, SessionLocal, get_db
from models import Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="{app_name}",
    version="1.0.0",
    description="Auto-generated API for {app_name}"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ HEALTH CHECKS ============

@app.get("/")
def read_root():
    return {{"message": "Welcome to {app_name} API"}}

@app.get("/health")
def health_check():
    return {{"status": "ok", "service": "{app_name}"}}

# ============ AUTO-GENERATED ENDPOINTS ============

{endpoints_code}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
'''
        with open(os.path.join(backend_dir, "main.py"), "w", encoding='utf-8') as f:
            f.write(main_py)
        
        # Generate models.py
        models_py = f'''from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

# Auto-generated models based on stories
# Add your SQLAlchemy models here

class BaseModel(Base):
    """Base model with common fields"""
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    class Config:
        from_attributes = True
'''
        with open(os.path.join(backend_dir, "models.py"), "w", encoding='utf-8') as f:
            f.write(models_py)
        
        # Generate schemas.py
        schemas_py = """from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Auto-generated schemas for API validation
# Add your Pydantic schemas here

class BaseSchema(BaseModel):
    class Config:
        from_attributes = True
"""
        with open(os.path.join(backend_dir, "schemas.py"), "w", encoding='utf-8') as f:
            f.write(schemas_py)
        
        # Generate database.py template
        database_py = """from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost/app_db"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
"""
        with open(os.path.join(backend_dir, "database.py"), "w", encoding='utf-8') as f:
            f.write(database_py)
        
        # Generate .gitignore
        gitignore = """__pycache__/
*.py[cod]
*$py.class
*.so
.env
.venv
venv/
.DS_Store
*.log
.pytest_cache/
dist/
build/
*.egg-info/
.vscode/
*.swp
*.swo
*~
"""
        with open(os.path.join(backend_dir, ".gitignore"), "w", encoding='utf-8') as f:
            f.write(gitignore)
        
        # Generate .env.example
        env_example = """# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/app_db

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_DEBUG=False

# Frontend Configuration
REACT_APP_API_URL=http://localhost:8000
"""
        with open(os.path.join(backend_dir, ".env.example"), "w", encoding='utf-8') as f:
            f.write(env_example)
    
    def _generate_endpoints_from_stories(self, epics_and_stories: Dict) -> str:
        """Generate FastAPI endpoints with AI-powered implementation"""
        endpoints = []
        processed_entities = set()
        
        if epics_and_stories.get("epics"):
            for epic_id, epic_data in epics_and_stories["epics"].items():
                epic_obj = epic_data.get("epic")
                stories = epic_data.get("stories", [])
                
                if epic_obj:
                    epic_title = epic_obj.epic_title
                    entity_name = self._extract_domain_entity(epic_title)
                    
                    if entity_name and entity_name[0].isdigit():
                        entity_name = 'item_' + entity_name
                    
                    if entity_name not in processed_entities:
                        try:
                            # Use AI to generate endpoints
                            stories_desc = "; ".join([s.get("story_title", "Story") for s in stories])
                            prompt = f"""Generate complete FastAPI endpoint implementations for:
Epic: {epic_title}
Entity: {entity_name}
Stories: {stories_desc}

REQUIREMENTS:
1. GET /{entity_name} - List all {entity_name} with pagination
2. POST /{entity_name} - Create new {entity_name}
3. GET /{entity_name}/{{id}} - Get by ID
4. PUT /{entity_name}/{{id}} - Update
5. DELETE /{entity_name}/{{id}} - Delete
6. Include proper HTTP status codes (200, 201, 404, 400, 500)
7. Define Pydantic models for request/response INSIDE the functions
8. Include comprehensive error handling
9. Add detailed docstrings
10. COMPLETE WORKING CODE - NO TODOs or placeholders
11. Use database with Depends(get_db) for session management
12. Include input validation
13. DO NOT create a new FastAPI app instance
14. DO NOT include any import statements
15. ONLY return @app.get/@app.post/@app.put/@app.delete decorator functions
16. Use the 'app' variable that already exists in main.py

Return ONLY the endpoint functions with decorators, no imports or app creation."""
                            
                            endpoint_code = self.agent.generate_code(prompt, language="python", max_tokens=2048)
                            endpoints.append(endpoint_code)
                        except Exception as e:
                            print(f"Error generating endpoints with AI: {e}")
                            endpoints.append(self._generate_endpoints_template(entity_name, epic_title))
                        
                        processed_entities.add(entity_name)
        
        if not endpoints:
            endpoints.append(self._generate_default_endpoints())
        
        return "\n".join(endpoints)
    
    def _generate_endpoints_template(self, entity_name: str, epic_title: str) -> str:
        """Fallback endpoint template"""
        singular = entity_name.rstrip('s') if entity_name.endswith('s') else entity_name
        return f'''# {epic_title} Endpoints

# In-memory storage for {entity_name} (replace with database calls)
{entity_name}_db = {{}}
{entity_name}_counter = 1

@app.get("/{entity_name}")
def list_{entity_name}(skip: int = 0, limit: int = 10):
    """Get all {entity_name}"""
    items = list({entity_name}_db.values())[skip:skip+limit]
    return {{"total": len({entity_name}_db), "items": items}}

@app.post("/{entity_name}")
def create_{singular}(name: str, description: str = ""):
    """Create new {singular}"""
    global {entity_name}_counter
    item = {{"id": {entity_name}_counter, "name": name, "description": description}}
    {entity_name}_db[{entity_name}_counter] = item
    {entity_name}_counter += 1
    return item

@app.get("/{entity_name}/{{item_id}}")
def get_{singular}(item_id: int):
    """Get {singular} by ID"""
    if item_id not in {entity_name}_db:
        raise HTTPException(status_code=404, detail="{singular} not found")
    return {entity_name}_db[item_id]

@app.put("/{entity_name}/{{item_id}}")
def update_{singular}(item_id: int, name: str = None, description: str = None):
    """Update {singular}"""
    if item_id not in {entity_name}_db:
        raise HTTPException(status_code=404, detail="{singular} not found")
    if name:
        {entity_name}_db[item_id]["name"] = name
    if description:
        {entity_name}_db[item_id]["description"] = description
    return {entity_name}_db[item_id]

@app.delete("/{entity_name}/{{item_id}}")
def delete_{singular}(item_id: int):
    """Delete {singular}"""
    if item_id not in {entity_name}_db:
        raise HTTPException(status_code=404, detail="{singular} not found")
    del {entity_name}_db[item_id]
    return {{"status": "deleted", "id": item_id}}
'''
    
    def _generate_default_endpoints(self) -> str:
        """Generate default endpoints when no epics are defined"""
        return '''# Default endpoints
@app.get('/items')
def list_items(skip: int = 0, limit: int = 10):
    """List all items"""
    return {"total": 0, "items": []}

@app.post('/items')
def create_item(name: str, description: str = ""):
    """Create new item"""
    return {"id": 1, "name": name, "description": description}
'''

    def _generate_database(self, project_dir: str, app_name: str, epics_and_stories: Dict):
        """Generate PostgreSQL DDL code based on stories"""
        ddl_dir = os.path.join(project_dir, "ddl")
        os.makedirs(ddl_dir)
        
        # Generate init.sql with actual tables based on stories
        tables_sql = self._generate_tables_from_stories(epics_and_stories)
        
        db_name = app_name.lower().replace(' ', '_').replace('-', '_')
        init_sql = f"""-- PostgreSQL DDL for {app_name}
-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
-- This file sets up the database schema

-- Create database (uncomment and run manually if database doesn't exist)
-- CREATE DATABASE {db_name};

-- Create schema
CREATE SCHEMA IF NOT EXISTS public;

-- Set default schema
SET search_path TO public;

-- ============ AUTO-GENERATED TABLES ============

{tables_sql}

-- ============ INDEXES ============
-- Add indexes for frequently queried columns

-- ============ CONSTRAINTS ============
-- Add foreign key constraints and unique constraints

-- ============ DATA ============
-- Add initial data if needed
"""
        with open(os.path.join(ddl_dir, "init.sql"), "w", encoding='utf-8') as f:
            f.write(init_sql)
        
        # Create migrations folder
        migrations_dir = os.path.join(ddl_dir, "migrations")
        os.makedirs(migrations_dir)
        
        # Create a sample migration template
        migration_template = """-- Migration template
-- Use this file to add schema changes over time
-- Example: ALTER TABLE table_name ADD COLUMN column_name TYPE;
"""
        with open(os.path.join(migrations_dir, "001_initial_schema.sql"), "w", encoding='utf-8') as f:
            f.write(migration_template)
    
    def _extract_domain_entity(self, text: str) -> str:
        """Extract domain entity from epic/story title
        Examples:
        - "Student Registration" → "students"
        - "Course Management" → "courses"
        - "Admin Module" → "admins"
        - "User Authentication" → "users"
        """
        # Remove common words
        stop_words = {'module', 'management', 'system', 'feature', 'implementation', 'a', 'the', 'of', 'and'}
        
        # Extract nouns/entities
        words = text.lower().split()
        entity_words = [w for w in words if w not in stop_words and len(w) > 2]
        
        if not entity_words:
            entity_words = words
        
        # Use first meaningful word and pluralize
        entity = entity_words[0] if entity_words else text.lower()
        
        # Simple pluralization
        if not entity.endswith('s'):
            entity = entity + 's' if not entity.endswith('y') else entity[:-1] + 'ies'
        
        return entity

    def _generate_tables_from_stories(self, epics_and_stories: Dict) -> str:
        """Generate DDL table definitions with AI-powered schema design"""
        tables = []
        created_tables = set()
        
        if epics_and_stories.get("epics"):
            for epic_id, epic_data in epics_and_stories["epics"].items():
                epic_obj = epic_data.get("epic")
                stories = epic_data.get("stories", [])
                
                if epic_obj:
                    epic_title = epic_obj.epic_title
                    entity_name = self._extract_domain_entity(epic_title)
                    
                    if entity_name and entity_name[0].isdigit():
                        entity_name = 'item_' + entity_name
                    
                    if entity_name not in created_tables:
                        try:
                            # Use AI to generate database schema
                            stories_desc = "; ".join([s.get("story_title", "Story") for s in stories])
                            prompt = f"""Generate a complete PostgreSQL table definition for:
Entity: {entity_name}
Epic: {epic_title}
Stories/Operations: {stories_desc}

REQUIREMENTS:
1. Main table for {entity_name} entity
2. Appropriate columns based on entity type and stories
3. Proper PostgreSQL data types (VARCHAR, INTEGER, TIMESTAMP, BOOLEAN, TEXT, JSON, etc.)
4. NOT NULL constraints where appropriate
5. DEFAULT values where applicable
6. PRIMARY KEY (id SERIAL PRIMARY KEY)
7. Timestamps (created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP)
8. Status field for state tracking (active, inactive, archived)
9. Unique constraints where needed
10. Indexes for commonly queried fields
11. Clear SQL comments explaining each field
12. CHECK constraints for data validation

Return ONLY the SQL CREATE TABLE statement and indexes, no explanations."""
                            
                            table_code = self.agent.generate_code(prompt, language="sql", max_tokens=2048)
                            tables.append(table_code)
                        except Exception as e:
                            print(f"Error generating table with AI: {e}")
                            tables.append(self._generate_table_template(entity_name, epic_title))
                        
                        created_tables.add(entity_name)
        
        if not tables:
            tables.append(self._generate_default_table())
        
        return "\n".join(tables)
    
    def _generate_table_template(self, entity_name: str, epic_title: str) -> str:
        """Fallback table template"""
        return f"""-- {epic_title}
CREATE TABLE IF NOT EXISTS {entity_name} (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- Create trigger for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER {entity_name}_updated_at_trigger
BEFORE UPDATE ON {entity_name}
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_{entity_name}_status ON {entity_name}(status);
CREATE INDEX IF NOT EXISTS idx_{entity_name}_created_at ON {entity_name}(created_at);
CREATE INDEX IF NOT EXISTS idx_{entity_name}_name ON {entity_name}(name);
"""
    
    def _generate_default_table(self) -> str:
        """Generate default table when no epics are defined"""
        return """-- Default items table
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at_trigger
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION update_items_updated_at();

CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
"""

    def _generate_readme(self, project_dir: str, app_name: str):
        """Generate README.md"""
        readme = f"""# {app_name}

Complete full-stack application generated automatically.

## Project Structure

```
{app_name}/
├── frontend/        - React application
├── microservice/    - Python FastAPI backend
└── ddl/            - PostgreSQL database schemas
```

## Getting Started

### Frontend
```bash
cd frontend
npm install
npm start
```

### Backend
```bash
cd microservice
pip install -r requirements.txt
python main.py
```

### Database
```bash
psql -U postgres -f ddl/init.sql
```

## Requirements

- Node.js >= 16
- Python >= 3.8
- PostgreSQL >= 12

## Development

Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        with open(os.path.join(project_dir, "README.md"), "w", encoding='utf-8') as f:
            f.write(readme)

    def _push_to_github(self, project_dir: str, app_name: str, github_token: str) -> str:
        """Push generated code to GitHub"""
        try:
            # Initialize git repository
            subprocess.run(["git", "init"], cwd=project_dir, check=True, capture_output=True)
            subprocess.run(["git", "config", "user.email", "codegen@example.com"], cwd=project_dir, check=True, capture_output=True)
            subprocess.run(["git", "config", "user.name", "Code Generator"], cwd=project_dir, check=True, capture_output=True)
            
            # Add all files
            subprocess.run(["git", "add", "."], cwd=project_dir, check=True, capture_output=True)
            
            # Create initial commit
            subprocess.run(["git", "commit", "-m", "Initial commit: Generated project"], cwd=project_dir, check=True, capture_output=True)
            
            # Create GitHub repository via API
            repo_name = f"{app_name.lower().replace(' ', '-')}-generated"
            repo_url = self._create_github_repo(repo_name, github_token)
            
            # Add remote and push
            remote_url = f"https://{github_token}@github.com/{self._get_github_username(github_token)}/{repo_name}.git"
            subprocess.run(["git", "remote", "add", "origin", remote_url], cwd=project_dir, check=True, capture_output=True)
            subprocess.run(["git", "branch", "-M", "main"], cwd=project_dir, check=True, capture_output=True)
            subprocess.run(["git", "push", "-u", "origin", "main"], cwd=project_dir, check=True, capture_output=True)
            
            return f"https://github.com/{self._get_github_username(github_token)}/{repo_name}"
        except Exception as e:
            print(f"ERROR in _push_to_github: {str(e)}")
            raise

    def _create_github_repo(self, repo_name: str, github_token: str) -> str:
        """Create a new repository on GitHub"""
        import requests
        
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        data = {
            "name": repo_name,
            "description": "Auto-generated full-stack project",
            "private": False,
            "auto_init": False
        }
        
        response = requests.post(
            "https://api.github.com/user/repos",
            headers=headers,
            json=data
        )
        
        if response.status_code not in [201, 200]:
            raise Exception(f"Failed to create GitHub repository: {response.text}")
        
        return response.json()["html_url"]

    def _get_github_username(self, github_token: str) -> str:
        """Get GitHub username from token"""
        import requests
        
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        response = requests.get("https://api.github.com/user", headers=headers)
        if response.status_code != 200:
            raise Exception(f"Failed to get GitHub user info: {response.text}")
        
        return response.json()["login"]
