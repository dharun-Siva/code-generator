from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    role: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ChangePassword(BaseModel):
    email: EmailStr
    current_password: str
    new_password: str

class UserOut(UserBase):
    id: int
    class Config:
        from_attributes = True


# Chat Schemas
class ChatCreate(BaseModel):
    title: str = "New Chat"
    messages: Optional[str] = "[]"  # JSON string

class ChatUpdate(BaseModel):
    title: Optional[str] = None
    messages: Optional[str] = None

class MessagesSave(BaseModel):
    messages: str  # JSON string of messages

class ChatOut(BaseModel):
    id: int
    user_id: int
    title: str
    messages: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ChatListOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Project Item Schemas (formerly ProjectEpicStory)
class ProjectItemCreate(BaseModel):
    project_id: int  # Chat ID
    user_id: int
    epic_id: int  # Epic counter
    story_id: int  # Story counter
    epic_title: str  # Epic name for consistency across all users
    story_title: Optional[str] = None  # Story name
    description: Optional[str] = None  # Not used - kept for backward compatibility

class ProjectItemOut(BaseModel):
    id: int
    project_id: int
    user_id: int
    epic_id: int
    story_id: int
    description: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class BatchSaveProjectItem(BaseModel):
    """Save epic with description and multiple stories (without descriptions)"""
    project_id: int  # Chat ID
    user_id: int
    epic_id: int
    epic_title: str  # Epic name/title for consistency
    epic_description: str  # STORE: Epic description only
    stories: List[dict]  # List of {story_id: int, story_title: str} - NO descriptions
