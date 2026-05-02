from sqlalchemy.orm import Session
def get_all_users(db: Session):
    return db.query(models.User).all()

def delete_user(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
        return True
    return False
import logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
from sqlalchemy.orm import Session
import models
import schemas
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    import logging
    # Truncate password to 72 characters for bcrypt
    password = user.password[:72]
    hashed_password = pwd_context.hash(password)
    db_user = models.User(email=user.email, hashed_password=hashed_password, role=user.role)
    db.add(db_user)
    try:
        db.commit()
        db.refresh(db_user)
        logging.info(f"User created: {db_user.email}, id: {db_user.id}")
        return db_user
    except Exception as e:
        db.rollback()
        logging.error(f"Error creating user: {e}")
        raise

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return None
    # Truncate password to 72 characters for bcrypt
    password = password[:72]
    if not pwd_context.verify(password, user.hashed_password):
        return None
    return user

def change_password(db: Session, email: str, current_password: str, new_password: str):
    """Change user password"""
    user = get_user_by_email(db, email)
    if not user:
        return False, "User not found"
    
    # Verify current password
    current_password = current_password[:72]
    if not pwd_context.verify(current_password, user.hashed_password):
        return False, "Current password is incorrect"
    
    # Hash new password
    new_password = new_password[:72]
    user.hashed_password = pwd_context.hash(new_password)
    
    try:
        db.commit()
        db.refresh(user)
        logging.info(f"Password changed for user: {user.email}")
        return True, "Password changed successfully"
    except Exception as e:
        db.rollback()
        logging.error(f"Error changing password: {e}")
        return False, str(e)


# ==================== CHAT CRUD OPERATIONS ====================

def create_chat(db: Session, user_id: int, title: str = "New Chat"):
    """Create a new chat for a user"""
    db_chat = models.Chat(user_id=user_id, title=title, messages="[]")
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    return db_chat

def get_chat(db: Session, chat_id: int, user_id: int):
    """Get a specific chat (verify it belongs to the user)"""
    return db.query(models.Chat).filter(
        models.Chat.id == chat_id,
        models.Chat.user_id == user_id
    ).first()

def get_user_chats(db: Session, user_id: int):
    """Get all chats for a user"""
    return db.query(models.Chat).filter(
        models.Chat.user_id == user_id
    ).order_by(models.Chat.updated_at.desc()).all()

def update_chat_messages(db: Session, chat_id: int, user_id: int, messages: str):
    """Update chat messages"""
    db_chat = get_chat(db, chat_id, user_id)
    if db_chat:
        db_chat.messages = messages
        db.commit()
        db.refresh(db_chat)
    return db_chat

def update_chat_title(db: Session, chat_id: int, user_id: int, title: str):
    """Update chat title"""
    db_chat = get_chat(db, chat_id, user_id)
    if db_chat:
        db_chat.title = title
        db.commit()
        db.refresh(db_chat)
    return db_chat



def delete_chat(db: Session, chat_id: int, user_id: int):
    """Delete a chat"""
    db_chat = get_chat(db, chat_id, user_id)
    if db_chat:
        db.delete(db_chat)
        db.commit()
        return True
    return False


# ==================== PROJECT ITEMS CRUD OPERATIONS ====================

def create_project_item(db: Session, project_item: schemas.ProjectItemCreate):
    """Create a single epic or story entry in the project_items table"""
    try:
        db_entry = models.ProjectItem(
            project_id=project_item.project_id,
            user_id=project_item.user_id,
            epic_id=project_item.epic_id,
            story_id=project_item.story_id,
            epic_title=project_item.epic_title,
            story_title=project_item.story_title,
            description=project_item.description
        )
        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)
        return db_entry
    except Exception as e:
        db.rollback()
        raise Exception(f"Error creating project item: {str(e)}")

def batch_save_project_item(db: Session, batch_data: schemas.BatchSaveProjectItem):
    """Save epic and multiple stories to the project_items table (titles only, no descriptions)"""
    try:
        created_entries = []
        
        print(f"DEBUG CRUD: Starting batch save for project_id={batch_data.project_id}")
        
        # Save the epic (story_id = 0 indicates this is an epic)
        db_epic = models.ProjectItem(
            project_id=batch_data.project_id,
            user_id=batch_data.user_id,
            epic_id=batch_data.epic_id,
            story_id=0,  # 0 indicates epic
            epic_title=batch_data.epic_title,  # Store epic title for consistency
            story_title=None,  # No story title for epic entries
            description=batch_data.epic_description  # STORE epic description
        )
        print(f"DEBUG CRUD: Adding epic entry: {batch_data.epic_title}")
        db.add(db_epic)
        created_entries.append(db_epic)
        
        # Save all stories
        for idx, story in enumerate(batch_data.stories):
            print(f"DEBUG CRUD: Adding story {idx+1}/{len(batch_data.stories)}: {story.get('story_title', '')}")
            db_story = models.ProjectItem(
                project_id=batch_data.project_id,
                user_id=batch_data.user_id,
                epic_id=batch_data.epic_id,
                story_id=story.get("story_id", 0),
                epic_title=batch_data.epic_title,  # Reference to parent epic
                story_title=story.get("story_title", ""),  # Store story title ONLY
                description=None  # Do NOT store description/acceptance criteria
            )
            db.add(db_story)
            created_entries.append(db_story)
        
        print(f"DEBUG CRUD: Committing {len(created_entries)} entries to DB")
        db.commit()
        for entry in created_entries:
            db.refresh(entry)
        
        print(f"DEBUG CRUD: Batch save completed successfully - Saved 1 Epic + {len(batch_data.stories)} Stories")
        return created_entries
    except Exception as e:
        print(f"ERROR CRUD: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise Exception(f"Error batch saving project items: {str(e)}")

def get_project_items_by_epic(db: Session, project_id: int, epic_id: int):
    """Get all stories for a specific epic in a project"""
    return db.query(models.ProjectItem).filter(
        models.ProjectItem.project_id == project_id,
        models.ProjectItem.epic_id == epic_id,
        models.ProjectItem.story_id > 0  # Exclude the epic itself
    ).order_by(models.ProjectItem.created_at.asc()).all()

def get_project_epic(db: Session, project_id: int, epic_id: int):
    """Get the epic entry for a specific project"""
    return db.query(models.ProjectItem).filter(
        models.ProjectItem.project_id == project_id,
        models.ProjectItem.epic_id == epic_id,
        models.ProjectItem.story_id == 0  # Get the epic itself
    ).first()

def get_all_project_items(db: Session, project_id: int):
    """Get all epics and stories for a project"""
    return db.query(models.ProjectItem).filter(
        models.ProjectItem.project_id == project_id
    ).order_by(models.ProjectItem.epic_id.asc(), models.ProjectItem.story_id.asc()).all()

def delete_project_items_by_epic(db: Session, project_id: int, epic_id: int):
    """Delete an epic and all its stories from the project"""
    try:
        db.query(models.ProjectItem).filter(
            models.ProjectItem.project_id == project_id,
            models.ProjectItem.epic_id == epic_id
        ).delete()
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise Exception(f"Error deleting project items: {str(e)}")

def update_project_item(db: Session, entry_id: int, description: str):
    """Update description of an epic or story entry"""
    try:
        db_entry = db.query(models.ProjectItem).filter(
            models.ProjectItem.id == entry_id
        ).first()
        
        if db_entry:
            db_entry.description = description
            db.commit()
            db.refresh(db_entry)
            return db_entry
        return None
    except Exception as e:
        db.rollback()
        raise Exception(f"Error updating project item: {str(e)}")
