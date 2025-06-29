import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Sparkles } from 'lucide-react';
import io, { Socket } from 'socket.io-client';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const agentColors = {
    'chen': 'bg-purple-100 text-purple-800 border-purple-200',
    'thompson': 'bg-blue-100 text-blue-800 border-blue-200',
    'rodriguez': 'bg-green-100 text-green-800 border-green-200',
    'kim': 'bg-orange-100 text-orange-800 border-orange-200'
  };

  const agentAvatars = {
    'chen': '👩‍🔬',
    'thompson': '👨‍💼',
    'rodriguez': '👩‍🏫',
    'kim': '👨‍💻'
  };

  const scrollToBottom = () => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
  }, [sessionId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing || !socket) return;

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
    scrollToBottom();
  };

  const getAgentColor = (agentId?: string) => {
    if (!agentId) return 'bg-slate-100 text-slate-800 border-slate-200';
    return agentColors[agentId as keyof typeof agentColors] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const getAgentAvatar = (agentId?: string) => {
    if (!agentId) return '🤖';
    return agentAvatars[agentId as keyof typeof agentAvatars] || '🤖';
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 h-full flex flex-col overflow-hidden">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">Discussion Chat</h3>
              <p className="text-xs text-slate-300">Join the expert conversation</p>
            </div>
          </div>
          {!autoScroll && (
            <button
              onClick={enableAutoScroll}
              className="text-xs px-3 py-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              ↓ New messages
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white"
        onScroll={handleScroll}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 shadow-sm border transition-all duration-200 hover:shadow-md ${
                message.type === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600'
                  : message.type === 'system'
                  ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border-amber-200'
                  : `${getAgentColor(message.agentId)} border`
              }`}
            >
              {(message.type === 'ai' || message.type === 'system') && (
                <div className="flex items-center space-x-2 mb-2">
                  {message.type === 'ai' && (
                    <span className="text-lg">{getAgentAvatar(message.agentId)}</span>
                  )}
                  {message.type === 'system' && (
                    <Sparkles className="w-4 h-4 text-amber-600" />
                  )}
                  <div className="text-xs font-bold opacity-90">
                    {message.sender}
                  </div>
                </div>
              )}
              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </div>
              <div className={`text-xs mt-2 opacity-75 ${
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
            <div className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 rounded-2xl p-4 max-w-[85%] border border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-slate-600 font-medium">Expert is analyzing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Modern Input */}
      <div className="p-4 bg-gradient-to-r from-slate-50 to-white border-t border-slate-200">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask questions about the topic or request clarification..."
              className="w-full p-4 border-2 border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
              rows={2}
              disabled={isProcessing}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            title="Send Message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-3 text-xs text-slate-500 flex items-center space-x-2">
          <Sparkles className="w-3 h-3" />
          <span>Ask specific questions to guide the expert discussion or request deeper analysis</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;