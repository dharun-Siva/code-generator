from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    github_oauth_token = Column(String, nullable=True)  # GitHub OAuth access token
    github_username = Column(String, nullable=True)  # GitHub username
    
    # Relationship to chats
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")


class Chat(Base):
    __tablename__ = "chats"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False, default="New Chat")
    messages = Column(Text, nullable=True)  # JSON format stored as text
    github_repo_url = Column(String, nullable=True)  # GitHub repository URL for generated projects
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to user
    user = relationship("User", back_populates="chats")


# Single unified table for project items
class ProjectItem(Base):
    __tablename__ = "project_items"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("chats.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    epic_id = Column(Integer, nullable=False, index=True)  # Epic counter/identifier
    story_id = Column(Integer, nullable=False, index=True)  # Story counter/identifier (0 = epic)
    epic_title = Column(String, nullable=False)  # Epic name for consistency across all users
    story_title = Column(String, nullable=True)  # Story name (None for epic entries)
    description = Column(Text, nullable=True, default=None)  # Not used - kept for backward compatibility
    story_details = Column(JSON, nullable=True, default=None)  # JSON format: {summary, description, acceptance_criteria, story_points, technical_notes}
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    chat = relationship("Chat", foreign_keys=[project_id])
    user = relationship("User", foreign_keys=[user_id])


class AnalysisResult(Base):
    """Stores saved analysis results for a project's selected stories"""
    __tablename__ = "analysis_results"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("chats.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    analysis_name = Column(String, nullable=False)  # User-friendly name for this analysis
    
    # Selected story IDs (stored as JSON array)
    selected_story_ids = Column(JSON, nullable=False, default=[])
    
    # Analysis results (stored as JSON)
    microservice_analysis = Column(JSON, nullable=True)  # Full microservices breakdown
    frontend_analysis = Column(JSON, nullable=True)  # Frontend structure (pages, components)
    database_analysis = Column(JSON, nullable=True)  # Database schema (tables, relationships)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    chat = relationship("Chat", foreign_keys=[project_id])
    user = relationship("User", foreign_keys=[user_id])
