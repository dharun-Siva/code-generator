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
