import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  MessageSquare, Send, ThumbsUp, ThumbsDown, X, Minimize2, 
  Maximize2, Trash2, Plus, Settings, Download, FileText 
} from 'lucide-react';
import './Chatbot.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [showConversations, setShowConversations] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations when opened
  useEffect(() => {
    if (isOpen && showConversations) {
      loadConversations();
    }
  }, [isOpen, showConversations]);

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  // API configuration
  const axiosConfig = () => ({
    headers: {
      'Authorization': getAuthToken(),
      'Content-Type': 'application/json'
    }
  });

  // Load user conversations
  const loadConversations = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/chatbot/conversations`,
        axiosConfig()
      );
      if (response.data.success) {
        setConversations(response.data.conversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  // Load specific conversation
  const loadConversation = async (conversationId) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/chatbot/conversations/${conversationId}`,
        axiosConfig()
      );
      if (response.data.success) {
        setCurrentConversation(response.data.conversation);
        setMessages(response.data.messages);
        setSessionId(response.data.conversation.session_id);
        setShowConversations(false);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    setIsLoading(true);

    // Add user message to UI immediately
    const tempUserMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await axios.post(
        `${API_URL}/api/chatbot/messages`,
        {
          message: userMessage,
          sessionId: sessionId
        },
        axiosConfig()
      );

      if (response.data.success) {
        // Update session ID if new conversation
        if (response.data.sessionId && !sessionId) {
          setSessionId(response.data.sessionId);
        }

        // Add assistant message
        const assistantMsg = {
          id: response.data.messageId,
          role: 'assistant',
          content: response.data.message,
          created_at: new Date().toISOString(),
          metadata: response.data.metadata,
          hasAttachment: response.data.hasAttachment,
          attachmentType: response.data.attachmentType,
          attachmentUrl: response.data.attachmentUrl,
          attachmentName: response.data.attachmentName
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        // Error message
        const errorMsg = {
          id: Date.now(),
          role: 'assistant',
          content: response.data.message || 'Sorry, I encountered an error.',
          created_at: new Date().toISOString(),
          isError: true
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg = {
        id: Date.now(),
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting. Please try again.',
        created_at: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit feedback
  const submitFeedback = async (messageId, feedbackType, rating) => {
    try {
      await axios.post(
        `${API_URL}/api/chatbot/feedback`,
        {
          messageId,
          feedbackType,
          rating
        },
        axiosConfig()
      );
      // Update message to show feedback submitted
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, feedbackSubmitted: true, feedbackType }
            : msg
        )
      );
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  // Download file attachment
  const downloadAttachment = async (attachmentUrl, attachmentName) => {
    try {
      const response = await axios.get(
        `${API_URL}${attachmentUrl}`,
        {
          ...axiosConfig(),
          responseType: 'blob'
        }
      );
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachmentName || 'IEMS_Report.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId) => {
    try {
      await axios.delete(
        `${API_URL}/api/chatbot/conversations/${conversationId}`,
        axiosConfig()
      );
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        startNewConversation();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // Start new conversation
  const startNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
    setSessionId(null);
    setShowConversations(false);
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Download report
  const downloadReport = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/chatbot/report`,
        axiosConfig()
      );
      
      if (response.data.success) {
        // Create and download JSON file
        const dataStr = JSON.stringify(response.data.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `IEMS_Report_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isOpen) {
    return (
      <button
        className="chatbot-trigger"
        onClick={() => setIsOpen(true)}
        title="Open ELebi.ai"
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  return (
    <div className={`chatbot-container ${isMinimized ? 'minimized' : ''}`}>
      {/* Header */}
      <div className="chatbot-header">
        <div className="chatbot-header-left">
          <MessageSquare size={20} />
          <span>ELebi.ai</span>
          {currentConversation && (
            <span className="conversation-title">
              {currentConversation.title}
            </span>
          )}
        </div>
        <div className="chatbot-header-actions">
          <button
            onClick={downloadReport}
            title="Download Report"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => setShowConversations(!showConversations)}
            title="Conversation History"
          >
            <Settings size={18} />
          </button>
          <button onClick={startNewConversation} title="New Conversation">
            <Plus size={18} />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
          </button>
          <button onClick={() => setIsOpen(false)} title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Conversations sidebar */}
          {showConversations && (
            <div className="chatbot-conversations">
              <div className="conversations-header">
                <h3>Conversation History</h3>
                <button onClick={() => setShowConversations(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="conversations-list">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`conversation-item ${
                      currentConversation?.id === conv.id ? 'active' : ''
                    }`}
                  >
                    <div
                      className="conversation-content"
                      onClick={() => loadConversation(conv.id)}
                    >
                      <div className="conversation-title">{conv.title}</div>
                      <div className="conversation-meta">
                        {conv.message_count} messages •{' '}
                        {new Date(conv.last_message_at || conv.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      className="delete-conversation"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      title="Delete conversation"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {conversations.length === 0 && (
                  <div className="no-conversations">
                    No conversations yet. Start chatting!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages area */}
          <div className="chatbot-messages">
            {messages.length === 0 ? (
              <div className="chatbot-welcome">
                <MessageSquare size={48} />
                <h2>Welcome to ELebi.ai</h2>
                <p>
                  Your intelligent assistant for energy management, device monitoring,
                  system operations, and more. Ask me anything!
                </p>
                <div className="example-questions">
                  <p>Try asking:</p>
                  <button onClick={() => setMessage('How do I monitor energy consumption?')}>
                    "How do I monitor energy consumption?"
                  </button>
                  <button onClick={() => setMessage('What devices are offline?')}>
                    "What devices are offline?"
                  </button>
                  <button onClick={() => setMessage('Show me energy savings tips')}>
                    "Show me energy savings tips"
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className={`message ${msg.role} ${msg.isError ? 'error' : ''} ${msg.isThinking ? 'thinking' : ''} ${msg.isStreaming ? 'streaming' : ''}`}
                >
                  <div className="message-content">
                    {msg.isThinking ? (
                      <div className="thinking-indicator">
                        <div className="thinking-dot"></div>
                        <div className="thinking-dot"></div>
                        <div className="thinking-dot"></div>
                      </div>
                    ) : (
                      <>
                        <div className="message-text">{msg.content}</div>
                        {msg.hasAttachment && (
                          <div className="message-attachment">
                            <div className="attachment-card">
                              <div className="attachment-icon">
                                <FileText size={32} color="#10b981" />
                              </div>
                              <div className="attachment-info">
                                <div className="attachment-name">{msg.attachmentName || 'IEMS Report.pdf'}</div>
                                <div className="attachment-meta">PDF Document</div>
                              </div>
                              <button
                                className="attachment-download"
                                onClick={() => downloadAttachment(msg.attachmentUrl, msg.attachmentName)}
                                title="Download"
                              >
                                <Download size={20} />
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="message-time">{formatTime(msg.created_at)}</div>
                      </>
                    )}
                  </div>
                  {msg.role === 'assistant' && !msg.feedbackSubmitted && !msg.isThinking && !msg.isStreaming && (
                    <div className="message-feedback">
                      <button
                        onClick={() => submitFeedback(msg.id, 'helpful', 5)}
                        title="Helpful"
                        className="feedback-btn"
                      >
                        <ThumbsUp size={14} />
                      </button>
                      <button
                        onClick={() => submitFeedback(msg.id, 'not_helpful', 2)}
                        title="Not helpful"
                        className="feedback-btn"
                      >
                        <ThumbsDown size={14} />
                      </button>
                    </div>
                  )}
                  {msg.feedbackSubmitted && (
                    <div className="feedback-submitted">
                      Thank you for your feedback!
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="message assistant loading">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="chatbot-input">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!message.trim() || isLoading}
              className="send-button"
            >
              <Send size={20} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Chatbot;
