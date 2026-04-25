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
    <div className="chatbot-main" style={{ width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
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
                      background: msg.type === 'pdf_analysis' 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                        : '#4666a3',
                      padding: '0.4rem 0.9rem',
                      borderRadius: '12px',
                      width: 'fit-content',
                      fontWeight: '600',
                      letterSpacing: '0.3px',
                      boxShadow: msg.type === 'pdf_analysis' 
                        ? '0 4px 12px rgba(102, 126, 234, 0.25)'
                        : '0 2px 6px rgba(70, 102, 163, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      textTransform: 'uppercase'
                    }}>
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
