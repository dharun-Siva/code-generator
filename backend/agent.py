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
    
    def extract_pages_from_pdf(self, pdf_content: bytes) -> list:
        """Extract text from each page of PDF individually"""
        try:
            pdf_file = BytesIO(pdf_content)
            reader = PdfReader(pdf_file)
            pages_data = []
            
            for page_num, page in enumerate(reader.pages, 1):
                page_text = page.extract_text()
                if page_text.strip():
                    pages_data.append({
                        "page_number": page_num,
                        "content": page_text.strip()
                    })
            
            return pages_data
        except Exception as e:
            print(f"ERROR in extract_pages_from_pdf: {str(e)}")
            raise
    
    def generate_page_summary(self, page_content: str, page_number: int) -> dict:
        """Generate summary and key points for a single page"""
        try:
            system_prompt = """You are an expert document analyst specialized in creating structured epics and stories.
            Analyze the provided page and return a JSON response with:
            {
                "title": "Main topic/title of this page",
                "summary": "Brief summary (2-3 sentences)",
                "key_points": ["point1", "point2", "point3"],
                "suggested_story_points": 5
            }"""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Page {page_number} content:\n\n{page_content}"}
            ]
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
            )
            
            import json
            try:
                result = json.loads(response.choices[0].message.content)
            except json.JSONDecodeError:
                result = {
                    "title": f"Page {page_number} Content",
                    "summary": response.choices[0].message.content,
                    "key_points": [],
                    "suggested_story_points": 5
                }
            
            return result
        except Exception as e:
            print(f"ERROR in generate_page_summary: {str(e)}")
            raise
    
    def generate_epic_structure(self, all_pages_summaries: list) -> dict:
        """Generate hierarchical epic structure from page summaries"""
        try:
            summaries_text = ""
            for summary in all_pages_summaries:
                summaries_text += f"Page {summary['page_number']}: {summary['title']}\n"
                summaries_text += f"Summary: {summary['summary']}\n"
                summaries_text += f"Key Points: {', '.join(summary['key_points'])}\n\n"
            
            system_prompt = """You are an expert in agile methodology and story structure.
            Based on the provided page summaries, create a hierarchical epic structure.
            Return ONLY valid JSON (no markdown, no code blocks) with:
            {
                "epics": [
                    {
                        "title": "Epic Name",
                        "description": "Epic description",
                        "priority": "High",
                        "page_range": "1-5 or 1,3,5",
                        "stories": [
                            {
                                "title": "Story Title",
                                "description": "Story description",
                                "acceptance_criteria": "Criteria list",
                                "page_number": 1,
                                "story_points": 5
                            }
                        ]
                    }
                ]
            }
            IMPORTANT: Return ONLY the JSON object, nothing else."""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Create epic structure from these page summaries:\n\n{summaries_text}"}
            ]
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=4096,
            )
            
            import json
            raw_response = response.choices[0].message.content
            print(f"DEBUG: Raw epic structure response (first 200 chars):\n{raw_response[:200]}")
            
            try:
                # Try direct JSON parse first
                result = json.loads(raw_response)
                print(f"DEBUG: Successfully parsed JSON directly")
            except json.JSONDecodeError:
                print(f"DEBUG: Direct JSON parse failed, trying to remove markdown...")
                # Try removing markdown code blocks if present
                if "```json" in raw_response:
                    raw_response = raw_response.split("```json")[1].split("```")[0].strip()
                    print(f"DEBUG: Removed ```json code block")
                elif "```" in raw_response:
                    raw_response = raw_response.split("```")[1].split("```")[0].strip()
                    print(f"DEBUG: Removed ``` code block")
                
                try:
                    result = json.loads(raw_response)
                    print(f"DEBUG: Successfully parsed JSON after removing markdown")
                except json.JSONDecodeError as e:
                    print(f"ERROR: Failed to parse JSON: {e}")
                    print(f"DEBUG: Response was:\n{raw_response[:500]}")
                    result = {"epics": []}
            
            epics_count = len(result.get('epics', []))
            print(f"DEBUG: Generated {epics_count} epics from structure")
            return result
        except Exception as e:
            print(f"ERROR in generate_epic_structure: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
    
    def process_pdf_for_epics(self, pdf_content: bytes) -> dict:
        """Complete workflow: Extract pages → Summarize → Generate epics"""
        try:
            # Step 1: Extract all pages
            pages = self.extract_pages_from_pdf(pdf_content)
            if not pages:
                return {"error": "No pages extracted from PDF"}
            
            # Step 2: Generate summary for each page
            all_summaries = []
            for page_data in pages:
                summary = self.generate_page_summary(page_data["content"], page_data["page_number"])
                summary["page_number"] = page_data["page_number"]
                all_summaries.append(summary)
            
            # Step 3: Generate epic structure from summaries
            epic_structure = self.generate_epic_structure(all_summaries)
            
            return {
                "total_pages": len(pages),
                "page_summaries": all_summaries,
                "epic_structure": epic_structure
            }
        except Exception as e:
            print(f"ERROR in process_pdf_for_epics: {str(e)}")
            traceback.print_exc()
            raise
    
    def generate_standardized_epic(self, pdf_text: str) -> str:
        """Generate epic in standardized format for consistency across all users
        
        Returns standardized format:
        **Epic: [Epic Name]**
        Description: [Epic description]
        **Stories:**
        1. **[Story 1 Title]**
           Description: [Story 1 description]
        2. **[Story 2 Title]**
           Description: [Story 2 description]
        """
        try:
            system_prompt = """You are an expert in creating project epics and user stories in a STANDARDIZED format.

IMPORTANT: Your response MUST follow this EXACT format:

**Epic: [Epic Name]**
Description: [2-3 sentence description of what this epic accomplishes]

**Stories:**
1. **[Story 1 Title]**
   Description: [Clear description of what the user can do]

2. **[Story 2 Title]**
   Description: [Clear description of what the user can do]

3. **[Story 3 Title]**
   Description: [Clear description of what the user can do]

RULES:
- Use ** around Epic name and Story titles
- Each story MUST start with a number (1., 2., 3., etc.)
- Each story MUST have Description: on the next line
- Be consistent and professional
- Create 2-5 actionable stories under each epic
- Do NOT use markdown code blocks or extra formatting"""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Based on this document, create an epic with stories in the standardized format:\n\n{pdf_text}"}
            ]
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
            )
            
            return response.choices[0].message.content
        except Exception as e:
            print(f"ERROR in generate_standardized_epic: {str(e)}")
            traceback.print_exc()
            raise
