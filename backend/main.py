
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
