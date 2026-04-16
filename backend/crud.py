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
