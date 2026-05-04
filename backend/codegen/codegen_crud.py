"""
Codegen CRUD operations for project items
This module handles all codegen-related database operations for epics and stories
"""

from sqlalchemy.orm import Session
import models


def get_codegen_items_for_project(db: Session, project_id: int):
    """
    Get all epics and stories for code generation from a project
    
    Args:
        db: Database session
        project_id: The project (chat) ID
    
    Returns:
        Dictionary with grouped epics and stories
    """
    entries = db.query(models.ProjectItem).filter(
        models.ProjectItem.project_id == project_id
    ).order_by(
        models.ProjectItem.epic_id.asc(), 
        models.ProjectItem.story_id.asc()
    ).all()
    
    # Group by epic_id
    grouped = {}
    for entry in entries:
        if entry.epic_id not in grouped:
            grouped[entry.epic_id] = {"epic": None, "stories": []}
        
        if entry.story_id == 0:
            grouped[entry.epic_id]["epic"] = entry
        else:
            grouped[entry.epic_id]["stories"].append(entry)
    
    return {
        "project_id": project_id,
        "epics": grouped,
        "total_items": len(entries)
    }


def get_epic_for_codegen(db: Session, project_id: int, epic_id: int):
    """
    Get a specific epic for code generation
    
    Args:
        db: Database session
        project_id: The project (chat) ID
        epic_id: The epic ID
    
    Returns:
        ProjectItem object or None
    """
    return db.query(models.ProjectItem).filter(
        models.ProjectItem.project_id == project_id,
        models.ProjectItem.epic_id == epic_id,
        models.ProjectItem.story_id == 0
    ).first()


def get_stories_for_epic(db: Session, project_id: int, epic_id: int):
    """
    Get all stories for a specific epic for code generation
    
    Args:
        db: Database session
        project_id: The project (chat) ID
        epic_id: The epic ID
    
    Returns:
        List of ProjectItem objects (stories only)
    """
    return db.query(models.ProjectItem).filter(
        models.ProjectItem.project_id == project_id,
        models.ProjectItem.epic_id == epic_id,
        models.ProjectItem.story_id > 0
    ).order_by(models.ProjectItem.story_id.asc()).all()
