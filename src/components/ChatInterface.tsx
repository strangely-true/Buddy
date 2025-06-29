import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Trash2, Copy, RefreshCw, AlertCircle } from 'lucide-react';
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
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Enhanced logging function
  const log = (level: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [CHAT-${level.toUpperCase()}] ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  };

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
    log('info', 'Initializing chat interface', { sessionId });

    // Initialize socket connection
    const newSocket = io('http://localhost:3001', {
      timeout: 10000,
      forceNew: true
    });
    setSocket(newSocket);
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      log('info', 'Chat socket connected');
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      log('warn', 'Chat socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      log('error', 'Chat socket connection error', error);
      setIsConnected(false);
      setError('Failed to connect to chat server');
    });

    // Join session
    newSocket.emit('join-session', sessionId);

    // Listen for agent messages
    newSocket.on('agent-message', (data) => {
      log('info', 'Received agent message in chat', { agentName: data.agentName });
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
      log('info', 'Conversation ended in chat', data);
      const systemMessage: Message = {
        id: `${Date.now()}_${Math.random()}`,
        content: data.message,
        sender: 'System',
        timestamp: new Date(),
        type: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
    });

    // Listen for errors
    newSocket.on('error', (error) => {
      log('error', 'Chat socket error', error);
      setError(typeof error === 'string' ? error : 'Chat error occurred');
    });

    return () => {
      log('info', 'Cleaning up chat socket');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [sessionId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing || !socket || !isConnected) {
      log('warn', 'Cannot send message', { 
        hasInput: !!inputValue.trim(), 
        isProcessing, 
        hasSocket: !!socket, 
        isConnected 
      });
      return;
    }

    const userMessage: Message = {
      id: `${Date.now()}_${Math.random()}`,
      content: inputValue,
      sender: 'You',
      timestamp: new Date(),
      type: 'user'
    };

    log('info', 'Sending user message', { messageLength: inputValue.length });

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsProcessing(true);

    try {
      // Send message to server
      socket.emit('user-message', {
        sessionId,
        message: currentInput,
        geminiApiKey,
        elevenLabsApiKey
      });

      log('info', 'User message sent to server');
    } catch (error) {
      log('error', 'Error sending message', error);
      setError('Failed to send message');
    } finally {
      setIsProcessing(false);
    }
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

  const clearMessages = () => {
    log('info', 'Clearing chat messages');
    setMessages([{
      id: '1',
      content: 'Chat cleared. You can continue asking questions about the ongoing discussion.',
      sender: 'System',
      timestamp: new Date(),
      type: 'system'
    }]);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    log('info', 'Message copied to clipboard');
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'ai':
        return '🤖';
      case 'user':
        return '👤';
      case 'system':
        return '⚙️';
      default:
        return '💬';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 h-full flex flex-col overflow-hidden">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold">Discussion Chat</h3>
              <div className="flex items-center space-x-2 text-sm text-blue-100">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                {error && (
                  <>
                    <span>•</span>
                    <span className="text-red-200">{error}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!autoScroll && (
              <button
                onClick={enableAutoScroll}
                className="text-xs px-2 py-1 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
              >
                ↓ New messages
              </button>
            )}
            <button
              onClick={clearMessages}
              className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              title="Clear Chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
        onScroll={handleScroll}
        style={{ minHeight: 0 }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 shadow-sm relative group ${
                message.type === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : message.type === 'system'
                  ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200'
                  : 'bg-white text-slate-800 border border-slate-200'
              }`}
            >
              {/* Message Header */}
              {(message.type === 'ai' || message.type === 'system') && (
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{getMessageIcon(message.type)}</span>
                    <span className="text-xs font-semibold opacity-75">
                      {message.sender}
                    </span>
                  </div>
                  <button
                    onClick={() => copyMessage(message.content)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded"
                    title="Copy message"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Message Content */}
              <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </div>

              {/* Message Footer */}
              <div className={`text-xs mt-2 opacity-75 flex items-center justify-between ${
                message.type === 'user' 
                  ? 'text-blue-100' 
                  : message.type === 'system'
                  ? 'text-amber-600'
                  : 'text-slate-500'
              }`}>
                <span>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {message.type === 'user' && (
                  <button
                    onClick={() => copyMessage(message.content)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/20 rounded"
                    title="Copy message"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white text-slate-800 rounded-2xl p-4 max-w-[85%] border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-slate-600">Expert is responding...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input */}
      <div className="bg-white border-t border-slate-200 p-4">
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected 
                ? "Ask questions about the topic or request clarification..."
                : "Connecting to chat server..."
              }
              className="w-full p-3 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 transition-all disabled:opacity-50"
              rows={2}
              disabled={isProcessing || !isConnected}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing || !isConnected}
            className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg flex-shrink-0"
            title="Send Message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>💡 Ask specific questions to guide the expert discussion</span>
          <div className="flex items-center space-x-2">
            <RefreshCw className={`w-3 h-3 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
            <span>{isConnected ? 'Live' : 'Reconnecting...'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;