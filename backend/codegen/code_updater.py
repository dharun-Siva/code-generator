"""
Code Update Generator
Handles incremental updates to existing generated projects on GitHub
Clones repo, generates new code, merges intelligently, commits and pushes
"""

import os
import json
import subprocess
import shutil
import tempfile
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
from urllib.parse import quote


class CodeUpdater:
    def __init__(self):
        self.temp_dir = None
        self.repo_dir = None

    def build_auth_url(self, repo_url: str, github_token: str) -> str:
        """Build GitHub auth URL with proper token format"""
        # Format: https://git:{TOKEN}@github.com/owner/repo
        # URL encode the token in case it has special characters
        encoded_token = quote(github_token, safe='')
        auth_url = repo_url.replace('https://', f'https://git:{encoded_token}@')
        return auth_url

    def sanitize_filename(self, name: str) -> str:
        """Remove invalid characters from filename"""
        # Remove/replace invalid filename characters
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            name = name.replace(char, '')
        # Remove leading/trailing spaces and dots
        name = name.strip(' .')
        # Limit length
        if len(name) > 200:
            name = name[:200]
        return name or 'Feature'

    def cleanup(self):
        """Clean up temporary directories with better error handling"""
        if self.temp_dir and os.path.exists(self.temp_dir):
            try:
                # Try normal deletion first
                shutil.rmtree(self.temp_dir)
            except Exception as e:
                # If it fails (usually git locks on Windows), try to delete what we can
                print(f"Warning: Could not fully clean temp directory: {e}")
                try:
                    # On Windows, git can lock files. Try a more aggressive approach
                    import time
                    time.sleep(0.5)  # Wait a bit for locks to release
                    shutil.rmtree(self.temp_dir, ignore_errors=True)
                except:
                    pass  # If all else fails, leave it for OS to cleanup

    def clone_repo(self, repo_url: str, github_token: str) -> str:
        """Clone GitHub repository and return path"""
        try:
            # Create temp directory
            self.temp_dir = tempfile.mkdtemp()
            self.repo_dir = os.path.join(self.temp_dir, 'repo')
            
            # Build auth URL with proper GitHub token format
            auth_url = self.build_auth_url(repo_url, github_token)
            
            # Clone repository
            try:
                result = subprocess.run(['git', 'clone', auth_url, self.repo_dir], 
                              check=True, capture_output=True, text=True)
            except subprocess.CalledProcessError as e:
                # Print stderr for debugging
                print(f"Git stderr: {e.stderr}")
                print(f"Git stdout: {e.stdout}")
                print(f"Attempting to clone from: {repo_url}")
                raise
            
            print(f"Repository cloned to: {self.repo_dir}")
            return self.repo_dir
            
        except subprocess.CalledProcessError as e:
            error_msg = f"Failed to clone repository: {str(e)}"
            if e.stderr:
                error_msg += f"\nDetails: {e.stderr}"
            raise Exception(error_msg)
        except Exception as e:
            raise Exception(f"Failed to clone repository: {str(e)}")

    def generate_new_component(self, story_title: str, story_id: int) -> Dict:
        """Generate new React component"""
        from agent import AIAgent
        agent = AIAgent()
        
        # Generate component name from story title and sanitize it
        component_name = ''.join(word.capitalize() for word in story_title.split())
        component_name = self.sanitize_filename(component_name)
        
        prompt = f"""Generate a React component for: {story_title}
        
Component name: {component_name}
Return ONLY valid JavaScript code starting with 'import' and ending with 'export default':

import React, {{ useState }} from 'react';

export default function {component_name}() {{
  // TODO: Implement {story_title}
  return <div>{component_name}</div>;
}}"""
        
        code = agent.chat(prompt)
        
        return {
            'name': component_name,
            'filename': f"{component_name}.js",
            'code': code
        }

    def generate_new_endpoint(self, story_title: str, story_id: int) -> Dict:
        """Generate new FastAPI endpoint"""
        from agent import AIAgent
        agent = AIAgent()
        
        endpoint_name = story_title.lower().replace(' ', '_')
        endpoint_name = self.sanitize_filename(endpoint_name)
        
        prompt = f"""Generate a FastAPI endpoint for: {story_title}

Endpoint name: {endpoint_name}
Return ONLY valid Python code (FastAPI endpoint):

@app.get("/api/{endpoint_name}")
async def get_{endpoint_name}():
    \"\"\"Get {story_title}\"\"\"
    # TODO: Implement {story_title}
    return {{"status": "pending", "feature": "{story_title}"}}

@app.post("/api/{endpoint_name}")
async def create_{endpoint_name}(data: dict):
    \"\"\"Create {story_title}\"\"\"
    # TODO: Implement {story_title}
    return {{"status": "created", "feature": "{story_title}"}}"""
        
        code = agent.chat(prompt)
        
        return {
            'name': endpoint_name,
            'method': 'POST/GET',
            'path': f"/api/{endpoint_name}",
            'code': code
        }

    def generate_database_table(self, story_title: str, story_id: int) -> Dict:
        """Generate database table schema"""
        table_name = story_title.lower().replace(' ', '_')
        table_name = self.sanitize_filename(table_name)
        
        sql = f"""-- Table for {story_title}
CREATE TABLE IF NOT EXISTS {table_name} (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_{table_name}_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_{table_name}_timestamp ON {table_name};
CREATE TRIGGER trigger_update_{table_name}_timestamp
    BEFORE UPDATE ON {table_name}
    FOR EACH ROW EXECUTE FUNCTION update_{table_name}_timestamp();"""
        
        return {
            'name': table_name,
            'filename': f"migration_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{table_name}.sql",
            'code': sql
        }

    def write_new_component(self, component: Dict) -> str:
        """Write new React component to file"""
        components_dir = os.path.join(self.repo_dir, 'frontend', 'src', 'components')
        os.makedirs(components_dir, exist_ok=True)
        
        filepath = os.path.join(components_dir, component['filename'])
        with open(filepath, 'w') as f:
            f.write(component['code'])
        
        return filepath

    def write_new_endpoint(self, endpoint: Dict) -> str:
        """Write new endpoint to backend"""
        endpoints_dir = os.path.join(self.repo_dir, 'microservice', 'routes')
        os.makedirs(endpoints_dir, exist_ok=True)
        
        endpoint_name = endpoint['name']
        filepath = os.path.join(endpoints_dir, f"{endpoint_name}.py")
        with open(filepath, 'w') as f:
            f.write(endpoint['code'])
        
        return filepath

    def update_app_js(self, component_name: str) -> bool:
        """Update App.js with new component import and route"""
        app_js_path = os.path.join(self.repo_dir, 'frontend', 'src', 'App.js')
        
        if not os.path.exists(app_js_path):
            print(f"Warning: App.js not found at {app_js_path}")
            return False
        
        try:
            with open(app_js_path, 'r') as f:
                content = f.read()
            
            # Add import if not already present
            if f"import {component_name}" not in content:
                import_line = f"import {component_name} from './components/{component_name}';\n"
                # Add after other imports
                if "import " in content:
                    import_section_end = content.rfind('import ')
                    import_section_end = content.find('\n', import_section_end) + 1
                    content = content[:import_section_end] + import_line + content[import_section_end:]
            
            # Add route if not already present
            route_path = f"/{component_name.lower()}"
            if f'path="{route_path}"' not in content and f"path='{route_path}'" not in content:
                route_line = f"          <Route path=\"{route_path}\" element={{<{component_name} />}} />\n"
                if '<Route ' in content:
                    last_route = content.rfind('<Route ')
                    last_route_end = content.find('>', last_route) + 1
                    last_route_end = content.find('\n', last_route_end) + 1
                    content = content[:last_route_end] + route_line + content[last_route_end:]
            
            with open(app_js_path, 'w') as f:
                f.write(content)
            
            return True
        except Exception as e:
            print(f"Error updating App.js: {str(e)}")
            return False

    def update_main_py(self, endpoint: Dict) -> bool:
        """Update main.py with new endpoint import"""
        main_py_path = os.path.join(self.repo_dir, 'microservice', 'main.py')
        
        if not os.path.exists(main_py_path):
            print(f"Warning: main.py not found at {main_py_path}")
            return False
        
        try:
            with open(main_py_path, 'r') as f:
                content = f.read()
            
            endpoint_name = endpoint['name']
            
            # Add import if not already present
            if f"from routes.{endpoint_name}" not in content:
                import_line = f"from routes.{endpoint_name} import *\n"
                if "from " in content:
                    import_section_end = content.rfind('from ')
                    import_section_end = content.find('\n', import_section_end) + 1
                    content = content[:import_section_end] + import_line + content[import_section_end:]
            
            with open(main_py_path, 'w') as f:
                f.write(content)
            
            return True
        except Exception as e:
            print(f"Error updating main.py: {str(e)}")
            return False

    def write_database_migration(self, migration: Dict) -> str:
        """Write database migration SQL file"""
        migrations_dir = os.path.join(self.repo_dir, 'ddl', 'migrations')
        os.makedirs(migrations_dir, exist_ok=True)
        
        filepath = os.path.join(migrations_dir, migration['filename'])
        with open(filepath, 'w') as f:
            f.write(migration['code'])
        
        return filepath

    def commit_and_push(self, github_token: str, commit_message: str, repo_url: str) -> str:
        """Commit changes and push to GitHub"""
        try:
            # Configure git
            subprocess.run(['git', 'config', 'user.email', 'codegen@example.com'], 
                          cwd=self.repo_dir, check=True, capture_output=True)
            subprocess.run(['git', 'config', 'user.name', 'Code Generator'], 
                          cwd=self.repo_dir, check=True, capture_output=True)
            
            # Detect the default branch from remote
            default_branch_result = subprocess.run(
                ['git', 'symbolic-ref', 'refs/remotes/origin/HEAD'],
                cwd=self.repo_dir, capture_output=True, text=True
            )
            
            # Parse branch name (format: "ref: refs/remotes/origin/main" or "ref: refs/remotes/origin/master")
            default_branch = 'main'  # fallback
            if default_branch_result.returncode == 0:
                branch_ref = default_branch_result.stdout.strip()
                if 'main' in branch_ref:
                    default_branch = 'main'
                elif 'master' in branch_ref:
                    default_branch = 'master'
            
            # Ensure we're on the correct branch
            subprocess.run(['git', 'checkout', default_branch], 
                          cwd=self.repo_dir, capture_output=True, text=True)
            
            # Add all changes
            subprocess.run(['git', 'add', '.'], 
                          cwd=self.repo_dir, check=True, capture_output=True)
            
            # Commit
            subprocess.run(['git', 'commit', '-m', commit_message], 
                          cwd=self.repo_dir, check=True, capture_output=True)
            
            # Build auth URL with proper GitHub token format
            auth_url = self.build_auth_url(repo_url, github_token)
            
            # Update remote with auth URL
            subprocess.run(['git', 'remote', 'set-url', 'origin', auth_url], 
                          cwd=self.repo_dir, check=True, capture_output=True)
            
            # Push to the detected default branch
            push_result = subprocess.run(['git', 'push', '-u', 'origin', default_branch], 
                          cwd=self.repo_dir, capture_output=True, text=True)
            
            if push_result.returncode == 0:
                return commit_message
            else:
                # If push fails, show detailed error
                raise Exception(f"Push failed: {push_result.stderr}")
                
        except subprocess.CalledProcessError as e:
            raise Exception(f"Git operation failed: {str(e)}")

    def generate_update(self, repo_url: str, github_token: str, 
                       story_ids: List[int] = None, 
                       custom_description: str = None,
                       feature_name: str = None,
                       feature_type: str = 'fullstack') -> Dict:
        """Generate and push code update to existing repository
        
        feature_type options:
        - 'frontend': Only generate React components
        - 'backend': Only generate API endpoints and database migrations
        - 'fullstack': Generate components, endpoints, and migrations
        """
        
        try:
            # Clone repository
            self.clone_repo(repo_url, github_token)
            
            components = []
            endpoints = []
            migrations = []
            
            # Generate for selected stories or custom feature
            if story_ids:
                for story_id in story_ids:
                    # In real implementation, fetch story title from DB
                    story_title = f"Feature {story_id}"
                    
                    # Generate frontend component
                    if feature_type in ['frontend', 'fullstack']:
                        component = self.generate_new_component(story_title, story_id)
                        components.append(component)
                        self.write_new_component(component)
                        self.update_app_js(component['name'])
                    
                    # Generate backend endpoint
                    if feature_type in ['backend', 'fullstack']:
                        endpoint = self.generate_new_endpoint(story_title, story_id)
                        endpoints.append(endpoint)
                        self.write_new_endpoint(endpoint)
                        self.update_main_py(endpoint)
                        
                        # Generate database migration
                        migration = self.generate_database_table(story_title, story_id)
                        migrations.append(migration)
                        self.write_database_migration(migration)
            
            else:  # Custom feature
                feature_name = feature_name or "CustomFeature"
                
                # Generate frontend component
                if feature_type in ['frontend', 'fullstack']:
                    component = self.generate_new_component(custom_description, 0)
                    components.append(component)
                    self.write_new_component(component)
                    self.update_app_js(component['name'])
                
                # Generate backend endpoint
                if feature_type in ['backend', 'fullstack']:
                    endpoint = self.generate_new_endpoint(custom_description, 0)
                    endpoints.append(endpoint)
                    self.write_new_endpoint(endpoint)
                    self.update_main_py(endpoint)
                    
                    # Generate database migration
                    migration = self.generate_database_table(custom_description, 0)
                    migrations.append(migration)
                    self.write_database_migration(migration)
            
            # Create commit message
            if story_ids:
                commit_message = f"Add features (Stories {','.join(map(str, story_ids))})"
            else:
                commit_message = f"Add custom feature: {custom_description[:50]}"
            
            # Commit and push
            self.commit_and_push(github_token, commit_message, repo_url)
            
            return {
                "status": "success",
                "message": commit_message,
                "components_added": len(components),
                "endpoints_added": len(endpoints),
                "migrations_added": len(migrations),
                "files_generated": components + endpoints + migrations
            }
            
        except Exception as e:
            print(f"ERROR in generate_update: {str(e)}")
            raise
        finally:
            self.cleanup()
