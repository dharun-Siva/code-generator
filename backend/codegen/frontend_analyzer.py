"""
Frontend Architecture Analyzer
Analyzes project epics and stories to preview React component and page structure
"""

from typing import Dict, List, Any


class FrontendAnalyzer:
    """Analyzes epics and stories to preview frontend structure"""
    
    def __init__(self):
        pass
    
    def analyze(self, epics_and_stories: Dict, microservices: List[Dict] = None) -> Dict:
        """
        Analyze epics and stories to preview frontend structure
        
        Args:
            epics_and_stories: Dictionary with epics grouped by epic_id
                {
                    "project_id": int,
                    "epics": {
                        "epic_id": {
                            "epic": {...},
                            "stories": [...]
                        }
                    }
                }
            microservices: Optional list of microservices with epic assignments
                [
                    {
                        "id": "auth",
                        "name": "Authentication Service",
                        "port": 8001,
                        "base_url": "http://localhost:8001",
                        "epics": [{"epic_id": 1, ...}],
                        ...
                    }
                ]
        
        Returns:
            {
                "total_pages": int,
                "total_components": int,
                "pages": [
                    {
                        "id": "user-authentication",
                        "name": "User Authentication",
                        "filename": "UserAuthentication.js",
                        "route": "/user-authentication",
                        "components": [
                            {
                                "id": "login-with-email",
                                "name": "Login with Email",
                                "filename": "LoginWithEmail.js",
                                "type": "component",
                                "microservice": {
                                    "id": "auth",
                                    "name": "Authentication Service",
                                    "port": 8001,
                                    "base_url": "http://localhost:8001"
                                },
                                "api_base_url": "http://localhost:8001"
                            }
                        ],
                        "total_components": 3,
                        "microservice": {...}
                    }
                ],
                "services": [...],
                "summary": {...}
            }
        """
        try:
            epics = epics_and_stories.get("epics", {})
            
            # Build epic_id to microservice mapping if microservices provided
            epic_to_microservice = {}
            if microservices:
                for ms in microservices:
                    for epic_info in ms.get("epics", []):
                        epic_id = epic_info.get("epic_id") or epic_info.get("id")
                        epic_to_microservice[epic_id] = {
                            "id": ms.get("id"),
                            "name": ms.get("name"),
                            "port": ms.get("port"),
                            "base_url": ms.get("base_url", f"http://localhost:{ms.get('port', 8000)}")
                        }
            
            # Extract all pages and components
            pages = []
            components = []
            routes = []
            total_stories = 0
            
            for epic_id, epic_data in epics.items():
                epic = epic_data.get("epic", {})
                stories = epic_data.get("stories", [])
                
                epic_title = epic.get("epic_title", "Untitled Epic")
                
                # Convert to valid filename/route
                page_filename = self._to_pascal_case(epic_title)
                page_route = f"/{self._to_kebab_case(epic_title)}"
                page_id = self._to_kebab_case(epic_title)
                
                # Get microservice for this epic
                page_microservice = epic_to_microservice.get(epic_id) or (
                    epic_to_microservice.get(int(epic_id)) if isinstance(epic_id, str) and epic_id.isdigit() else None
                )
                
                # Collect components for this page (one per story)
                page_components = []
                for story in stories:
                    story_title = story.get("story_title", "Untitled Story")
                    component_filename = self._to_pascal_case(story_title)
                    component_id = self._to_kebab_case(story_title)
                    
                    # Determine API base URL (from microservice or default)
                    api_base_url = page_microservice.get("base_url") if page_microservice else "http://localhost:8000"
                    
                    component_obj = {
                        "id": component_id,
                        "name": story_title,
                        "filename": f"{component_filename}.js",
                        "type": "component"
                    }
                    
                    # Add microservice info if available
                    if page_microservice:
                        component_obj["microservice"] = page_microservice
                        component_obj["api_base_url"] = api_base_url
                    
                    page_components.append(component_obj)
                    
                    # Build component with microservice info
                    comp_dict = {
                        "id": component_id,
                        "name": story_title,
                        "filename": f"components/{component_filename}.js",
                        "parent_epic": epic_title,
                        "description": f"Component for: {story_title}"
                    }
                    
                    if page_microservice:
                        comp_dict["microservice"] = page_microservice
                        comp_dict["api_base_url"] = api_base_url
                    
                    components.append(comp_dict)
                    total_stories += 1
                
                # Add page with microservice info
                page = {
                    "id": page_id,
                    "name": epic_title,
                    "filename": f"pages/{page_filename}.js",
                    "route": page_route,
                    "components": page_components,
                    "total_components": len(page_components)
                }
                
                if page_microservice:
                    page["microservice"] = page_microservice
                
                pages.append(page)
                
                # Add route
                routes.append({
                    "path": page_route,
                    "page": page_filename,
                    "description": f"{epic_title} management"
                })
            
            # Add shared services
            services = [
                {
                    "name": "API Service",
                    "filename": "services/api.js",
                    "description": "Central API client for all microservice endpoints",
                    "exports": ["get", "post", "put", "delete", "setBaseURL"]
                },
                {
                    "name": "Utilities",
                    "filename": "services/utils.js",
                    "description": "Helper functions for data transformation and validation",
                    "exports": ["formatDate", "validateEmail", "sanitizeInput"]
                }
            ]
            
            # Folder structure
            folder_structure = {
                "src/": {
                    "pages/": f"React pages ({len(pages)} pages - one per epic)",
                    "components/": f"React components ({total_stories} components - one per story)",
                    "services/": "API client and utility functions",
                    "App.js": "Main app component with routing",
                    "index.js": "Application entry point",
                    "index.css": "Global styles"
                }
            }
            
            return {
                "total_pages": len(pages),
                "total_components": total_stories,
                "pages": pages,
                "components": components,
                "services": services,
                "folder_structure": folder_structure,
                "routing": routes,
                "summary": {
                    "total_epics": len(epics),
                    "total_stories": total_stories,
                    "framework": "React 18.2.0",
                    "routing_library": "React Router v6",
                    "api_client": "Axios",
                    "state_management": "React Hooks (useState, useEffect, useContext)"
                }
            }
        except Exception as e:
            print(f"Error analyzing frontend structure: {str(e)}")
            return {
                "error": str(e),
                "total_pages": 0,
                "total_components": 0,
                "pages": [],
                "components": [],
                "services": [],
                "routing": []
            }
    
    def _to_pascal_case(self, text: str) -> str:
        """Convert to PascalCase for component names"""
        words = text.replace('-', ' ').replace('_', ' ').split()
        return ''.join(word.capitalize() for word in words if word)
    
    def _to_kebab_case(self, text: str) -> str:
        """Convert to kebab-case for routes and IDs"""
        # Replace spaces and underscores with hyphens
        text = text.replace('_', '-').replace(' ', '-')
        # Convert to lowercase
        return text.lower()
