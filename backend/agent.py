import os
from groq import Groq
from dotenv import load_dotenv
import traceback
from PyPDF2 import PdfReader
from io import BytesIO

load_dotenv()

class AIAgent:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set")
        
        self.client = Groq(api_key=api_key)
        self.model = "llama-3.1-8b-instant"  # Fast and reliable
        self.conversation_history = []
        self.current_pdf_content = None  # Store current PDF text for follow-up questions
        
    def chat(self, user_message: str) -> str:
        """Simple chat response"""
        try:
            self.conversation_history.append({
                "role": "user",
                "content": user_message
            })
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=self.conversation_history,
                temperature=0.7,
                max_tokens=1024,
            )
            
            assistant_message = response.choices[0].message.content
            self.conversation_history.append({
                "role": "assistant",
                "content": assistant_message
            })
            
            return assistant_message
        except Exception as e:
            print(f"ERROR in chat: {str(e)}")
            traceback.print_exc()
            raise
    
    def create_project(self, project_info: str) -> str:
        """Help create a new project"""
        try:
            system_prompt = """You are an expert code generator assistant."""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Help me create: {project_info}"}
            ]
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
            )
            
            return response.choices[0].message.content
        except Exception as e:
            print(f"ERROR in create_project: {str(e)}")
            traceback.print_exc()
            raise
    
    def analyze_code(self, code_snippet: str) -> str:
        """Analyze code and suggest improvements"""
        try:
            system_prompt = """You are a code review expert."""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analyze: {code_snippet}"}
            ]
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
            )
            
            return response.choices[0].message.content
        except Exception as e:
            print(f"ERROR in analyze_code: {str(e)}")
            traceback.print_exc()
            raise
    
    def list_models(self) -> dict:
        """List available Groq models"""
        return {
            "models": [
                {"id": "llama-3.1-70b-versatile", "name": "Llama 3.1 70B", "context": "128K", "speed": "Very Fast"},
                {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B", "context": "128K", "speed": "Ultra Fast"},
                {"id": "gemma-7b-it", "name": "Gemma 7B", "context": "8K", "speed": "Very Fast"},
                {"id": "gemma2-9b-it", "name": "Gemma 2 9B", "context": "8K", "speed": "Fast"}
            ]
        }
    
    def reset_conversation(self):
        """Clear conversation history"""
        self.conversation_history = []
    
    def change_model(self, model_id: str):
        """Switch to a different model"""
        valid_models = ["llama-3.1-70b-versatile", "llama-3.1-8b-instant", "gemma-7b-it", "gemma2-9b-it"]
        if model_id in valid_models:
            self.model = model_id
            return f"Model: {model_id}"
        return "Invalid model"
    
    def extract_pdf_text(self, pdf_content: bytes) -> str:
        """Extract text from PDF file"""
        try:
            pdf_file = BytesIO(pdf_content)
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            print(f"ERROR in extract_pdf_text: {str(e)}")
            raise
    
    def truncate_pdf_for_api(self, pdf_text: str, max_chars: int = 8000) -> str:
        """Truncate PDF text to fit within API limits"""
        if len(pdf_text) <= max_chars:
            return pdf_text
        
        # Keep first and last parts for context
        start_chars = max_chars // 2
        end_chars = max_chars // 2
        
        truncated = pdf_text[:start_chars] + "\n\n[... PDF content truncated ...]\n\n" + pdf_text[-end_chars:]
        return truncated
    
    def analyze_pdf(self, pdf_content: bytes) -> str:
        """Analyze PDF document and provide summary"""
        try:
            # Extract text from PDF
            pdf_text = self.extract_pdf_text(pdf_content)
            
            if not pdf_text:
                return "No text could be extracted from the PDF"
            
            # Truncate to avoid API limits
            pdf_text = self.truncate_pdf_for_api(pdf_text, max_chars=8000)
            
            # Store PDF content for follow-up questions
            self.current_pdf_content = pdf_text
            
            system_prompt = """You are an expert document analyzer. 
            Analyze the provided document and give:
            1. Summary of the document
            2. Key points
            3. Main topics covered
            Keep the analysis clear and structured."""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analyze this document:\n\n{pdf_text}"}
            ]
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
            )
            
            return response.choices[0].message.content
        except Exception as e:
            print(f"ERROR in analyze_pdf: {str(e)}")
            traceback.print_exc()
            raise
    
    def answer_pdf_question(self, pdf_content: bytes, question: str) -> str:
        """Answer a question about PDF content"""
        try:
            # Extract text from PDF
            pdf_text = self.extract_pdf_text(pdf_content)
            
            if not pdf_text:
                return "No text could be extracted from the PDF"
            
            # Truncate to avoid API limits
            pdf_text = self.truncate_pdf_for_api(pdf_text, max_chars=8000)
            
            # Store for follow-up questions
            self.current_pdf_content = pdf_text
            
            system_prompt = """You are an expert document analyst. 
            Answer questions based on the provided document content.
            Be accurate and cite relevant parts from the document when possible."""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Document content:\n\n{pdf_text}\n\nQuestion: {question}"}
            ]
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
            )
            
            return response.choices[0].message.content
        except Exception as e:
            print(f"ERROR in answer_pdf_question: {str(e)}")
            traceback.print_exc()
            raise
    
    def ask_followup_question(self, question: str) -> str:
        """Ask a follow-up question about the currently stored PDF"""
        try:
            if not self.current_pdf_content:
                return "No PDF loaded. Please upload a PDF first."
            
            system_prompt = """You are an expert document analyst. 
            Answer questions based on the provided document content.
            Be accurate, detailed and cite relevant parts from the document."""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Document content:\n\n{self.current_pdf_content}\n\nQuestion: {question}"}
            ]
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
            )
            
            return response.choices[0].message.content
        except Exception as e:
            print(f"ERROR in ask_followup_question: {str(e)}")
            traceback.print_exc()
            raise
    
    def reset_pdf(self):
        """Clear the stored PDF content"""
        self.current_pdf_content = None
