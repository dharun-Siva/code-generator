
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models
import schemas
import crud
from database import SessionLocal, engine
from agent import AIAgent
from fastapi import UploadFile, File
import requests
import os
from urllib.parse import urlencode
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# GitHub OAuth Configuration
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "your_client_id_here")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "your_client_secret_here")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:8000/github/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Initialize AI Agent
agent = AIAgent()

# Pydantic models for agent endpoints
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    type: str = "chat"

class PDFQuestionRequest(BaseModel):
    question: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Get all users
@app.get("/users", response_model=list[schemas.UserOut])
def get_users(db: Session = Depends(get_db)):
    return crud.get_all_users(db)

# Delete a user by id
@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    success = crud.delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}

@app.post("/signup", response_model=schemas.UserOut)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/login", response_model=schemas.UserOut)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = crud.authenticate_user(db, user.email, user.password)
    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    return db_user

@app.post("/change-password")
def change_password(
    change_pwd: schemas.ChangePassword,
    db: Session = Depends(get_db)
):
    """Change user password"""
    success, message = crud.change_password(db, change_pwd.email, change_pwd.current_password, change_pwd.new_password)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"message": message}


# ==================== AI AGENT ENDPOINTS ====================

@app.post("/agent/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """Chat with AI agent - like ChatGPT"""
    try:
        response = agent.chat(request.message)
        return ChatResponse(response=response, type="chat")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agent/create", response_model=ChatResponse)
def create_project(request: ChatRequest):
    """AI helps create a new project"""
    try:
        response = agent.create_project(request.message)
        return ChatResponse(response=response, type="create")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agent/analyze", response_model=ChatResponse)
def analyze_code(request: ChatRequest):
    """AI analyzes code and suggests improvements"""
    try:
        response = agent.analyze_code(request.message)
        return ChatResponse(response=response, type="analyze")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/agent/models")
def get_models():
    """Get available AI models"""
    try:
        return agent.list_models()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agent/reset")
def reset_chat():
    """Reset conversation history"""
    agent.reset_conversation()
    return {"status": "Chat reset successfully"}


@app.post("/agent/change-model")
def change_model(model_id: str):
    """Switch to a different AI model"""
    try:
        result = agent.change_model(model_id)
        return {"message": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PDF ENDPOINTS ====================

@app.post("/agent/pdf/ask", response_model=ChatResponse)
async def ask_pdf_question(file: UploadFile = File(...), question: str = None):
    """[DEPRECATED] This endpoint is deprecated. Use /agent/pdf/page-summaries instead."""
    # DUMMY ENDPOINT - DO NOT CALL AI FUNCTIONS
    return ChatResponse(
        response="This endpoint is deprecated. Please use POST /agent/pdf/page-summaries to get page-wise summaries.",
        type="deprecated"
    )


@app.post("/agent/pdf/followup", response_model=ChatResponse)
def ask_pdf_followup(question_request: ChatRequest):
    """Ask a follow-up question about the currently loaded PDF"""
    try:
        if not question_request.message:
            raise HTTPException(status_code=400, detail="Question is required")
        
        # Ask follow-up question about stored PDF
        answer = agent.ask_followup_question(question_request.message)
        
        return ChatResponse(response=answer, type="pdf_followup")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agent/pdf/reset")
def reset_pdf():
    """Clear the stored PDF content"""
    agent.reset_pdf()
    return {"status": "PDF cleared successfully"}


@app.post("/agent/pdf/page-summaries")
async def get_pdf_page_summaries(file: UploadFile = File(...)):
    """Extract each page of PDF and generate a summary for each page
    
    Returns:
        {
            "total_pages": int,
            "page_summaries": [
                {
                    "page_number": 1,
                    "summary": "Page 1 summary text"
                },
                {
                    "page_number": 2,
                    "summary": "Page 2 summary text"
                },
                ...
            ]
        }
    """
    try:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        # Read PDF file
        pdf_content = await file.read()
        
        # Get page-wise summaries
        result = agent.get_page_summaries(pdf_content)
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Error in page-summaries endpoint - {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== EPIC & STORY ENDPOINTS ====================

class PageSummariesRequest(BaseModel):
    page_summaries: list
    total_pages: int

class GenerateStoryRequest(BaseModel):
    epic_title: str
    story_title: str
    story_summary: str
    page_summaries: list


@app.post("/agent/epics/generate")
def generate_epics(request: PageSummariesRequest):
    """Generate epic structure with stories from page summaries
    
    Expected input:
    {
        "page_summaries": [
            {"page_number": 1, "summary": "..."},
            {"page_number": 2, "summary": "..."},
            ...
        ],
        "total_pages": 4
    }
    
    Returns:
    {
        "epics": [
            {
                "epic_id": 1,
                "title": "Epic Name",
                "page_range": "1-2",
                "stories": [
                    {
                        "story_id": 1,
                        "title": "Story Title",
                        "summary": "One-liner summary"
                    }
                ]
            }
        ]
    }
    """
    try:
        result = agent.generate_epics_from_summaries(request.page_summaries, request.total_pages)
        return result
    except Exception as e:
        print(f"DEBUG: Error in generate_epics - {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agent/epics/generate-story")
def generate_full_story(request: GenerateStoryRequest):
    """Generate full story details for a specific story
    
    Expected input:
    {
        "epic_title": "Epic Name",
        "story_title": "Story Title",
        "story_summary": "One-liner summary",
        "page_summaries": [
            {"page_number": 1, "summary": "..."},
            ...
        ]
    }
    
    Returns:
    {
        "epic": "Epic Name",
        "story": "Story Name",
        "summary": "One-liner",
        "description": "Detailed description",
        "acceptance_criteria": ["Criteria 1", "Criteria 2", ...],
        "story_points": 5,
        "technical_notes": "Technical details"
    }
    """
    try:
        result = agent.generate_full_story(
            request.epic_title,
            request.story_title,
            request.story_summary,
            request.page_summaries
        )
        return result
    except Exception as e:
        print(f"DEBUG: Error in generate_full_story - {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CHAT STORAGE ENDPOINTS ====================

@app.post("/chats", response_model=schemas.ChatOut)
def create_new_chat(user_id: int, title: str = "New Chat", db: Session = Depends(get_db)):
    """Create a new chat for a user"""
    try:
        chat = crud.create_chat(db, user_id, title)
        return chat
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chats/{user_id}", response_model=list[schemas.ChatListOut])
def get_user_chats(user_id: int, db: Session = Depends(get_db)):
    """Get all chats for a user"""
    try:
        chats = crud.get_user_chats(db, user_id)
        return chats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chats/{user_id}/{chat_id}", response_model=schemas.ChatOut)
def get_chat(user_id: int, chat_id: int, db: Session = Depends(get_db)):
    """Get a specific chat"""
    try:
        chat = crud.get_chat(db, chat_id, user_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        return chat
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/chats/{user_id}/{chat_id}/messages")
def save_chat_messages(user_id: int, chat_id: int, payload: schemas.MessagesSave, db: Session = Depends(get_db)):
    """Save/update chat messages"""
    try:
        chat = crud.update_chat_messages(db, chat_id, user_id, payload.messages)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        return {"status": "Messages saved", "chat_id": chat_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error saving messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/chats/{user_id}/{chat_id}/title")
def update_chat_title(user_id: int, chat_id: int, title: str, db: Session = Depends(get_db)):
    """Update chat title"""
    try:
        chat = crud.update_chat_title(db, chat_id, user_id, title)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        return {"status": "Title updated", "title": title}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating title: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/chats/{user_id}/{chat_id}")
def delete_chat_endpoint(user_id: int, chat_id: int, db: Session = Depends(get_db)):
    """Delete a chat"""
    try:
        success = crud.delete_chat(db, chat_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Chat not found")
        return {"status": "Chat deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PROJECT ITEMS ENDPOINTS ====================

@app.post("/project-items/batch-save")
def batch_save_project_items(batch_data: schemas.BatchSaveProjectItem, db: Session = Depends(get_db)):
    """Save epic and multiple stories to project_items table when user approves"""
    try:
        print(f"DEBUG: Received batch save request")
        print(f"DEBUG: project_id={batch_data.project_id}, user_id={batch_data.user_id}")
        print(f"DEBUG: epic_title={batch_data.epic_title}, stories_count={len(batch_data.stories)}")
        
        entries = crud.batch_save_project_item(db, batch_data)
        print(f"DEBUG: Successfully saved {len(entries)} entries")
        
        return {
            "status": "success",
            "message": f"Epic with {len(entries)-1} stories saved successfully",
            "entries_count": len(entries),
            "project_id": batch_data.project_id,
            "epic_id": batch_data.epic_id
        }
    except Exception as e:
        print(f"ERROR in batch_save: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/project-items")
def create_single_project_item(project_item: schemas.ProjectItemCreate, db: Session = Depends(get_db)):
    """Create a single epic or story entry"""
    try:
        entry = crud.create_project_item(db, project_item)
        return entry
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/project-items/{project_id}/{epic_id}")
def get_project_items_with_epic(project_id: int, epic_id: int, db: Session = Depends(get_db)):
    """Get an epic and all its stories for a specific project"""
    try:
        epic = crud.get_project_epic(db, project_id, epic_id)
        stories = crud.get_project_items_by_epic(db, project_id, epic_id)
        
        if not epic:
            raise HTTPException(status_code=404, detail="Epic not found")
        
        return {
            "epic": epic,
            "stories": stories
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/project-items/{project_id}")
def get_all_project_items(project_id: int, db: Session = Depends(get_db)):
    """Get all epics and stories for a project"""
    try:
        entries = crud.get_all_project_items(db, project_id)
        
        # Group by epic_id
        grouped = {}
        for entry in entries:
            if entry.epic_id not in grouped:
                grouped[entry.epic_id] = {"epic": None, "stories": []}
            
            if entry.story_id == 0:
                grouped[entry.epic_id]["epic"] = entry
            else:
                grouped[entry.epic_id]["stories"].append(entry)
        
        return {"project_id": project_id, "epics": grouped}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/project-items/{entry_id}")
def update_project_item(entry_id: int, description: str, db: Session = Depends(get_db)):
    """Update description of an epic or story"""
    try:
        entry = crud.update_project_item(db, entry_id, description)
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        return entry
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/project-items/{project_id}/{epic_id}")
def delete_project_items_by_epic_endpoint(project_id: int, epic_id: int, db: Session = Depends(get_db)):
    """Delete an epic and all its stories from a project"""
    try:
        crud.delete_project_items_by_epic(db, project_id, epic_id)
        return {"status": "Epic and stories deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CODE GENERATION ENDPOINTS ====================

class CodeGenRequest(BaseModel):
    project_id: int
    user_id: int
    app_name: str
    github_token: Optional[str] = None  # Optional - will use stored token if not provided


@app.post("/codegen/generate")
def generate_code(request: CodeGenRequest, db: Session = Depends(get_db)):
    """Generate complete project code and push to GitHub"""
    try:
        from codegen.code_generator import CodeGenerator
        
        # Use provided token or fetch from database
        github_token = request.github_token
        if not github_token:
            user = crud.get_user(db, request.user_id)
            if not user or not user.github_oauth_token:
                raise HTTPException(status_code=400, detail="GitHub not connected. Please connect your GitHub account first.")
            github_token = user.github_oauth_token
        
        # Get all project items for the project
        all_items = crud.get_all_project_items(db, request.project_id)
        
        # Group by epic_id for the code generator
        grouped = {}
        for item in all_items:
            if item.epic_id not in grouped:
                grouped[item.epic_id] = {"epic": None, "stories": []}
            
            if item.story_id == 0:
                grouped[item.epic_id]["epic"] = item
            else:
                grouped[item.epic_id]["stories"].append({
                    "story_title": item.story_title,
                    "story_id": item.story_id
                })
        
        epics_data = {
            "project_id": request.project_id,
            "epics": grouped
        }
        
        # Generate code
        code_generator = CodeGenerator()
        result = code_generator.generate_complete_project(
            app_name=request.app_name,
            epics_and_stories=epics_data,
            github_token=github_token
        )
        
        return {
            "status": "success",
            "message": result["message"],
            "repo_url": result["repo_url"]
        }
    except Exception as e:
        print(f"ERROR in generate_code: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== GITHUB OAUTH ENDPOINTS ====================

@app.get("/github/login")
def github_login(user_id: int):
    """Initiate GitHub OAuth flow"""
    try:
        # Store user_id in state for callback
        state = f"{user_id}:{os.urandom(8).hex()}"
        
        params = {
            "client_id": GITHUB_CLIENT_ID,
            "redirect_uri": GITHUB_REDIRECT_URI,
            "scope": "repo user",
            "state": state,
            "allow_signup": "true"
        }
        
        github_auth_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
        return {"auth_url": github_auth_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/github/callback")
async def github_callback(code: str, state: str, db: Session = Depends(get_db)):
    """Handle GitHub OAuth callback"""
    try:
        if not code or not state:
            raise HTTPException(status_code=400, detail="Missing code or state parameter")
        
        # Extract user_id from state
        user_id = int(state.split(":")[0])
        
        # Exchange code for access token
        token_response = requests.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"}
        )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get access token")
        
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")
        
        # Get GitHub user info
        user_response = requests.get(
            "https://api.github.com/user",
            headers={"Authorization": f"token {access_token}"}
        )
        
        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get GitHub user info")
        
        github_user = user_response.json()
        github_username = github_user.get("login")
        
        # Store token and username in database
        crud.update_user_github_token(db, user_id, access_token, github_username)
        
        # Redirect to frontend with success message
        return RedirectResponse(url=f"{FRONTEND_URL}/user?github_connected=true")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    except Exception as e:
        print(f"ERROR in github_callback: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/github/status/{user_id}")
def get_github_status(user_id: int, db: Session = Depends(get_db)):
    """Check if user has GitHub connected"""
    try:
        user = crud.get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "connected": bool(user.github_oauth_token),
            "github_username": user.github_username or None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/github/disconnect/{user_id}")
def disconnect_github(user_id: int, db: Session = Depends(get_db)):
    """Disconnect GitHub from user account"""
    try:
        user = crud.get_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        crud.update_user_github_token(db, user_id, None, None)
        
        return {"status": "GitHub disconnected successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
