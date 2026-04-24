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
