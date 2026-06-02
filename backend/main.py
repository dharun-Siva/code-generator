
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


class SaveStoryDetailsRequest(BaseModel):
    """Request to save epic and stories with full details"""
    project_id: int
    user_id: int
    epics_and_stories: list  # List of {epic_id, epic_title, stories: [{story_id, story_title, story_details: {...}}]}


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

@app.post("/project-items/save-story-details")
def save_epic_and_stories_with_details(request: SaveStoryDetailsRequest, db: Session = Depends(get_db)):
    """Save epics and stories with full story details to project_items table
    
    Expected format:
    {
        "project_id": 1,
        "user_id": 5,
        "epics_and_stories": [
            {
                "epic_id": 1,
                "epic_title": "Epic Name",
                "stories": [
                    {
                        "story_id": 1,
                        "story_title": "Story 1 Title",
                        "story_details": {
                            "summary": "...",
                            "description": "...",
                            "acceptance_criteria": [...],
                            "story_points": 5,
                            "technical_notes": "..."
                        }
                    }
                ]
            }
        ]
    }
    """
    try:
        saved_entries = []
        
        for epic_data in request.epics_and_stories:
            epic_id = epic_data.get("epic_id")
            epic_title = epic_data.get("epic_title")
            stories = epic_data.get("stories", [])
            
            # Save epic entry (story_title=None, story_details=None)
            epic_entry = models.ProjectItem(
                project_id=request.project_id,
                user_id=request.user_id,
                epic_id=epic_id,
                story_id=0,  # 0 indicates this is an epic entry
                epic_title=epic_title,
                story_title=None,
                story_details=None
            )
            db.add(epic_entry)
            db.flush()
            saved_entries.append(epic_entry)
            
            # Save each story entry with story_details
            for story in stories:
                story_id = story.get("story_id")
                story_title = story.get("story_title")
                story_details = story.get("story_details")
                
                # SQLAlchemy JSON type handles serialization automatically
                story_entry = models.ProjectItem(
                    project_id=request.project_id,
                    user_id=request.user_id,
                    epic_id=epic_id,
                    story_id=story_id,
                    epic_title=epic_title,
                    story_title=story_title,
                    story_details=story_details
                )
                db.add(story_entry)
                db.flush()
                saved_entries.append(story_entry)
        
        db.commit()
        
        print(f"✓ Successfully saved {len(saved_entries)} entries (epics + stories)")
        
        return {
            "status": "success",
            "message": f"Successfully saved all epics and stories with details",
            "total_entries": len(saved_entries),
            "project_id": request.project_id
        }
    except Exception as e:
        db.rollback()
        print(f"ERROR in save_epic_and_stories_with_details: {str(e)}")
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


# ==================== MICROSERVICE ANALYSIS ENDPOINTS ====================

@app.get("/microservice-analysis/{project_id}")
def analyze_microservices(project_id: int, story_ids: Optional[str] = None, db: Session = Depends(get_db)):
    """Analyze project structure and suggest microservice breakdown"""
    try:
        from codegen.microservice_analyzer import MicroserviceAnalyzer
        
        # Parse story_ids if provided
        selected_story_ids = None
        if story_ids:
            try:
                selected_story_ids = set(int(sid.strip()) for sid in story_ids.split(',') if sid.strip())
            except ValueError:
                selected_story_ids = None
        
        # Get all project items for the project
        all_items = crud.get_all_project_items(db, project_id)
        
        # Group by epic_id
        grouped = {}
        for item in all_items:
            if item.epic_id not in grouped:
                grouped[item.epic_id] = {"epic": None, "stories": []}
            
            if item.story_id == 0:
                # Convert ORM object to dictionary
                grouped[item.epic_id]["epic"] = {
                    "epic_title": item.epic_title,
                    "description": getattr(item, "description", "")
                }
            else:
                # Only include stories if story_ids is not provided or story is in the selection
                if selected_story_ids is None or item.story_id in selected_story_ids:
                    grouped[item.epic_id]["stories"].append({
                        "story_title": item.story_title,
                        "story_id": item.story_id,
                        "description": getattr(item, "description", "")
                    })
        
        # Remove epics with no stories after filtering
        if selected_story_ids is not None:
            grouped = {epic_id: epic_data for epic_id, epic_data in grouped.items() if epic_data["stories"]}
        
        epics_data = {
            "project_id": project_id,
            "epics": grouped
        }
        
        print(f"DEBUG: epics_data keys = {epics_data.keys()}")
        print(f"DEBUG: grouped keys = {grouped.keys()}")
        if grouped:
            first_epic_id = list(grouped.keys())[0]
            print(f"DEBUG: first epic type = {type(grouped[first_epic_id])}")
            print(f"DEBUG: first epic epic type = {type(grouped[first_epic_id].get('epic'))}")
        
        # Analyze microservices
        analyzer = MicroserviceAnalyzer()
        analysis = analyzer.analyze(epics_data)
        
        return analysis
    except Exception as e:
        print(f"ERROR in analyze_microservices: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/frontend-analysis/{project_id}")
def analyze_frontend(project_id: int, story_ids: Optional[str] = None, db: Session = Depends(get_db)):
    """Analyze project structure and preview frontend (pages and components) that will be generated"""
    try:
        from codegen.frontend_analyzer import FrontendAnalyzer
        from codegen.microservice_analyzer import MicroserviceAnalyzer
        
        # Parse story_ids if provided
        selected_story_ids = None
        if story_ids:
            try:
                selected_story_ids = set(int(sid.strip()) for sid in story_ids.split(',') if sid.strip())
            except ValueError:
                selected_story_ids = None
        
        # Get all project items for the project
        all_items = crud.get_all_project_items(db, project_id)
        
        # Group by epic_id
        grouped = {}
        for item in all_items:
            if item.epic_id not in grouped:
                grouped[item.epic_id] = {"epic": None, "stories": []}
            
            if item.story_id == 0:
                # Convert ORM object to dictionary
                grouped[item.epic_id]["epic"] = {
                    "epic_title": item.epic_title,
                    "description": getattr(item, "description", "")
                }
            else:
                # Only include stories if story_ids is not provided or story is in the selection
                if selected_story_ids is None or item.story_id in selected_story_ids:
                    grouped[item.epic_id]["stories"].append({
                        "story_title": item.story_title,
                        "story_id": item.story_id,
                        "description": getattr(item, "description", "")
                    })
        
        # Remove epics with no stories after filtering
        if selected_story_ids is not None:
            grouped = {epic_id: epic_data for epic_id, epic_data in grouped.items() if epic_data["stories"]}
        
        epics_data = {
            "project_id": project_id,
            "epics": grouped
        }
        
        # First, analyze microservices to get the architecture
        microservice_analyzer = MicroserviceAnalyzer()
        microservice_analysis = microservice_analyzer.analyze(epics_data)
        microservices = microservice_analysis.get("microservices", [])
        
        # Then, analyze frontend structure with microservice coordination
        analyzer = FrontendAnalyzer()
        analysis = analyzer.analyze(epics_data, microservices)
        
        # Add microservice info to the response for transparency
        analysis["microservices_reference"] = microservices
        
        return analysis
    except Exception as e:
        print(f"ERROR in analyze_frontend: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/database-analysis/{project_id}")
def analyze_database(project_id: int, story_ids: Optional[str] = None, db: Session = Depends(get_db)):
    """Analyze project structure and preview database (tables and relationships) that will be generated"""
    try:
        from codegen.database_analyzer import DatabaseAnalyzer
        from codegen.microservice_analyzer import MicroserviceAnalyzer
        
        # Parse story_ids if provided
        selected_story_ids = None
        if story_ids:
            try:
                selected_story_ids = set(int(sid.strip()) for sid in story_ids.split(',') if sid.strip())
            except ValueError:
                selected_story_ids = None
        
        # Get all project items for the project
        all_items = crud.get_all_project_items(db, project_id)
        
        # Group by epic_id
        grouped = {}
        for item in all_items:
            if item.epic_id not in grouped:
                grouped[item.epic_id] = {"epic": None, "stories": []}
            
            if item.story_id == 0:
                # Convert ORM object to dictionary
                grouped[item.epic_id]["epic"] = {
                    "epic_title": item.epic_title,
                    "description": getattr(item, "description", "")
                }
            else:
                # Only include stories if story_ids is not provided or story is in the selection
                if selected_story_ids is None or item.story_id in selected_story_ids:
                    grouped[item.epic_id]["stories"].append({
                        "story_title": item.story_title,
                        "story_id": item.story_id,
                        "description": getattr(item, "description", "")
                    })
        
        # Remove epics with no stories after filtering
        if selected_story_ids is not None:
            grouped = {epic_id: epic_data for epic_id, epic_data in grouped.items() if epic_data["stories"]}
        
        epics_data = {
            "project_id": project_id,
            "epics": grouped
        }
        
        # First, analyze microservices to get the architecture
        microservice_analyzer = MicroserviceAnalyzer()
        microservice_analysis = microservice_analyzer.analyze(epics_data)
        microservices = microservice_analysis.get("microservices", [])
        
        # Analyze database structure with microservice coordination
        analyzer = DatabaseAnalyzer()
        analysis = analyzer.analyze(epics_data, microservices)
        
        # Add microservice info to the response for transparency
        analysis["microservices_reference"] = microservices
        
        return analysis
    except Exception as e:
        print(f"ERROR in analyze_database: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CODE GENERATION ENDPOINTS ====================

class CodeGenRequest(BaseModel):
    project_id: int
    user_id: int
    app_name: str
    github_token: Optional[str] = None  # Optional - will use stored token if not provided
    story_ids: Optional[list[int]] = None  # Optional - if provided, generate only for these stories
    analysis_results: Optional[dict] = None  # Optional - if provided, use for code generation reference


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
        
        # Filter by story_ids if provided
        if request.story_ids:
            # Convert story_ids list to set for faster lookup
            story_ids_set = set(request.story_ids)
            # Keep epics (story_id == 0) and filter stories by story_ids
            all_items = [item for item in all_items if item.story_id == 0 or item.story_id in story_ids_set]
        
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
        
        # If analysis results are provided, use them; otherwise try to fetch locked analysis
        analysis_results = request.analysis_results
        if not analysis_results:
            # Try to fetch the latest saved analysis for this project
            analyses = crud.get_project_analyses(db, request.project_id, request.user_id)
            if analyses:
                latest_analysis = analyses[0]
                analysis_results = {
                    "microservice_analysis": latest_analysis.microservice_analysis,
                    "frontend_analysis": latest_analysis.frontend_analysis,
                    "database_analysis": latest_analysis.database_analysis
                }
        
        # Generate code with analysis results as reference
        code_generator = CodeGenerator()
        result = code_generator.generate_complete_project(
            app_name=request.app_name,
            epics_and_stories=epics_data,
            analysis_results=analysis_results,
            github_token=github_token
        )
        
        # Store the GitHub repo URL in the database for later use
        if result.get("repo_url"):
            chat = db.query(models.Chat).filter(models.Chat.id == request.project_id).first()
            if chat:
                chat.github_repo_url = result["repo_url"]
                db.commit()
        
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


class UpdatePreviewRequest(BaseModel):
    project_id: int
    type: str  # 'planned' or 'custom'
    feature_type: Optional[str] = 'fullstack'  # 'frontend', 'backend', or 'fullstack'
    story_ids: Optional[list[int]] = None
    custom_description: Optional[str] = None


@app.post("/codegen/preview-update")
def preview_update(request: UpdatePreviewRequest, db: Session = Depends(get_db)):
    """Generate preview of what will be added/updated"""
    try:
        from agent import AIAgent
        
        agent = AIAgent()
        
        if request.type == 'planned':
            # Get all project items
            all_items = crud.get_all_project_items(db, request.project_id)
            
            # Get the selected stories
            selected_titles = []
            if request.story_ids:
                story_ids_set = set(request.story_ids)
                for item in all_items:
                    if item.story_id in story_ids_set:
                        selected_titles.append(item.story_title)
            
            # Build prompt for preview
            story_titles = ', '.join(selected_titles) if selected_titles else "Feature story"
            prompt = f"""Based on these planned stories/features: {story_titles}
            
Generate a JSON preview of what components, endpoints, and database tables will be created.
Return ONLY valid JSON with no markdown, no extra text, just the JSON object:
{{
  "components": [
    {{"name": "ComponentName", "description": "what it does"}},
    {{"name": "AnotherComponent", "description": "description"}}
  ],
  "endpoints": [
    {{"method": "GET", "path": "/api/path", "description": "fetch data"}},
    {{"method": "POST", "path": "/api/path", "description": "create/update data"}}
  ],
  "tables": [
    {{"name": "table_name", "columns": ["id", "name", "created_at"]}}
  ]
}}"""
        else:  # custom
            prompt = f"""Based on this feature description: {request.custom_description}
            
Generate a JSON preview of what components, endpoints, and database tables will be created.
Return ONLY valid JSON with no markdown, no extra text, just the JSON object:
{{
  "components": [
    {{"name": "ComponentName", "description": "what it does"}},
    {{"name": "AnotherComponent", "description": "description"}}
  ],
  "endpoints": [
    {{"method": "GET", "path": "/api/path", "description": "fetch data"}},
    {{"method": "POST", "path": "/api/path", "description": "create/update data"}}
  ],
  "tables": [
    {{"name": "table_name", "columns": ["id", "name", "created_at"]}}
  ]
}}"""
        
        # Get AI response
        response = agent.chat(prompt)
        
        # Parse JSON from response
        import json
        try:
            # Try to extract JSON from response
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            if start_idx != -1 and end_idx > start_idx:
                json_str = response[start_idx:end_idx]
                preview_data = json.loads(json_str)
            else:
                # Fallback if no JSON found
                raise ValueError("No JSON found in response")
        except (json.JSONDecodeError, ValueError):
            # Provide default preview data
            preview_data = {
                "components": [{"name": "NewFeature", "description": "New feature component"}],
                "endpoints": [{"method": "POST", "path": "/api/new-feature", "description": "New feature endpoint"}],
                "tables": [{"name": "new_feature", "columns": ["id", "name", "created_at"]}]
            }
        
        # Filter based on feature_type
        if request.feature_type == 'frontend':
            # Only return components
            preview_data = {
                "components": preview_data.get("components", []),
                "endpoints": [],
                "tables": []
            }
        elif request.feature_type == 'backend':
            # Only return endpoints and tables
            preview_data = {
                "components": [],
                "endpoints": preview_data.get("endpoints", []),
                "tables": preview_data.get("tables", [])
            }
        # For 'fullstack', return everything (no filtering)
        
        return preview_data
        
    except Exception as e:
        print(f"ERROR in preview_update: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class UpdateGenerateRequest(BaseModel):
    project_id: int
    user_id: int
    github_url: Optional[str] = None  # The repository URL to update (optional, fetched from DB if not provided)
    type: str  # 'planned' or 'custom'
    feature_type: Optional[str] = 'fullstack'  # 'frontend', 'backend', or 'fullstack'
    story_ids: Optional[list[int]] = None
    custom_description: Optional[str] = None


class SetGitHubUrlRequest(BaseModel):
    project_id: int
    github_url: str


@app.post("/codegen/set-github-url")
def set_github_url(request: SetGitHubUrlRequest, db: Session = Depends(get_db)):
    """Set/Update GitHub URL for an existing project"""
    try:
        chat = db.query(models.Chat).filter(models.Chat.id == request.project_id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Project not found")
        
        chat.github_repo_url = request.github_url
        db.commit()
        
        return {
            "status": "success",
            "message": f"GitHub URL updated for project {request.project_id}",
            "github_url": request.github_url
        }
    except Exception as e:
        print(f"ERROR in set_github_url: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/codegen/update")
def update_project(request: UpdateGenerateRequest, db: Session = Depends(get_db)):
    """Generate and push code updates to existing GitHub repository"""
    try:
        from codegen.code_updater import CodeUpdater
        
        # Get the project/chat to retrieve GitHub repo URL
        chat = db.query(models.Chat).filter(models.Chat.id == request.project_id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get GitHub repo URL - use provided or fetch from database
        github_url = request.github_url or chat.github_repo_url
        if not github_url:
            raise HTTPException(
                status_code=400, 
                detail="GitHub repository URL not found. Please provide it via /codegen/set-github-url endpoint or include it in the request."
            )
        
        # Get GitHub token
        user = crud.get_user(db, request.user_id)
        if not user or not user.github_oauth_token:
            raise HTTPException(status_code=400, detail="GitHub not connected. Please connect your GitHub account first.")
        
        github_token = user.github_oauth_token
        
        # Initialize updater
        updater = CodeUpdater()
        
        # Generate update
        if request.type == 'planned':
            result = updater.generate_update(
                repo_url=github_url,
                github_token=github_token,
                story_ids=request.story_ids,
                feature_name=f"Update {request.project_id}",
                feature_type=request.feature_type
            )
        else:  # custom
            result = updater.generate_update(
                repo_url=github_url,
                github_token=github_token,
                custom_description=request.custom_description,
                feature_name=request.custom_description[:30],
                feature_type=request.feature_type
            )
        
        return {
            "status": "success",
            "message": result["message"],
            "components_added": result.get("components_added", 0),
            "endpoints_added": result.get("endpoints_added", 0),
            "migrations_added": result.get("migrations_added", 0),
            "github_url": github_url
        }
        
    except HTTPException as he:
        # Re-raise HTTPExceptions as-is (they have proper status codes)
        raise he
    except Exception as e:
        print(f"ERROR in update_project: {str(e)}")
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


# ==================== ANALYSIS RESULTS ENDPOINTS ====================

@app.get("/analysis-results/{project_id}")
def get_project_analyses(project_id: int, user_id: int, db: Session = Depends(get_db)):
    """Get all saved analyses for a project"""
    try:
        analyses = crud.get_project_analyses(db, project_id, user_id)
        
        # Return list of analyses (without full details)
        return [
            {
                "id": a.id,
                "project_id": a.project_id,
                "analysis_name": a.analysis_name,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "selected_story_ids": a.selected_story_ids
            }
            for a in analyses
        ]
    except Exception as e:
        print(f"ERROR in get_project_analyses: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analysis-results/{project_id}/{analysis_id}")
def get_analysis_result(project_id: int, analysis_id: int, user_id: int, db: Session = Depends(get_db)):
    """Get a specific analysis result with full details"""
    try:
        analysis = crud.get_analysis_result(db, analysis_id, user_id)
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        if analysis.project_id != project_id:
            raise HTTPException(status_code=403, detail="Unauthorized access to this analysis")
        
        return {
            "id": analysis.id,
            "project_id": analysis.project_id,
            "analysis_name": analysis.analysis_name,
            "selected_story_ids": analysis.selected_story_ids,
            "microservice_analysis": analysis.microservice_analysis,
            "frontend_analysis": analysis.frontend_analysis,
            "database_analysis": analysis.database_analysis,
            "created_at": analysis.created_at.isoformat() if analysis.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in get_analysis_result: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analysis-results/{project_id}")
def save_analysis_result(project_id: int, payload: schemas.AnalysisResultCreate, db: Session = Depends(get_db)):
    """Save a new analysis result"""
    try:
        # Ensure project_id matches
        if payload.project_id != project_id:
            raise HTTPException(status_code=400, detail="Project ID mismatch")
        
        analysis = crud.create_analysis_result(db, payload)
        
        return {
            "id": analysis.id,
            "project_id": analysis.project_id,
            "analysis_name": analysis.analysis_name,
            "created_at": analysis.created_at.isoformat() if analysis.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in save_analysis_result: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/analysis-results/{analysis_id}")
def delete_analysis_result(analysis_id: int, user_id: int, db: Session = Depends(get_db)):
    """Delete an analysis result"""
    try:
        success = crud.delete_analysis_result(db, analysis_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        return {"status": "Analysis deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in delete_analysis_result: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
