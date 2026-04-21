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
  
  // Chat list and user state
  const [currentChatId, setCurrentChatId] = useState(props.currentChatId || null);
    // Load chat data when currentChatId prop changes
    // Always load chat data on mount and when currentChatId prop changes
    useEffect(() => {
      if (props.currentChatId) {
        setCurrentChatId(props.currentChatId);
        loadChatData(props.currentChatId);
      } else {
        setCurrentChatId(null);
        setMessages([]);
        setStarted(false);
      }
      // eslint-disable-next-line
    }, [props.currentChatId]);
  const [currentUserId, setCurrentUserId] = useState(null);
  
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
  const loadChatData = async (chatId) => {
    if (!currentUserId) return;
    try {
      const response = await fetch(`${API_URL}/chats/${currentUserId}/${chatId}`);
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
    if (started) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, started, loading]);

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
      
      // If PDF is selected, upload it with the question
      if (selectedPdfFile) {
        const formData = new FormData();
        formData.append('file', selectedPdfFile);
        
        // Encode the question as a URL parameter
        const encodedQuestion = encodeURIComponent(userMessage.trim() || "");
        const pdfUrl = `${API_URL}/agent/pdf/ask?question=${encodedQuestion}`;
        
        console.log('Sending PDF with question:', userMessage);
        console.log('URL:', pdfUrl);
        
        const response = await fetch(pdfUrl, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Failed to process PDF with question');
        }
        
        const data = await response.json();
        aiResponse = data.response;
        
        // Mark PDF as loaded for follow-up questions
        setPdfLoaded(true);
        
        // Clear the selected file after sending
        setSelectedPdfFile(null);
      } else {
        // Regular chat without PDF
        aiResponse = await sendMessageToAPI(userMessage, command);
      }
      
      const updatedMessages = [
        ...newMessages,
        { sender: "bot", text: aiResponse, type: selectedPdfFile ? "pdf_analysis" : command }
      ];
      setMessages(updatedMessages);
      
      // Save to database
      const chatTitle = selectedPdfFile ? `PDF: ${selectedPdfFile.name}` : userMessage.substring(0, 50);
      saveChatToDb(updatedMessages, chatTitle);
      
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

  return (
    <div className="chatbot-main" style={{ width: '100%', maxWidth: 600, margin: '0 auto', height: '100vh', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {!started ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%", maxWidth: 900, margin: "0 auto" }}>
            <div style={{ fontSize: "2rem", fontWeight: 600, marginBottom: "1rem", color: "#222", textAlign: "center" }}>
              💬 AI Code Generator Agent
            </div>
            <div style={{ fontSize: "1rem", color: "#666", marginBottom: "2.5rem", textAlign: "center", maxWidth: 600 }}>
              Ask me anything! I can help you create projects, write code, analyze code, and more.
            </div>
            <form className="chatbot-input-area" style={{ width: "100%" }} onSubmit={handleSend}>
              <input
                type="text"
                placeholder="Ask anything..."
                value={input}
                onChange={e => setInput(e.target.value)}
                className="chatbot-input"
                autoFocus
              />
              <button type="submit" className="chatbot-send-btn">Send</button>
            </form>
          </div>
        ) : (
          <>
            <div className="chatbot-messages" style={{ flex: 1 }}>
              {messages.map((msg, idx) => (
                msg.sender === 'user' ? (
                  <div key={idx} className="chatbot-message user">
                    <span className="chatbot-message-user-text">{msg.text}</span>
                  </div>
                ) : (
                  <div key={idx} className="chatbot-message bot">
                    <div className="chatbot-message-bot-text">
                      {msg.text}
                    </div>
                    {msg.type && msg.type !== 'chat' && (
                      <div style={{ fontSize: "0.75rem", color: "#999", marginTop: "0.5rem" }}>
                        [{msg.type.toUpperCase()}]
                      </div>
                    )}
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
              {selectedPdfFile && (
                <div style={{ 
                  padding: "8px 12px", 
                  backgroundColor: "#e3f2fd", 
                  borderRadius: "4px", 
                  fontSize: "0.9rem",
                  marginBottom: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span>📄 {selectedPdfFile.name}</span>
                  <span 
                    onClick={() => setSelectedPdfFile(null)}
                    style={{ cursor: "pointer", color: "#666" }}
                  >
                    ✕
                  </span>
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
                {loading ? "..." : "Send"}
              </button>
            </form>
          </>
        )}
      </div>
  );
});

export default ChatBot;
