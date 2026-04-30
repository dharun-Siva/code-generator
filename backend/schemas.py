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


# Document Schemas
class DocumentCreate(BaseModel):
    filename: str

class DocumentOut(BaseModel):
    id: int
    user_id: int
    filename: str
    total_pages: int
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Story Schemas
class StoryCreate(BaseModel):
    title: str
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    page_number: Optional[int] = None
    story_points: int = 5

class StoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    story_points: Optional[int] = None
    status: Optional[str] = None

class StoryOut(BaseModel):
    id: int
    epic_id: int
    title: str
    description: Optional[str]
    acceptance_criteria: Optional[str]
    page_number: Optional[int]
    story_points: int
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Epic Schemas
class EpicCreate(BaseModel):
    title: str
    description: Optional[str] = None
    page_range: Optional[str] = None
    priority: str = "Medium"

class EpicUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    page_range: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None

class EpicOut(BaseModel):
    id: int
    document_id: int
    title: str
    description: Optional[str]
    page_range: Optional[str]
    priority: str
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class EpicWithStories(BaseModel):
    id: int
    document_id: int
    title: str
    description: Optional[str]
    page_range: Optional[str]
    priority: str
    status: str
    stories: List[StoryOut]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
