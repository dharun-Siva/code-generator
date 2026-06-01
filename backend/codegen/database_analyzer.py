"""
Database Architecture Analyzer
Analyzes project epics and stories to intelligently preview PostgreSQL table structure
Extracts domain entities from story content to create meaningful tables
"""

from typing import Dict, List, Any, Set
import re


class DatabaseAnalyzer:
    """Analyzes epics and stories to intelligently preview database structure"""
    
    # Entity keywords that suggest what tables are needed
    ENTITY_KEYWORDS = {
        'users': ['user', 'account', 'profile', 'authentication', 'login', 'password', 'email'],
        'students': ['student', 'enrollment', 'learner', 'participant', 'attendee'],
        'courses': ['course', 'class', 'subject', 'module', 'curriculum', 'training'],
        'instructors': ['instructor', 'teacher', 'professor', 'educator', 'trainer'],
        'grades': ['grade', 'mark', 'score', 'result', 'academic', 'performance'],
        'enrollments': ['enroll', 'registration', 'registration', 'admission'],
        'attendance': ['attendance', 'present', 'absent', 'attendance record'],
        'payments': ['payment', 'fee', 'invoice', 'billing', 'transaction'],
        'departments': ['department', 'division', 'unit', 'team', 'group'],
        'assignments': ['assignment', 'homework', 'task', 'project', 'exercise'],
        'notifications': ['notification', 'alert', 'message', 'email', 'communication'],
        'resources': ['resource', 'material', 'document', 'file', 'attachment'],
    }
    
    # Table schemas with meaningful columns
    TABLE_SCHEMAS = {
        'users': {
            'display_name': '👤 Users',
            'description': 'Core user accounts and authentication',
            'columns': [
                {'name': 'id', 'type': 'SERIAL PRIMARY KEY', 'description': 'User ID'},
                {'name': 'username', 'type': 'VARCHAR(100) UNIQUE NOT NULL', 'description': 'Unique username'},
                {'name': 'email', 'type': 'VARCHAR(255) UNIQUE NOT NULL', 'description': 'Email address'},
                {'name': 'password_hash', 'type': 'VARCHAR(255) NOT NULL', 'description': 'Hashed password'},
                {'name': 'first_name', 'type': 'VARCHAR(100)', 'description': 'First name'},
                {'name': 'last_name', 'type': 'VARCHAR(100)', 'description': 'Last name'},
                {'name': 'phone', 'type': 'VARCHAR(20)', 'description': 'Phone number'},
                {'name': 'is_active', 'type': 'BOOLEAN DEFAULT true', 'description': 'Account status'},
                {'name': 'created_at', 'type': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'description': 'Registration date'},
                {'name': 'updated_at', 'type': 'TIMESTAMP', 'description': 'Last update'},
            ]
        },
        'students': {
            'display_name': '📚 Students',
            'description': 'Student profiles and information',
            'columns': [
                {'name': 'id', 'type': 'SERIAL PRIMARY KEY', 'description': 'Student ID'},
                {'name': 'user_id', 'type': 'INTEGER NOT NULL', 'description': 'Reference to users table', 'foreign_key': True},
                {'name': 'student_number', 'type': 'VARCHAR(50) UNIQUE NOT NULL', 'description': 'Student ID number'},
                {'name': 'date_of_birth', 'type': 'DATE', 'description': 'Date of birth'},
                {'name': 'gender', 'type': 'VARCHAR(20)', 'description': 'Gender'},
                {'name': 'address', 'type': 'TEXT', 'description': 'Student address'},
                {'name': 'enrollment_date', 'type': 'DATE', 'description': 'Enrollment date'},
                {'name': 'status', 'type': "VARCHAR(50) DEFAULT 'active'", 'description': 'Enrollment status'},
                {'name': 'created_at', 'type': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'description': 'Record creation date'},
                {'name': 'updated_at', 'type': 'TIMESTAMP', 'description': 'Last update'},
            ]
        },
        'courses': {
            'display_name': '📖 Courses',
            'description': 'Course catalog and course details',
            'columns': [
                {'name': 'id', 'type': 'SERIAL PRIMARY KEY', 'description': 'Course ID'},
                {'name': 'course_code', 'type': 'VARCHAR(50) UNIQUE NOT NULL', 'description': 'Course code'},
                {'name': 'course_name', 'type': 'VARCHAR(255) NOT NULL', 'description': 'Course name'},
                {'name': 'description', 'type': 'TEXT', 'description': 'Course description'},
                {'name': 'credits', 'type': 'INTEGER', 'description': 'Credit hours'},
                {'name': 'department', 'type': 'VARCHAR(100)', 'description': 'Department'},
                {'name': 'instructor_id', 'type': 'INTEGER', 'description': 'Reference to instructors table', 'foreign_key': True},
                {'name': 'max_students', 'type': 'INTEGER', 'description': 'Maximum students capacity'},
                {'name': 'is_active', 'type': 'BOOLEAN DEFAULT true', 'description': 'Course status'},
                {'name': 'created_at', 'type': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'description': 'Creation date'},
            ]
        },
        'instructors': {
            'display_name': '👨‍🏫 Instructors',
            'description': 'Instructor/Teacher profiles',
            'columns': [
                {'name': 'id', 'type': 'SERIAL PRIMARY KEY', 'description': 'Instructor ID'},
                {'name': 'user_id', 'type': 'INTEGER NOT NULL', 'description': 'Reference to users table', 'foreign_key': True},
                {'name': 'employee_id', 'type': 'VARCHAR(50) UNIQUE', 'description': 'Employee ID'},
                {'name': 'department', 'type': 'VARCHAR(100)', 'description': 'Department'},
                {'name': 'specialization', 'type': 'VARCHAR(255)', 'description': 'Area of expertise'},
                {'name': 'qualification', 'type': 'TEXT', 'description': 'Qualifications'},
                {'name': 'office_hours', 'type': 'VARCHAR(255)', 'description': 'Office hours'},
                {'name': 'status', 'type': "VARCHAR(50) DEFAULT 'active'", 'description': 'Employment status'},
                {'name': 'created_at', 'type': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'description': 'Hire date'},
            ]
        },
        'enrollments': {
            'display_name': '📝 Enrollments',
            'description': 'Student-Course enrollments',
            'columns': [
                {'name': 'id', 'type': 'SERIAL PRIMARY KEY', 'description': 'Enrollment ID'},
                {'name': 'student_id', 'type': 'INTEGER NOT NULL', 'description': 'Reference to students table', 'foreign_key': True},
                {'name': 'course_id', 'type': 'INTEGER NOT NULL', 'description': 'Reference to courses table', 'foreign_key': True},
                {'name': 'enrollment_date', 'type': 'DATE NOT NULL', 'description': 'Enrollment date'},
                {'name': 'status', 'type': "VARCHAR(50) DEFAULT 'active'", 'description': 'Enrollment status'},
                {'name': 'grade', 'type': "VARCHAR(2)", 'description': 'Final grade'},
                {'name': 'is_completed', 'type': 'BOOLEAN DEFAULT false', 'description': 'Completion status'},
                {'name': 'created_at', 'type': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'description': 'Record creation'},
            ]
        },
        'grades': {
            'display_name': '📊 Grades',
            'description': 'Student grades and academic performance',
            'columns': [
                {'name': 'id', 'type': 'SERIAL PRIMARY KEY', 'description': 'Grade ID'},
                {'name': 'enrollment_id', 'type': 'INTEGER NOT NULL', 'description': 'Reference to enrollments table', 'foreign_key': True},
                {'name': 'assignment_name', 'type': 'VARCHAR(255)', 'description': 'Assignment/Exam name'},
                {'name': 'score', 'type': 'DECIMAL(5,2)', 'description': 'Score obtained'},
                {'name': 'max_score', 'type': 'DECIMAL(5,2)', 'description': 'Maximum score'},
                {'name': 'percentage', 'type': 'DECIMAL(5,2)', 'description': 'Percentage score'},
                {'name': 'grade_letter', 'type': "VARCHAR(2)", 'description': 'Letter grade'},
                {'name': 'graded_date', 'type': 'DATE', 'description': 'Date graded'},
                {'name': 'created_at', 'type': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'description': 'Record creation'},
            ]
        },
        'attendance': {
            'display_name': '✓ Attendance',
            'description': 'Student attendance records',
            'columns': [
                {'name': 'id', 'type': 'SERIAL PRIMARY KEY', 'description': 'Attendance ID'},
                {'name': 'enrollment_id', 'type': 'INTEGER NOT NULL', 'description': 'Reference to enrollments table', 'foreign_key': True},
                {'name': 'attendance_date', 'type': 'DATE NOT NULL', 'description': 'Attendance date'},
                {'name': 'status', 'type': "VARCHAR(20) DEFAULT 'present'", 'description': 'Attendance status'},
                {'name': 'notes', 'type': 'TEXT', 'description': 'Additional notes'},
                {'name': 'created_at', 'type': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'description': 'Record creation'},
            ]
        },
        'notifications': {
            'display_name': '🔔 Notifications',
            'description': 'System notifications and messages',
            'columns': [
                {'name': 'id', 'type': 'SERIAL PRIMARY KEY', 'description': 'Notification ID'},
                {'name': 'user_id', 'type': 'INTEGER NOT NULL', 'description': 'Reference to users table', 'foreign_key': True},
                {'name': 'title', 'type': 'VARCHAR(255) NOT NULL', 'description': 'Notification title'},
                {'name': 'message', 'type': 'TEXT NOT NULL', 'description': 'Notification message'},
                {'name': 'type', 'type': "VARCHAR(50) DEFAULT 'info'", 'description': 'Notification type'},
                {'name': 'is_read', 'type': 'BOOLEAN DEFAULT false', 'description': 'Read status'},
                {'name': 'created_at', 'type': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'description': 'Creation date'},
            ]
        },
        'payments': {
            'display_name': '💳 Payments',
            'description': 'Payment and billing information',
            'columns': [
                {'name': 'id', 'type': 'SERIAL PRIMARY KEY', 'description': 'Payment ID'},
                {'name': 'student_id', 'type': 'INTEGER NOT NULL', 'description': 'Reference to students table', 'foreign_key': True},
                {'name': 'amount', 'type': 'DECIMAL(10,2) NOT NULL', 'description': 'Payment amount'},
                {'name': 'description', 'type': 'VARCHAR(255)', 'description': 'Payment description'},
                {'name': 'payment_date', 'type': 'DATE NOT NULL', 'description': 'Payment date'},
                {'name': 'due_date', 'type': 'DATE', 'description': 'Due date'},
                {'name': 'status', 'type': "VARCHAR(50) DEFAULT 'pending'", 'description': 'Payment status'},
                {'name': 'method', 'type': "VARCHAR(50)", 'description': 'Payment method'},
                {'name': 'created_at', 'type': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'description': 'Record creation'},
            ]
        },
    }
    
    def __init__(self):
        pass
    
    def analyze(self, epics_and_stories: Dict, microservices: List[Dict] = None) -> Dict:
        """
        Analyze epics and stories to intelligently preview database structure
        Distributes tables across microservices based on epic assignments
        
        Args:
            epics_and_stories: Dictionary with epics and stories
            microservices: Optional list of microservices with epic assignments
        
        Returns:
            Database analysis with tables distributed to microservices
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
                            "database": ms.get("database", f"{ms.get('id')}_db")
                        }
            
            # Extract all story and epic content by microservice
            all_content = []
            microservice_content = {}  # epic_id -> content
            
            for epic_id, epic_data in epics.items():
                epic = epic_data.get("epic", {})
                stories = epic_data.get("stories", [])
                
                epic_content = []
                if epic.get("epic_title"):
                    epic_content.append(epic.get("epic_title", "").lower())
                if epic.get("description"):
                    epic_content.append(epic.get("description", "").lower())
                
                for story in stories:
                    if story.get("story_title"):
                        epic_content.append(story.get("story_title", "").lower())
                    if story.get("description"):
                        epic_content.append(story.get("description", "").lower())
                
                microservice_content[epic_id] = epic_content
                all_content.extend(epic_content)
            
            # Extract entities mentioned in stories
            needed_entities = self._extract_entities(" ".join(all_content))
            
            # Distribute entities to microservices
            tables_by_microservice = self._distribute_tables_to_microservices(
                needed_entities, 
                epic_to_microservice, 
                microservice_content,
                microservices
            )
            
            # Create all tables with microservice info
            all_tables = []
            relationships = []
            
            for ms_id, entities in tables_by_microservice.items():
                for entity in sorted(entities):
                    if entity in self.TABLE_SCHEMAS:
                        schema = self.TABLE_SCHEMAS[entity]
                        table = {
                            "id": f"table_{entity}",
                            "name": entity,
                            "display_name": schema['display_name'],
                            "description": schema['description'],
                            "type": "main",
                            "microservice_id": ms_id,
                            "columns": schema['columns'],
                            "total_columns": len(schema['columns']),
                            "indexes": [i for i in [
                                {"name": f"{entity}_id_idx", "column": "id"},
                                {"name": f"{entity}_active_idx", "column": "is_active"} if self._has_column(schema['columns'], 'is_active') else None
                            ] if i is not None],
                            "trigger": f"trigger_{entity}_updated_at" if self._has_column(schema['columns'], 'updated_at') else None
                        }
                        all_tables.append(table)
            
            # Create relationships based on foreign keys (within same microservice or API calls)
            for table in all_tables:
                for col in table['columns']:
                    if col.get('foreign_key'):
                        ref_table = self._extract_table_reference(col['description'])
                        if ref_table:
                            # Find if referenced table is in same microservice
                            ref_table_ms = None
                            for t in all_tables:
                                if t['name'] == ref_table:
                                    ref_table_ms = t.get('microservice_id')
                                    break
                            
                            rel_type = "foreign_key" if ref_table_ms == table.get('microservice_id') else "api_call"
                            relationships.append({
                                "from_table": table['name'],
                                "from_microservice": table.get('microservice_id'),
                                "from_column": col['name'],
                                "to_table": ref_table,
                                "to_microservice": ref_table_ms,
                                "to_column": "id",
                                "type": rel_type,
                                "description": col['description']
                            })
            
            # Group tables by microservice for display
            microservices_with_tables = []
            if microservices:
                for ms in microservices:
                    ms_id = ms.get("id")
                    ms_tables = [t for t in all_tables if t.get('microservice_id') == ms_id]
                    if ms_tables:
                        microservices_with_tables.append({
                            "id": ms_id,
                            "name": ms.get("name"),
                            "port": ms.get("port"),
                            "database": ms.get("database", f"{ms_id}_db"),
                            "tables": ms_tables,
                            "total_tables": len(ms_tables)
                        })
            
            # Folder structure per microservice
            folder_structure = {
                "ddl/": {
                    "init.sql": "Main DDL with database initialization",
                    "migrations/": "Version control for future schema changes",
                    "microservices/": "Separate DDL per microservice database"
                }
            }
            
            return {
                "total_tables": len(all_tables),
                "total_relationships": len(relationships),
                "total_microservices": len(microservices_with_tables) if microservices else 1,
                "tables": all_tables,
                "relationships": relationships,
                "microservices_with_tables": microservices_with_tables,
                "folder_structure": folder_structure,
                "summary": {
                    "total_epics": len(epics),
                    "total_stories": sum(len(epic_data.get("stories", [])) for epic_data in epics.values()),
                    "database_type": "PostgreSQL 13+ (distributed per microservice)",
                    "timestamp_handling": "Automatic triggers for updated_at",
                    "relationships": "Enforced foreign keys within service, API calls between services",
                    "data_types": "SERIAL, VARCHAR, TEXT, BOOLEAN, TIMESTAMP, DATE, DECIMAL, JSONB",
                    "indexing": "B-tree indexes on IDs and foreign keys",
                    "extracted_entities": list(sorted(needed_entities)),
                    "architecture": "Microservices (Database per Service pattern)"
                }
            }
        except Exception as e:
            print(f"Error analyzing database structure: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "error": str(e),
                "total_tables": 0,
                "total_relationships": 0,
                "tables": [],
                "relationships": []
            }
    
    def _extract_entities(self, text: str) -> Set[str]:
        """Extract needed database entities from story content"""
        needed = set()
        
        for entity, keywords in self.ENTITY_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in text.lower():
                    needed.add(entity)
                    break
        
        # Always include users table as it's fundamental
        needed.add('users')
        
        return needed
    
    def _has_column(self, columns: List[Dict], col_name: str) -> bool:
        """Check if column exists in columns list"""
        return any(col['name'] == col_name for col in columns)
    
    def _extract_table_reference(self, description: str) -> str:
        """Extract table reference from description"""
        if 'users' in description.lower():
            return 'users'
        elif 'students' in description.lower():
            return 'students'
        elif 'courses' in description.lower():
            return 'courses'
        elif 'instructors' in description.lower():
            return 'instructors'
        elif 'enrollments' in description.lower():
            return 'enrollments'
        return None
    
    def _distribute_tables_to_microservices(
        self, 
        entities: Set[str], 
        epic_to_microservice: Dict,
        microservice_content: Dict,
        microservices: List[Dict]
    ) -> Dict:
        """
        Intelligently distribute tables across microservices based on:
        1. Epic assignments to microservices
        2. Entity relevance to each microservice
        3. Standard microservices patterns
        
        Returns:
            Dict mapping microservice_id -> list of entities
        """
        tables_by_ms = {}
        
        if not microservices:
            # Single service - all tables go to default service
            return {"default": entities}
        
        # Initialize microservices
        for ms in microservices:
            tables_by_ms[ms.get("id")] = set()
        
        # Pattern-based table assignments for common microservices
        for ms in microservices:
            ms_id = ms.get("id")
            ms_name = ms.get("name", "").lower()
            
            # Auth Service gets: users
            if "auth" in ms_name:
                if "users" in entities:
                    tables_by_ms[ms_id].add("users")
                    entities.discard("users")
            
            # Student Service gets: students, enrollments, courses, grades, attendance
            elif "student" in ms_name:
                for entity in ["students", "enrollments", "courses", "grades", "attendance"]:
                    if entity in entities:
                        tables_by_ms[ms_id].add(entity)
                        entities.discard(entity)
            
            # Course Service gets: courses, instructors
            elif "course" in ms_name:
                for entity in ["courses", "instructors"]:
                    if entity in entities:
                        tables_by_ms[ms_id].add(entity)
                        entities.discard(entity)
            
            # Payment Service gets: payments
            elif "payment" in ms_name:
                if "payments" in entities:
                    tables_by_ms[ms_id].add("payments")
                    entities.discard("payments")
            
            # Notification Service gets: notifications
            elif "notification" in ms_name:
                if "notifications" in entities:
                    tables_by_ms[ms_id].add("notifications")
                    entities.discard("notifications")
        
        # Assign remaining tables based on epic assignments
        for epic_id, ms_info in epic_to_microservice.items():
            if epic_id in microservice_content:
                content = " ".join(microservice_content[epic_id])
                # Extract entities relevant to this epic
                relevant_entities = self._extract_entities(content)
                
                for entity in relevant_entities:
                    if entity in entities and entity not in tables_by_ms.get(ms_info["id"], set()):
                        tables_by_ms[ms_info["id"]].add(entity)
                        entities.discard(entity)
        
        # Assign remaining unassigned tables to first microservice
        if entities and tables_by_ms:
            first_ms = list(tables_by_ms.keys())[0]
            for entity in entities:
                tables_by_ms[first_ms].add(entity)
        
        # Convert sets to lists
        return {ms_id: list(entities) for ms_id, entities in tables_by_ms.items()}

