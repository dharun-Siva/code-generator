
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models
import schemas
import crud
from database import SessionLocal, engine
from agent import AIAgent
from fastapi import UploadFile, File

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
    """Ask a question about PDF content, or analyze if no question provided"""
    try:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        # Read PDF file
        pdf_content = await file.read()
        
        print(f"DEBUG: Received question: {question}")  # Debug logging
        
        # If no question provided or question is empty, analyze the PDF
        if not question or question.strip() == "":
            print("DEBUG: No question, analyzing PDF")
            answer = agent.analyze_pdf(pdf_content)
        else:
            # Answer specific question about PDF
            print(f"DEBUG: Answering question: {question}")
            answer = agent.answer_pdf_question(pdf_content, question.strip())
        
        return ChatResponse(response=answer, type="pdf_question")
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Error - {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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


# ==================== DOCUMENT ENDPOINTS ====================

@app.post("/documents", response_model=schemas.DocumentOut)
def create_document(user_id: int, filename: str, db: Session = Depends(get_db)):
    """Create a new document"""
    try:
        document = crud.create_document(db, user_id, filename)
        return document
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents/{user_id}", response_model=list[schemas.DocumentOut])
def get_user_documents(user_id: int, db: Session = Depends(get_db)):
    """Get all documents for a user"""
    try:
        documents = crud.get_user_documents(db, user_id)
        return documents
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents/{user_id}/{document_id}", response_model=schemas.DocumentOut)
def get_document(user_id: int, document_id: int, db: Session = Depends(get_db)):
    """Get a specific document"""
    try:
        document = crud.get_document(db, document_id, user_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        return document
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/documents/{user_id}/{document_id}")
def delete_document(user_id: int, document_id: int, db: Session = Depends(get_db)):
    """Delete a document"""
    try:
        success = crud.delete_document(db, document_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        return {"status": "Document deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== EPIC ENDPOINTS ====================

@app.post("/epics", response_model=schemas.EpicOut)
def create_epic(document_id: int, epic: schemas.EpicCreate, db: Session = Depends(get_db)):
    """Create a new epic"""
    try:
        epic_obj = crud.create_epic(db, document_id, epic)
        return epic_obj
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/epics/document/{document_id}", response_model=list[schemas.EpicOut])
def get_document_epics(document_id: int, db: Session = Depends(get_db)):
    """Get all epics for a document"""
    try:
        epics = crud.get_document_epics(db, document_id)
        return epics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/epics/{epic_id}", response_model=schemas.EpicWithStories)
def get_epic_with_stories(epic_id: int, db: Session = Depends(get_db)):
    """Get a specific epic with all its stories"""
    try:
        epic = crud.get_epic(db, epic_id)
        if not epic:
            raise HTTPException(status_code=404, detail="Epic not found")
        return epic
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/epics/{epic_id}", response_model=schemas.EpicOut)
def update_epic(epic_id: int, epic_update: schemas.EpicUpdate, db: Session = Depends(get_db)):
    """Update an epic"""
    try:
        epic = crud.update_epic(db, epic_id, epic_update)
        if not epic:
            raise HTTPException(status_code=404, detail="Epic not found")
        return epic
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/epics/{epic_id}")
def delete_epic(epic_id: int, db: Session = Depends(get_db)):
    """Delete an epic"""
    try:
        success = crud.delete_epic(db, epic_id)
        if not success:
            raise HTTPException(status_code=404, detail="Epic not found")
        return {"status": "Epic deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STORY ENDPOINTS ====================

@app.post("/stories", response_model=schemas.StoryOut)
def create_story(epic_id: int, story: schemas.StoryCreate, db: Session = Depends(get_db)):
    """Create a new story"""
    try:
        story_obj = crud.create_story(db, epic_id, story)
        return story_obj
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stories/epic/{epic_id}", response_model=list[schemas.StoryOut])
def get_epic_stories(epic_id: int, db: Session = Depends(get_db)):
    """Get all stories for an epic"""
    try:
        stories = crud.get_epic_stories(db, epic_id)
        return stories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stories/{story_id}", response_model=schemas.StoryOut)
def get_story(story_id: int, db: Session = Depends(get_db)):
    """Get a specific story"""
    try:
        story = crud.get_story(db, story_id)
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")
        return story
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/stories/{story_id}", response_model=schemas.StoryOut)
def update_story(story_id: int, story_update: schemas.StoryUpdate, db: Session = Depends(get_db)):
    """Update a story"""
    try:
        story = crud.update_story(db, story_id, story_update)
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")
        return story
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/stories/{story_id}")
def delete_story(story_id: int, db: Session = Depends(get_db)):
    """Delete a story"""
    try:
        success = crud.delete_story(db, story_id)
        if not success:
            raise HTTPException(status_code=404, detail="Story not found")
        return {"status": "Story deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== EPIC GENERATION ENDPOINT ====================

@app.post("/epics/generate-from-pdf")
async def generate_epics_from_pdf(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload PDF and generate epic structure"""
    try:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        print(f"\n{'='*60}")
        print(f"DEBUG: Starting epic generation for file: {file.filename}")
        print(f"DEBUG: User ID: {user_id}")
        print(f"{'='*60}\n")
        
        # Read PDF file
        pdf_content = await file.read()
        print(f"DEBUG: PDF file read, size: {len(pdf_content)} bytes")
        
        # Create document record
        document = crud.create_document(db, user_id, file.filename)
        print(f"DEBUG: Created document record, ID: {document.id}")
        
        # Process PDF and generate epics
        print(f"DEBUG: Starting PDF processing...")
        result = agent.process_pdf_for_epics(pdf_content)
        
        print(f"DEBUG: PDF processing complete")
        print(f"DEBUG: Total pages extracted: {result.get('total_pages', 0)}")
        
        # Update document with page count
        document.total_pages = result.get("total_pages", 0)
        document.status = "completed"
        db.commit()
        print(f"DEBUG: Document updated with page count")
        
        # Create epics from the generated structure
        epic_structure = result.get("epic_structure", {})
        print(f"DEBUG: Epic structure has {len(epic_structure.get('epics', []))} epics")
        
        created_epics = []
        
        for idx, epic_data in enumerate(epic_structure.get("epics", [])):
            print(f"\nDEBUG: Processing epic {idx + 1}: {epic_data.get('title', 'Untitled')}")
            
            # Create epic
            epic_create = schemas.EpicCreate(
                title=epic_data.get("title", "Untitled"),
                description=epic_data.get("description", ""),
                page_range=epic_data.get("page_range", ""),
                priority=epic_data.get("priority", "Medium")
            )
            epic = crud.create_epic(db, document.id, epic_create)
            print(f"DEBUG: Created epic, ID: {epic.id}")
            
            # Create stories for this epic
            stories_list = epic_data.get("stories", [])
            print(f"DEBUG: Epic has {len(stories_list)} stories")
            
            for story_idx, story_data in enumerate(stories_list):
                print(f"DEBUG: Creating story {story_idx + 1}: {story_data.get('title', 'Untitled')}")
                
                story_create = schemas.StoryCreate(
                    title=story_data.get("title", "Untitled"),
                    description=story_data.get("description", ""),
                    acceptance_criteria=story_data.get("acceptance_criteria", ""),
                    page_number=story_data.get("page_number"),
                    story_points=story_data.get("story_points", 5)
                )
                crud.create_story(db, epic.id, story_create)
                print(f"DEBUG: Story created")
            
            created_epics.append(epic)
        
        print(f"\nDEBUG: Total epics created: {len(created_epics)}")
        print(f"{'='*60}\n")
        
        return {
            "document_id": document.id,
            "filename": file.filename,
            "total_pages": result.get("total_pages", 0),
            "epics_created": len(created_epics),
            "status": "success"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in generate_epics_from_pdf: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
