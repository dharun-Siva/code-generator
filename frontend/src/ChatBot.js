import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import './ChatBot.css';


const ChatBot = forwardRef((props, ref) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const messagesEndRef = useRef(null);

  useImperativeHandle(ref, () => ({
    resetChat: () => {
      setMessages([]);
      setInput("");
      setStarted(false);
    }
  }));

  useEffect(() => {
    if (started) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, started]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (!started) setStarted(true);
    setMessages((msgs) => [
      ...msgs,
      { sender: "user", text: input },
      { sender: "bot", text: "Hi! How can I help you today?" },
    ]);
    setInput("");
  };

  return (
    <div className="chatbot-container">
      {!started ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ fontSize: "2rem", fontWeight: 600, marginBottom: "2.5rem", color: "#222", textAlign: "center" }}>
            What's on your mind today?
          </div>
          <form className="chatbot-input-area" style={{ width: "100%" }} onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Ask anything"
              value={input}
              onChange={e => setInput(e.target.value)}
              className="chatbot-input"
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
                  {msg.text}
                </div>
              )
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form className="chatbot-input-area" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              className="chatbot-input"
            />
            <button type="submit" className="chatbot-send-btn">Send</button>
          </form>
        </>
      )}
    </div>
  );
});

export default ChatBot;
