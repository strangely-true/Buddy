import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Sparkles, ArrowDown, Bot, User } from 'lucide-react';
import io, { Socket } from 'socket.io-client';
import { getSocketUrl } from '../config/api';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  type: 'user' | 'ai' | 'system';
  agentId?: string;
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
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const agentColors = {
    'chen': 'from-purple-500/20 to-indigo-500/20 border-purple-500/30',
    'thompson': 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    'rodriguez': 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    'kim': 'from-orange-500/20 to-red-500/20 border-orange-500/30'
  };

  const agentAvatars = {
    'chen': '👩‍🔬',
    'thompson': '👨‍💼',
    'rodriguez': '👩‍🏫',
    'kim': '👨‍💻'
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [messages, autoScroll]);

  // Handle manual scrolling to disable auto-scroll and show scroll button
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
      const isScrolledUp = scrollTop < scrollHeight - clientHeight - 100;
      
      setAutoScroll(isAtBottom);
      setShowScrollButton(isScrolledUp && !isAtBottom);
    }
  };

  useEffect(() => {
    // Initialize socket connection
    try {
      const newSocket = io(getSocketUrl());
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Connected to backend');
        setConnectionError(false);
        // Join session
        newSocket.emit('join-session', sessionId);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnectionError(true);
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: 'Unable to connect to the backend server. The discussion features may not work properly.',
          sender: 'System',
          timestamp: new Date(),
          type: 'system'
        };
        setMessages(prev => [...prev, errorMessage]);
      });

      // Listen for agent messages
      newSocket.on('agent-message', (data) => {
        const aiMessage: Message = {
          id: Date.now().toString(),
          content: data.message,
          sender: data.agentName,
          timestamp: new Date(data.timestamp),
          type: 'ai',
          agentId: data.agentId
        };
        setMessages(prev => [...prev, aiMessage]);
      });

      // Listen for conversation end
      newSocket.on('conversation-ended', (data) => {
        const systemMessage: Message = {
          id: Date.now().toString(),
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
    } catch (error) {
      console.error('Failed to initialize socket connection:', error);
      setConnectionError(true);
    }
  }, [sessionId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    if (!socket || connectionError) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Cannot send message: Not connected to backend server.',
        sender: 'System',
        timestamp: new Date(),
        type: 'system'
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
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
    setShowScrollButton(false);
    scrollToBottom();
  };

  const getAgentColor = (agentId?: string) => {
    if (!agentId) return 'from-gray-700/50 to-gray-600/50 border-gray-600/30';
    return agentColors[agentId as keyof typeof agentColors] || 'from-gray-700/50 to-gray-600/50 border-gray-600/30';
  };

  const getAgentAvatar = (agentId?: string) => {
    if (!agentId) return '🤖';
    return agentAvatars[agentId as keyof typeof agentAvatars] || '🤖';
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700/50 h-full flex flex-col overflow-hidden relative shadow-2xl">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 backdrop-blur-xl text-white p-6 flex-shrink-0 border-b border-gray-600/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Discussion Chat</h3>
              <p className="text-sm text-gray-300 flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>Join the expert conversation</span>
                {connectionError && (
                  <span className="text-red-400 text-xs ml-2">(Backend disconnected)</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container with Scroll */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
        onScroll={handleScroll}
        style={{ 
          scrollBehavior: 'smooth',
          maxHeight: 'calc(100vh - 300px)'
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-5 shadow-lg border backdrop-blur-sm transition-all duration-200 hover:shadow-xl ${
                message.type === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-blue-500/30'
                  : message.type === 'system'
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 border-amber-500/30'
                  : `bg-gradient-to-r ${getAgentColor(message.agentId)} text-white border`
              }`}
            >
              {(message.type === 'ai' || message.type === 'system') && (
                <div className="flex items-center space-x-3 mb-3">
                  {message.type === 'ai' ? (
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-lg">{getAgentAvatar(message.agentId)}</span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-amber-500/30 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </div>
                  )}
                  <div className="text-sm font-bold opacity-90">
                    {message.sender}
                  </div>
                </div>
              )}
              
              {message.type === 'user' && (
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-sm font-bold opacity-90">
                    You
                  </div>
                </div>
              )}
              
              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </div>
              <div className={`text-xs mt-3 opacity-75 ${
                message.type === 'user' 
                  ? 'text-blue-100' 
                  : message.type === 'system'
                  ? 'text-amber-300'
                  : 'text-gray-300'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-r from-gray-700/50 to-gray-600/50 border border-gray-600/30 text-white rounded-2xl p-5 max-w-[85%] backdrop-blur-sm">
              <div className="flex items-center space-x-4">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-300 font-medium">Expert is analyzing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={enableAutoScroll}
          className="absolute right-6 bottom-32 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-10 animate-bounce"
          title="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Modern Input */}
      <div className="p-6 bg-gradient-to-r from-gray-800/50 to-gray-700/50 border-t border-gray-600/30 flex-shrink-0">
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={connectionError 
                ? "Backend server not connected - messages cannot be sent"
                : "Ask questions about the topic or request clarification..."
              }
              className="w-full p-4 bg-gray-700/50 border border-gray-600/50 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 text-white placeholder-gray-400 disabled:opacity-50"
              rows={2}
              disabled={isProcessing || connectionError}
              style={{ minHeight: '60px', maxHeight: '120px' }}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing || connectionError}
            className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex-shrink-0"
            title="Send Message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-4 text-xs text-gray-400 flex items-center space-x-2">
          <Sparkles className="w-3 h-3" />
          <span>
            {connectionError 
              ? "Backend server connection required for AI responses"
              : "Ask specific questions to guide the expert discussion or request deeper analysis"
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;