# Codegen Module

This module handles all code generation related operations for the application.

## Structure

```
backend/codegen/
├── __init__.py           # Package initialization
├── codegen_crud.py       # Database operations for codegen items
└── README.md            # This file
```

## Components

### codegen_crud.py
Contains CRUD operations for retrieving epics and stories for code generation:

- `get_codegen_items_for_project()` - Get all epics and stories for a project
- `get_epic_for_codegen()` - Get a specific epic
- `get_stories_for_epic()` - Get stories for a specific epic

## API Endpoints

### Get Codegen Items
**Endpoint:** `GET /project-items/{project_id}`

**Description:** Fetch all epics and stories for a project organized by epic

**Response:**
```json
{
  "project_id": 1,
  "epics": {
    "1": {
      "epic": {
        "id": 1,
        "epic_title": "User Authentication",
        "story_title": null
      },
      "stories": [
        {
          "id": 2,
          "epic_title": "User Authentication",
          "story_title": "Implement login endpoint"
        }
      ]
    }
  }
}
```

## Frontend Integration

The frontend `CodegenItems` component displays these items in a list view:
- Epics are shown with the 📚 icon
- Stories are shown with the 📖 icon
- Stories show which epic they belong to

## Usage Example

```python
from codegen.codegen_crud import get_codegen_items_for_project

# In a route handler
items = get_codegen_items_for_project(db, project_id=123)
return items
```

## Future Enhancements

This module can be extended to include:
- Code generation logic
- Template management
- Code formatting and validation
- Implementation tracking
