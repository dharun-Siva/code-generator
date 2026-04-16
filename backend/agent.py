import os
from groq import Groq
from dotenv import load_dotenv
import traceback

load_dotenv()

class AIAgent:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set")
        
        self.client = Groq(api_key=api_key)
        self.model = "llama-3.1-8b-instant"  # Fast and reliable
        self.conversation_history = []
        
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
