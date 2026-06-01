"""
Microservice Architecture Analyzer
Analyzes project epics and stories to suggest optimal microservice breakdown
"""

from typing import Dict, List, Any


class MicroserviceAnalyzer:
    """Analyzes epics and stories to suggest microservice architecture"""
    
    # Microservice archetypes with keywords
    ARCHETYPE_KEYWORDS = {
        "Auth": ["login", "auth", "password", "token", "session", "oauth", "permission", "role", "user"],
        "User": ["user", "profile", "account", "setting", "preference", "information"],
        "Student": ["student", "enrollment", "registration", "admission", "course"],
        "Grade": ["grade", "mark", "score", "result", "academic", "performance"],
        "Attendance": ["attendance", "present", "absent", "leave", "attendance"],
        "Communication": ["notification", "message", "email", "alert", "announcement"],
        "Report": ["report", "analytics", "dashboard", "statistics", "export"],
        "Payment": ["payment", "fee", "invoice", "billing", "transaction"],
    }
    
    def __init__(self):
        self.base_port = 8001
        
    def analyze(self, epics_and_stories: Dict) -> Dict:
        """
        Analyze epics and stories to suggest microservice breakdown
        
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
        
        Returns:
            {
                "total_microservices": int,
                "microservices": [
                    {
                        "id": "auth",
                        "name": "Authentication Service",
                        "port": 8001,
                        "epics": [...],
                        "reasoning": "..."
                    }
                ]
            }
        """
        epics_dict = epics_and_stories.get("epics", {})
        
        # Extract epic information
        epic_list = []
        for epic_id, epic_info in epics_dict.items():
            epic_obj = epic_info.get("epic") if isinstance(epic_info, dict) else None
            
            # Handle both dict and ORM object
            if epic_obj is None:
                epic_title = f"Epic {epic_id}"
                epic_description = ""
            elif hasattr(epic_obj, 'epic_title'):
                epic_title = epic_obj.epic_title
                epic_description = getattr(epic_obj, 'description', "")
            elif isinstance(epic_obj, dict):
                epic_title = epic_obj.get("epic_title", f"Epic {epic_id}")
                epic_description = epic_obj.get("description", "")
            else:
                epic_title = f"Epic {epic_id}"
                epic_description = ""
            
            # Extract stories
            stories = epic_info.get("stories", []) if isinstance(epic_info, dict) else []
            stories_count = len(stories)
            story_titles = []
            
            for s in stories:
                if hasattr(s, 'story_title'):
                    story_titles.append(s.story_title)
                elif isinstance(s, dict):
                    story_titles.append(s.get("story_title", ""))
                else:
                    story_titles.append(str(s))
            
            epic_list.append({
                "epic_id": epic_id,
                "title": epic_title,
                "stories_count": stories_count,
                "story_titles": story_titles,
                "description": epic_description
            })
        
        # Group epics into microservices
        microservices = self._group_into_microservices(epic_list)
        
        return {
            "total_epics": len(epic_list),
            "total_microservices": len(microservices),
            "microservices": microservices
        }
    
    def _group_into_microservices(self, epic_list: List[Dict]) -> List[Dict]:
        """Group epics into logical microservices"""
        microservices = []
        assigned_epics = set()
        
        # First pass: Assign epics to archetypes
        for archetype_name, keywords in self.ARCHETYPE_KEYWORDS.items():
            assigned_to_archetype = []
            
            for epic in epic_list:
                if epic["epic_id"] in assigned_epics:
                    continue
                
                # Check if epic matches this archetype
                epic_text = (epic["title"] + " " + " ".join(epic["story_titles"])).lower()
                
                if self._matches_archetype(epic_text, keywords):
                    assigned_to_archetype.append(epic)
                    assigned_epics.add(epic["epic_id"])
            
            # Create microservice if we have matching epics
            if assigned_to_archetype:
                microservice = self._create_microservice(
                    archetype_name,
                    assigned_to_archetype,
                    len(microservices)
                )
                microservices.append(microservice)
        
        # Second pass: Handle unassigned epics
        unassigned = [e for e in epic_list if e["epic_id"] not in assigned_epics]
        for epic in unassigned:
            microservice = self._create_microservice(
                epic["title"],
                [epic],
                len(microservices)
            )
            microservices.append(microservice)
        
        return microservices
    
    def _matches_archetype(self, text: str, keywords: List[str]) -> bool:
        """Check if text matches archetype keywords"""
        for keyword in keywords:
            if keyword.lower() in text:
                return True
        return False
    
    def _create_microservice(self, name: str, epics: List[Dict], index: int) -> Dict:
        """Create microservice object"""
        port = self.base_port + index
        
        # Build service name
        service_name = f"{name} Service"
        service_id = name.lower().replace(" ", "_")
        
        # Count total stories
        total_stories = sum(e["stories_count"] for e in epics)
        
        # Build reasoning
        if len(epics) == 1:
            reasoning = f"Single responsibility: {epics[0]['title']}"
        else:
            epic_titles = ", ".join(e["title"] for e in epics)
            reasoning = f"Related features: {epic_titles}"
        
        return {
            "id": service_id,
            "name": service_name,
            "port": port,
            "base_url": f"http://localhost:{port}",
            "epics": [
                {
                    "id": e["epic_id"],
                    "title": e["title"],
                    "stories": e["story_titles"]
                }
                for e in epics
            ],
            "total_epics": len(epics),
            "total_stories": total_stories,
            "reasoning": reasoning,
            "database": f"{service_id}_db",
            "database_port": 5432 + index,
        }
