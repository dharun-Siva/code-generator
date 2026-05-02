import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import './ChatBot.css';

const API_URL = 'http://localhost:8000';

const ChatBot = forwardRef((props, ref) => {
  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("llama-3.1-8b-instant");
  const [pdfLoaded, setPdfLoaded] = useState(false);  // Track if PDF is loaded
  const [selectedPdfFile, setSelectedPdfFile] = useState(null);  // Store selected PDF file
  const [showPdfName, setShowPdfName] = useState(false);  // Toggle to show PDF name
  
  // Epic generation state
  const [pendingEpic, setPendingEpic] = useState(null);  // Epic waiting for approval
  const [pendingStories, setPendingStories] = useState([]);  // Stories waiting for approval
  const [approvalMode, setApprovalMode] = useState(false);  // Whether in approval mode
  const [currentDocumentId, setCurrentDocumentId] = useState(null);  // Document ID for saving
  
  // Chat list and user state
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(props.currentChatId || null);
  
  // Load chat data when currentChatId prop changes and user is loaded
  useEffect(() => {
    if (props.currentChatId && currentUserId) {
      setCurrentChatId(props.currentChatId);
      loadChatData(props.currentChatId, currentUserId);
    }
    // eslint-disable-next-line
  }, [props.currentChatId, currentUserId]);
  
  const messagesEndRef = useRef(null);

  // PDF upload handler
  const fileInputRef = useRef(null);
  
  const handlePDFUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.pdf')) {
      alert('Please upload a PDF file');
      return;
    }
    
    // Store the selected PDF file (no alert)
    setSelectedPdfFile(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Load user data from props and localStorage
  useEffect(() => {
    if (props.user && props.user.id) {
      setCurrentUserId(props.user.id);
    } else {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          setCurrentUserId(user.id);
        } catch (error) {
          console.error('Error loading user:', error);
        }
      }
    }
  }, [props.user]);

  // Load chat when both userId and chatId are available
  useEffect(() => {
    if (props.currentChatId && currentUserId) {
      loadChatData(props.currentChatId, currentUserId);
    }
    // eslint-disable-next-line
  }, [currentUserId]);

  // Load user chats
  const loadUserChats = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/chats/${userId}`);
      if (response.ok) {
        const chats = await response.json();
        // Chat list is managed by parent now
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  // Load specific chat - exposed via ref
  const loadChatData = async (chatId, userId = null) => {
    const userIdToUse = userId || currentUserId;
    if (!userIdToUse) return;
    try {
      const response = await fetch(`${API_URL}/chats/${userIdToUse}/${chatId}`);
      if (response.ok) {
        const chat = await response.json();
        setCurrentChatId(chatId);
        try {
          const parsedMessages = JSON.parse(chat.messages || '[]');
          setMessages(parsedMessages);
          setStarted(true);
        } catch (e) {
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  // Save chat to database
  const saveChatToDb = async (chatMessages, chatTitle = "Chat") => {
    if (!currentUserId) {
      console.error('No user ID available');
      return null;
    }
    
    try {
      // If no current chat, create a new one
      if (!currentChatId) {
        const createResponse = await fetch(
          `${API_URL}/chats?user_id=${currentUserId}&title=${encodeURIComponent(chatTitle)}`,
          { method: 'POST' }
        );
        
        if (createResponse.ok) {
          const newChat = await createResponse.json();
          const chatId = newChat.id;
          setCurrentChatId(chatId);
          
          // Save messages to the new chat
          const messagesJson = JSON.stringify(chatMessages);
          const saveResponse = await fetch(
            `${API_URL}/chats/${currentUserId}/${chatId}/messages`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: messagesJson })
            }
          );
          
          if (saveResponse.ok) {
            console.log('Chat saved to database');
            // Notify parent that chat was saved
            if (props.onChatSaved) {
              props.onChatSaved();
            }
            return chatId;
          } else {
            console.error('Failed to save messages:', await saveResponse.text());
          }
        } else {
          console.error('Failed to create chat:', await createResponse.text());
        }
      } else {
        // Update existing chat
        const messagesJson = JSON.stringify(chatMessages);
        const updateResponse = await fetch(
          `${API_URL}/chats/${currentUserId}/${currentChatId}/messages`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: messagesJson })
          }
        );
        
        if (updateResponse.ok) {
          console.log('Chat updated in database');
          // Notify parent that chat was saved
          if (props.onChatSaved) {
            props.onChatSaved();
          }
          return currentChatId;
        } else {
          console.error('Failed to update chat:', await updateResponse.text());
        }
      }
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  };

  useImperativeHandle(ref, () => ({
    resetChat: () => {
      setMessages([]);
      setInput("");
      setStarted(false);
      setLoading(false);
      setCurrentChatId(null);
      fetch(`${API_URL}/agent/reset`, { method: 'POST' });
    },
    loadChatData: loadChatData
  }));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const detectCommand = (text) => {
    const lowerText = text.toLowerCase();
    if (lowerText.startsWith('@create') || lowerText.includes('create project')) return 'create';
    if (lowerText.startsWith('@analyze') || lowerText.includes('analyze code')) return 'analyze';
    if (lowerText.startsWith('@models')) return 'models';
    if (lowerText.startsWith('@clear')) return 'clear';
    return 'chat';
  };

  const sendMessageToAPI = async (message, command) => {
    try {
      setLoading(true);
      let endpoint = `${API_URL}/agent/chat`;
      let requestBody = { message };

      if (command === 'create') {
        endpoint = `${API_URL}/agent/create`;
        requestBody.message = message.replace('@create', '').trim();
      } else if (command === 'analyze') {
        endpoint = `${API_URL}/agent/analyze`;
        requestBody.message = message.replace('@analyze', '').trim();
      } else if (command === 'models') {
        endpoint = `${API_URL}/agent/models`;
        const modelsResponse = await fetch(endpoint);
        const modelsData = await modelsResponse.json();
        const modelsText = modelsData.models.map(m => 
          `• ${m.name} (${m.id})\n  Context: ${m.context} | Speed: ${m.speed}`
        ).join('\n');
        return `Available AI Models:\n\n${modelsText}`;
      } else if (command === 'clear') {
        endpoint = `${API_URL}/agent/reset`;
        await fetch(endpoint, { method: 'POST' });
        // Also reset PDF
        setPdfLoaded(false);
        setSelectedPdfFile(null);
        setShowPdfName(false);
        await fetch(`${API_URL}/agent/pdf/reset`, { method: 'POST' });
        return "Chat history cleared! Start fresh conversation.";
      } else if (command === 'chat' && pdfLoaded) {
        // If PDF is loaded and user sends regular message, ask follow-up question about PDF
        endpoint = `${API_URL}/agent/pdf/followup`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error(`API error: ${response.statusText}`);
      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('API Error:', error);
      return `Sorry, I encountered an error: ${error.message}`;
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() && !selectedPdfFile) return;
    
    const userMessage = input || (selectedPdfFile ? `Analyze: ${selectedPdfFile.name}` : "");
    const command = detectCommand(userMessage);
    
    if (!started) setStarted(true);

    // Add user message
    const newMessages = [
      ...messages,
      { sender: "user", text: userMessage || `📄 ${selectedPdfFile.name}` }
    ];
    setMessages(newMessages);
    setInput("");

    try {
      setLoading(true);
      let aiResponse;
      let hasEpicData = false;
      
      // If PDF is selected, upload it to get AI analysis + generate epics (FIRST TIME)
      if (selectedPdfFile) {
        console.log('Processing PDF:', selectedPdfFile.name);
        
        // ========== REQUEST 1: Get AI text analysis for display ==========
        const formData1 = new FormData();
        formData1.append('file', selectedPdfFile);
        
        const encodedQuestion = encodeURIComponent(userMessage.trim() || "");
        const pdfAnalysisUrl = `${API_URL}/agent/pdf/ask?question=${encodedQuestion}`;
        
        console.log('Step 1: Calling AI analysis endpoint...');
        const analysisResponse = await fetch(pdfAnalysisUrl, {
          method: 'POST',
          body: formData1
        });
        
        if (!analysisResponse.ok) {
          throw new Error('Failed to analyze PDF');
        }
        
        const analysisData = await analysisResponse.json();
        aiResponse = analysisData.response;
        console.log('Step 1 Complete: Got AI response');
        
        // Mark PDF as loaded in backend for follow-up questions
        setPdfLoaded(true);
        
        // Clear the selected file after sending (but keep pdfLoaded = true)
        setSelectedPdfFile(null);
      } 
      // If PDF is loaded (follow-up question about already analyzed PDF)
      else if (pdfLoaded && userMessage.trim()) {
        console.log('Sending follow-up question about loaded PDF');
        
        try {
          const response = await fetch(`${API_URL}/agent/pdf/followup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage })
          });

          if (!response.ok) {
            throw new Error('Failed to get PDF follow-up response');
          }

          const data = await response.json();
          aiResponse = data.response;
          console.log('Follow-up response received');

          // Try to parse epic data from response (regardless of user message)
          if (aiResponse) {
            hasEpicData = processEpicGeneration(aiResponse);
          }
        } catch (err) {
          console.error('Error in PDF follow-up:', err);
          aiResponse = `Error: ${err.message}`;
        }
      }
      else {
        // Regular chat without PDF
        aiResponse = await sendMessageToAPI(userMessage, command);
        
        // Try to parse epic data from response (regardless of user message)
        if (aiResponse) {
          hasEpicData = processEpicGeneration(aiResponse);
        }
      }
      
      const updatedMessages = [
        ...newMessages,
        { 
          sender: "bot", 
          text: aiResponse, 
          type: selectedPdfFile ? "pdf_analysis" : (hasEpicData ? "epic_generation" : command)
        }
      ];
      setMessages(updatedMessages);
      
      // Only save to DB if not in approval mode (avoid double saves)
      if (!approvalMode && !hasEpicData) {
        const chatTitle = selectedPdfFile ? `PDF: ${selectedPdfFile.name}` : userMessage.substring(0, 50);
        saveChatToDb(updatedMessages, chatTitle);
      }
      
    } catch (error) {
      console.error('Error:', error);
      const updatedMessages = [
        ...newMessages,
        { sender: "bot", text: `Error: ${error.message}`, type: "error" }
      ];
      setMessages(updatedMessages);
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = () => {
    setMessages([]);
    setInput("");
    setStarted(false);
    setCurrentChatId(null);
    setPdfLoaded(false);
    setSelectedPdfFile(null);  // Clear selected PDF
    setPendingEpic(null);
    setPendingStories([]);
    setApprovalMode(false);
  };

  const deleteChat = async (chatId) => {
    if (!currentUserId) return;
    try {
      await fetch(`${API_URL}/chats/${currentUserId}/${chatId}`, { method: 'DELETE' });
      loadUserChats(currentUserId);
      if (currentChatId === chatId) createNewChat();
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  // ==================== EPIC GENERATION FUNCTIONS ====================

  /**
   * Parse AI response to extract epic and stories
   * Expected format from AI:
   * Epic: Title
   * Description: ...
   * Stories:
   * - Story 1: Description
   * - Story 2: Description
   */
  const parseEpicFromResponse = (response) => {
    try {
      // Check if response contains epic or user story patterns
      const hasEpicKeyword = response.toLowerCase().includes('epic');
      const hasAsAPattern = response.toLowerCase().includes('as a ');
      const hasUserStoriesKeyword = response.toLowerCase().includes('user stor');
      
      if (!hasEpicKeyword && !hasAsAPattern && !hasUserStoriesKeyword) {
        return null;
      }

      const lines = response.split('\n').map(line => line.trim()).filter(line => line);
      let epic = {
        title: '',
        description: '',
        stories: []
      };

      let currentSection = '';
      let currentStory = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();

        // Skip lines that are just "Acceptance" or "Acceptance Criteria:" - don't treat as stories
        if (lowerLine === 'acceptance' || lowerLine === 'acceptance criteria:' || lowerLine === '* acceptance criteria:') {
          continue;
        }

        // Detect Epic Title - Handle formats: **Epic:** Title, Epic: Title, etc.
        if (lowerLine.includes('**epic') && !lowerLine.includes('description') && !lowerLine.includes('user')) {
          // Extract everything after "Epic:" or "Epic**:"
          const match = line.match(/\*?\*?[Ee]pic[:\s*]*\*?\*?\s*:?\s*(.+?)(?:\*\*)?$/);
          if (match) {
            epic.title = match[1].trim().replace(/\*\*/g, '');
          }
        } else if (lowerLine.startsWith('epic:') && !lowerLine.includes('description')) {
          epic.title = line.substring(5).trim();
        }
        
        // Detect Epic Description 
        else if ((lowerLine.includes('description:') || lowerLine.startsWith('description')) && !lowerLine.includes('user story') && !lowerLine.includes('acceptance')) {
          epic.description = line.split(':').slice(1).join(':').trim().replace(/\*\*/g, '');
          currentSection = 'epic';
        }
        
        // Detect Stories Section
        else if (lowerLine.includes('user stor') || lowerLine.includes('**user stories') || lowerLine.includes('**child user stories')) {
          currentSection = 'stories';
        }
        
        // Detect Story Items - numbered (1., 2.) or bullet (-, *), or "As a" pattern
        // BUT skip if line is just "Acceptance" or contains only "Acceptance"
        else if (currentSection === 'stories' && (
          lowerLine.match(/^\d+\.?\s+/) ||  // Numbered like "1. " or "1) "
          lowerLine.match(/^[-*]\s+(?!acceptance)/i) ||     // Bullet points (but not "- Acceptance")
          lowerLine.match(/^as\s+a\s+/) ||   // Direct "As a" pattern
          lowerLine.match(/us-\d+/)          // Story ID like US-001
        )) {
          // Save previous story if exists
          if (currentStory && currentStory.title) {
            epic.stories.push({
              title: currentStory.title,
              description: currentStory.description || ''
            });
          }
          
          // Extract story title - Remove numbering/bullets and get the full story
          let storyText = line
            .replace(/^\d+\.?\s+/, '')        // Remove "1. " 
            .replace(/^\d+\)\s+/, '')         // Remove "1) "
            .replace(/^[-*]\s+/, '')          // Remove "- " or "* "
            .trim();
          
          // If it has bold, clean it
          storyText = storyText.replace(/\*\*(.+?)\*\*/g, '$1');
          
          // For "As a..." pattern, keep the entire sentence as the title
          if (storyText.toLowerCase().startsWith('as a ')) {
            // Extract up to the first line break or acceptance criteria
            const titleMatch = storyText.match(/^(as\s+a\s+.+?)(?:\n|acceptance|criteria|$)/i);
            if (titleMatch) {
              currentStory = {
                title: titleMatch[1].trim(),
                description: ''
              };
            } else {
              currentStory = {
                title: storyText,
                description: ''
              };
            }
          } else {
            // For other formats, try to extract title before acceptance criteria
            const titleMatch = storyText.match(/^(.+?)(?:\s+acceptance|\s+criteria|\s+–|\s+-|$)/i);
            currentStory = {
              title: titleMatch ? titleMatch[1].trim() : storyText,
              description: ''
            };
          }
        }
        
        // Capture story description/acceptance criteria (only add to current story, don't create new entries)
        else if (currentSection === 'stories' && currentStory && (lowerLine.includes('acceptance') || lowerLine.startsWith('+'))) {
          let criteria = [];
          let j = i;
          // Collect acceptance criteria lines - these should NOT become separate stories
          while (j < lines.length) {
            const criteriaLine = lines[j];
            const criteriaLineLower = criteriaLine.toLowerCase();
            
            // Stop if we hit a new story (numbered or "As a")
            if (j > i && (criteriaLineLower.match(/^\d+\.?\s+/) || criteriaLineLower.match(/^as\s+a\s+/) || criteriaLineLower.match(/us-\d+/))) {
              break;
            }
            
            // Collect acceptance criteria text
            if (criteriaLineLower.includes('acceptance') || criteriaLine.match(/^\s*[\+\-\*]\s+/)) {
              let criterionText = criteriaLine
                .replace(/^[\+\-\*]\s+/, '')  // Remove bullet
                .replace(/^(acceptance|criteria):\s*/i, '')  // Remove "Acceptance Criteria:" label
                .trim();
              
              // Skip if it's just the word "Acceptance"
              if (criterionText && criterionText.toLowerCase() !== 'acceptance') {
                criteria.push(criterionText);
              }
              j++;
            } else if (criteriaLine.match(/^\s+[\+\-\*]\s+/)) {
              // Indented bullet point
              let criterionText = criteriaLine.trim().replace(/^[\+\-\*]\s+/, '');
              if (criterionText && !criterionText.toLowerCase().match(/^(as |epic |story |user |acceptance)/)) {
                criteria.push(criterionText);
              }
              j++;
            } else if (criteria.length > 0) {
              break;
            } else {
              j++;
            }
          }
          
          if (criteria.length > 0) {
            currentStory.description = criteria.join('\n').replace(/\*\*/g, '');
            i = j - 1;
          }
        }
      }

      // Add last story if exists
      if (currentStory && currentStory.title) {
        epic.stories.push({
          title: currentStory.title,
          description: currentStory.description || ''
        });
      }

      // Return null if not enough data
      if (!epic.title || epic.stories.length === 0) {
        console.log('Parsing failed - Title:', epic.title, 'Stories:', epic.stories.length);
        return null;
      }

      console.log('Successfully parsed epic:', epic);
      return epic;
    } catch (error) {
      console.error('Error parsing epic from response:', error);
      return null;
    }
  };

  /**
   * Save epic with stories to database
   */
  const saveEpicWithStories = async () => {
    if (!pendingEpic) {
      console.error('No pending epic to save');
      return;
    }

    try {
      setLoading(true);

      // Ensure we have required data
      if (!currentChatId || !currentUserId) {
        throw new Error('Chat ID or User ID missing');
      }

      const payload = {
        project_id: currentChatId,  // Use chat ID as project_id
        user_id: currentUserId,
        epic_id: 1,  // Epic counter (can be incremented for multiple epics)
        epic_title: pendingEpic.title,  // Epic name
        epic_description: pendingEpic.description,  // Store ONLY epic description (NOT story descriptions)
        stories: pendingEpic.stories.map((story, idx) => ({
          story_id: idx + 1,  // Story counter starting from 1
          story_title: story.title  // Story name only - NO descriptions
        }))
      };

      console.log('Saving epic with payload:', payload);

      const response = await fetch(`${API_URL}/project-items/batch-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save epic');
      }

      const result = await response.json();
      console.log('Epic saved successfully:', result);

      // Add success message to chat
      const successMessage = `✅ Epic "${pendingEpic.title}" with ${pendingEpic.stories.length} stories saved successfully!`;
      const updatedMessages = [
        ...messages,
        { sender: "bot", text: successMessage, type: "epic_saved" }
      ];
      setMessages(updatedMessages);
      saveChatToDb(updatedMessages);

      // Clear pending epic
      setPendingEpic(null);
      setPendingStories([]);
      setApprovalMode(false);

    } catch (error) {
      console.error('Error saving epic:', error);
      const errorMessage = `❌ Error saving epic: ${error.message}`;
      const updatedMessages = [
        ...messages,
        { sender: "bot", text: errorMessage, type: "error" }
      ];
      setMessages(updatedMessages);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle user approval for epic
   */
  const handleApproveEpic = () => {
    saveEpicWithStories();
  };

  /**
   * Handle rejecting epic (cancel approval)
   */
  const handleRejectEpic = () => {
    setPendingEpic(null);
    setPendingStories([]);
    setApprovalMode(false);
    const cancelMessage = "Epic generation cancelled. You can ask me to generate a new epic.";
    const updatedMessages = [
      ...messages,
      { sender: "bot", text: cancelMessage, type: "chat" }
    ];
    setMessages(updatedMessages);
    saveChatToDb(updatedMessages);
  };

  /**
   * Check if response contains epic generation request and process it
   */
  const processEpicGeneration = (response) => {
    console.log('Processing epic generation...');
    const parsedEpic = parseEpicFromResponse(response);
    
    if (parsedEpic) {
      console.log('Epic parsed successfully, showing approval modal:', parsedEpic);
      setPendingEpic(parsedEpic);
      setPendingStories(parsedEpic.stories);
      setApprovalMode(true);
      return true;
    }
    console.log('Failed to parse epic from response');
    return false;
  };

  // ==================== END EPIC FUNCTIONS ====================

  return (
    <div className="chatbot-main" style={{ width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Epic Approval Modal */}
        {approvalMode && pendingEpic && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              animation: 'slideUp 0.3s ease'
            }}>
              <h2 style={{
                color: '#fff',
                marginBottom: '16px',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span>📊</span> Review Generated Epic
              </h2>

              <p style={{
                color: '#aaa',
                marginBottom: '24px',
                fontSize: '0.95rem'
              }}>
                Please review the epic and stories below. Click "Approve" to save them to the database.
              </p>

              {/* Epic Details */}
              <div style={{
                background: 'rgba(102, 126, 234, 0.1)',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  color: '#667eea',
                  marginBottom: '8px',
                  fontSize: '1.1rem'
                }}>
                  Epic: {pendingEpic.title}
                </h3>
                <p style={{
                  color: '#ddd',
                  fontSize: '0.95rem',
                  margin: 0
                }}>
                  {pendingEpic.description}
                </p>
              </div>

              {/* Stories List */}
              <div style={{
                marginBottom: '24px'
              }}>
                <h4 style={{
                  color: '#fff',
                  marginBottom: '12px',
                  fontSize: '1rem',
                  fontWeight: 600
                }}>
                  Stories ({pendingEpic.stories.length}):
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {pendingEpic.stories.map((story, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(56, 239, 125, 0.1)',
                      border: '1px solid rgba(56, 239, 125, 0.3)',
                      borderRadius: '8px',
                      padding: '12px',
                      borderLeft: '4px solid #38ef7d'
                    }}>
                      <h5 style={{
                        color: '#38ef7d',
                        margin: '0 0 6px 0',
                        fontSize: '0.95rem',
                        fontWeight: 600
                      }}>
                        {idx + 1}. {story.title}
                      </h5>
                      <p style={{
                        color: '#aaa',
                        margin: 0,
                        fontSize: '0.9rem'
                      }}>
                        {story.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={handleRejectEpic}
                  disabled={loading}
                  style={{
                    background: 'rgba(255, 85, 85, 0.2)',
                    border: '1px solid rgba(255, 85, 85, 0.5)',
                    color: '#ff5555',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    opacity: loading ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.background = 'rgba(255, 85, 85, 0.3)';
                      e.target.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.background = 'rgba(255, 85, 85, 0.2)';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveEpic}
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                    border: 'none',
                    color: '#fff',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    opacity: loading ? 0.6 : 1,
                    boxShadow: '0 4px 12px rgba(56, 239, 125, 0.25)'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 16px rgba(56, 239, 125, 0.35)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(56, 239, 125, 0.25)';
                    }
                  }}
                >
                  {loading ? 'Saving...' : 'Approve & Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="chatbot-messages" style={{ flex: 1, overflowY: 'auto', paddingBottom: '140px' }}>
          {messages.map((msg, idx) => (
            msg.sender === 'user' ? (
              <div key={idx} className="chatbot-message user">
                <span className="chatbot-message-user-text">{msg.text}</span>
              </div>
            ) : (
              <div key={idx} className="chatbot-message bot">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  <div className="chatbot-message-bot-text">
                    {msg.text}
                  </div>
                  {msg.type && msg.type !== 'chat' && (
                    <div style={{ 
                      fontSize: "0.75rem", 
                      color: "#fff", 
                      background: msg.type === 'epic_generation' 
                        ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                        : msg.type === 'pdf_analysis' 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                        : '#4666a3',
                      padding: '0.4rem 0.9rem',
                      borderRadius: '12px',
                      width: 'fit-content',
                      fontWeight: '600',
                      letterSpacing: '0.3px',
                      boxShadow: msg.type === 'epic_generation'
                        ? '0 4px 12px rgba(17, 153, 142, 0.25)'
                        : msg.type === 'pdf_analysis' 
                        ? '0 4px 12px rgba(102, 126, 234, 0.25)'
                        : '0 2px 6px rgba(70, 102, 163, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      textTransform: 'uppercase'
                    }}>
                      {msg.type === 'epic_generation' && <span>📊</span>}
                      {msg.type === 'pdf_analysis' && <span>📄</span>}
                      {msg.type === 'create' && <span>✨</span>}
                      {msg.type === 'analyze' && <span>🔍</span>}
                      {msg.type.replace('_', ' ')}
                    </div>
                  )}
                </div>
              </div>
            )
          ))}
          {loading && (
            <div className="chatbot-message bot">
              <div className="chatbot-typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
            <form className="chatbot-input-area" onSubmit={handleSend}>
              <span className="chatbot-plus-symbol" onClick={() => fileInputRef.current?.click()}>+</span>
              <input
                ref={fileInputRef}
                id="chatbot-file-input"
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handlePDFUpload}
              />
              
              {/* PDF Loaded Indicator */}
              {pdfLoaded && !selectedPdfFile && (
                <div style={{
                  position: 'absolute',
                  bottom: '70px',
                  left: '20px',
                  right: '20px',
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
                  border: '1px solid rgba(102, 126, 234, 0.4)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backdropFilter: 'blur(10px)',
                  zIndex: 10
                }}>
                  <span style={{
                    color: '#667eea',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    📄 PDF Loaded - Ask follow-up questions
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPdfLoaded(false);
                      setSelectedPdfFile(null);
                      fetch(`${API_URL}/agent/pdf/reset`, { method: 'POST' });
                    }}
                    style={{
                      background: 'rgba(255, 85, 85, 0.3)',
                      border: 'none',
                      color: '#ff5555',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 85, 85, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(255, 85, 85, 0.3)';
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
              
              {selectedPdfFile && (
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  {/* Circle Button */}
                  <button
                    type="button"
                    onClick={() => setShowPdfName(!showPdfName)}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.6rem',
                      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.35)',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.15) translateY(-3px)';
                      e.target.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.45)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.35)';
                    }}
                  >
                    📄
                  </button>

                  {/* PDF Name Tooltip */}
                  {showPdfName && (
                    <div style={{
                      position: 'absolute',
                      bottom: '110%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#fff',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      fontSize: '0.88rem',
                      whiteSpace: 'nowrap',
                      marginBottom: '12px',
                      boxShadow: '0 8px 24px rgba(102, 126, 234, 0.35), 0 0 1px rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      animation: 'popIn 0.3s ease',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      fontWeight: '600'
                    }}>
                      <span style={{ 
                        maxWidth: '200px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{ fontSize: '1rem' }}>✓</span>
                        {selectedPdfFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPdfFile(null);
                          setShowPdfName(false);
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.25)',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '1rem',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '28px',
                          minHeight: '28px'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(255, 255, 255, 0.35)';
                          e.target.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                          e.target.style.transform = 'scale(1)';
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  
                  {/* Arrow pointer */}
                  {showPdfName && (
                    <div style={{
                      position: 'absolute',
                      bottom: '102%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '8px solid transparent',
                      borderRight: '8px solid transparent',
                      borderTop: '8px solid rgba(102, 126, 234, 0.5)',
                      zIndex: 1001,
                      animation: 'popIn 0.3s ease'
                    }} />
                  )}
                </div>
              )}
              <input
                type="text"
                placeholder={selectedPdfFile ? "Type your question about the PDF..." : "Type your message..."}
                value={input}
                onChange={e => setInput(e.target.value)}
                className="chatbot-input"
                disabled={loading}
              />
              <button type="submit" className="chatbot-send-btn" disabled={loading}>
                {loading ? <span style={{ animation: 'pulse 1.5s infinite' }}>●</span> : "➤"}
              </button>
            </form>
      </div>
  );
});

export default ChatBot;
