import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import io, { Socket } from 'socket.io-client';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  type: 'user' | 'ai' | 'system';
}

interface ChatInterfaceProps {
  sessionId: string;
  geminiApiKey: string;
  elevenLabsApiKey: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  sessionId, 
  geminiApiKey, 
  elevenLabsApiKey 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Welcome to your AI expert discussion! The specialists are analyzing your content and will begin their focused conversation shortly. You can ask questions or request clarification at any time.',
      sender: 'System',
      timestamp: new Date(),
      type: 'system'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle manual scrolling to disable auto-scroll
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setAutoScroll(isAtBottom);
    }
  };

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Join session
    newSocket.emit('join-session', sessionId);

    // Listen for agent messages
    newSocket.on('agent-message', (data) => {
      const aiMessage: Message = {
        id: `${Date.now()}_${Math.random()}`,
        content: data.message,
        sender: data.agentName,
        timestamp: new Date(data.timestamp),
        type: 'ai'
      };
      setMessages(prev => [...prev, aiMessage]);
    });

    // Listen for conversation end
    newSocket.on('conversation-ended', (data) => {
      const systemMessage: Message = {
        id: `${Date.now()}_${Math.random()}`,
        content: data.message,
        sender: 'System',
        timestamp: new Date(),
        type: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing || !socket) return;

    const userMessage: Message = {
      id: `${Date.now()}_${Math.random()}`,
      content: inputValue,
      sender: 'You',
      timestamp: new Date(),
      type: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsProcessing(true);

    // Send message to server
    socket.emit('user-message', {
      sessionId,
      message: currentInput,
      geminiApiKey,
      elevenLabsApiKey
    });

    setIsProcessing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const enableAutoScroll = () => {
    setAutoScroll(true);
    scrollToBottom();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col max-h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-slate-600" />
            <h3 className="font-medium text-slate-800">Discussion Chat</h3>
          </div>
          {!autoScroll && (
            <button
              onClick={enableAutoScroll}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            >
              ↓ New messages
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
        onScroll={handleScroll}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.type === 'system'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {(message.type === 'ai' || message.type === 'system') && (
                <div className="text-xs font-medium mb-1 opacity-75">
                  {message.sender}
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
              <div className={`text-xs mt-1 opacity-75 ${
                message.type === 'user' 
                  ? 'text-blue-100' 
                  : message.type === 'system'
                  ? 'text-amber-600'
                  : 'text-slate-500'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-slate-100 text-slate-800 rounded-lg p-3 max-w-[85%]">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                <span className="text-sm text-slate-600">Expert is responding...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 flex-shrink-0">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask questions about the topic or request clarification..."
              className="w-full p-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={isProcessing}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        <div className="mt-2 text-xs text-slate-500">
          💡 Ask specific questions to guide the expert discussion or request deeper analysis on particular points
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;