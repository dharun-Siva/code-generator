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


# ==================== DOCUMENT CRUD OPERATIONS ====================

def create_document(db: Session, user_id: int, filename: str, total_pages: int = 0):
    """Create a new document"""
    db_document = models.Document(
        user_id=user_id,
        filename=filename,
        total_pages=total_pages,
        status="uploaded"
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document

def get_document(db: Session, document_id: int, user_id: int):
    """Get a specific document (verify ownership)"""
    return db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.user_id == user_id
    ).first()

def get_user_documents(db: Session, user_id: int):
    """Get all documents for a user"""
    return db.query(models.Document).filter(
        models.Document.user_id == user_id
    ).order_by(models.Document.created_at.desc()).all()

def update_document_status(db: Session, document_id: int, status: str):
    """Update document processing status"""
    db_document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if db_document:
        db_document.status = status
        db.commit()
        db.refresh(db_document)
    return db_document

def delete_document(db: Session, document_id: int, user_id: int):
    """Delete a document and all related epics/stories"""
    db_document = get_document(db, document_id, user_id)
    if db_document:
        db.delete(db_document)
        db.commit()
        return True
    return False


# ==================== EPIC CRUD OPERATIONS ====================

def create_epic(db: Session, document_id: int, epic: schemas.EpicCreate):
    """Create a new epic for a document"""
    db_epic = models.Epic(
        document_id=document_id,
        title=epic.title,
        description=epic.description,
        page_range=epic.page_range,
        priority=epic.priority
    )
    db.add(db_epic)
    db.commit()
    db.refresh(db_epic)
    return db_epic

def get_epic(db: Session, epic_id: int):
    """Get a specific epic"""
    return db.query(models.Epic).filter(models.Epic.id == epic_id).first()

def get_document_epics(db: Session, document_id: int):
    """Get all epics for a document"""
    return db.query(models.Epic).filter(
        models.Epic.document_id == document_id
    ).order_by(models.Epic.created_at.desc()).all()

def update_epic(db: Session, epic_id: int, epic_update: schemas.EpicUpdate):
    """Update an epic"""
    db_epic = get_epic(db, epic_id)
    if db_epic:
        update_data = epic_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_epic, field, value)
        db.commit()
        db.refresh(db_epic)
    return db_epic

def delete_epic(db: Session, epic_id: int):
    """Delete an epic"""
    db_epic = get_epic(db, epic_id)
    if db_epic:
        db.delete(db_epic)
        db.commit()
        return True
    return False


# ==================== STORY CRUD OPERATIONS ====================

def create_story(db: Session, epic_id: int, story: schemas.StoryCreate):
    """Create a new story for an epic"""
    db_story = models.Story(
        epic_id=epic_id,
        title=story.title,
        description=story.description,
        acceptance_criteria=story.acceptance_criteria,
        page_number=story.page_number,
        story_points=story.story_points
    )
    db.add(db_story)
    db.commit()
    db.refresh(db_story)
    return db_story

def get_story(db: Session, story_id: int):
    """Get a specific story"""
    return db.query(models.Story).filter(models.Story.id == story_id).first()

def get_epic_stories(db: Session, epic_id: int):
    """Get all stories for an epic"""
    return db.query(models.Story).filter(
        models.Story.epic_id == epic_id
    ).order_by(models.Story.created_at.desc()).all()

def update_story(db: Session, story_id: int, story_update: schemas.StoryUpdate):
    """Update a story"""
    db_story = get_story(db, story_id)
    if db_story:
        update_data = story_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_story, field, value)
        db.commit()
        db.refresh(db_story)
    return db_story

def delete_story(db: Session, story_id: int):
    """Delete a story"""
    db_story = get_story(db, story_id)
    if db_story:
        db.delete(db_story)
        db.commit()
        return True
    return False
