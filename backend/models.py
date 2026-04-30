from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    
    # Relationship to chats
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")
    # Relationship to documents
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")


class Chat(Base):
    __tablename__ = "chats"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False, default="New Chat")
    messages = Column(Text, nullable=True)  # JSON format stored as text
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to user
    user = relationship("User", back_populates="chats")


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    total_pages = Column(Integer, default=0)
    file_path = Column(String, nullable=True)
    status = Column(String, default="uploaded")  # uploaded, processing, completed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="documents")
    epics = relationship("Epic", back_populates="document", cascade="all, delete-orphan")


class Epic(Base):
    __tablename__ = "epics"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    page_range = Column(String, nullable=True)  # e.g., "1-5" or "1,3,5"
    priority = Column(String, default="Medium")  # Low, Medium, High, Critical
    status = Column(String, default="Draft")  # Draft, Ready, In Progress, Completed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    document = relationship("Document", back_populates="epics")
    stories = relationship("Story", back_populates="epic", cascade="all, delete-orphan")


class Story(Base):
    __tablename__ = "stories"
    id = Column(Integer, primary_key=True, index=True)
    epic_id = Column(Integer, ForeignKey("epics.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    acceptance_criteria = Column(Text, nullable=True)
    page_number = Column(Integer, nullable=True)
    story_points = Column(Integer, default=5)  # 1, 2, 3, 5, 8, 13, 21
    status = Column(String, default="Draft")  # Draft, Ready, In Progress, Completed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    epic = relationship("Epic", back_populates="stories")
