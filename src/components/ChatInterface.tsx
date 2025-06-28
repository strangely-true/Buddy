import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, MessageSquare } from 'lucide-react';
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
      content: 'Welcome to your AI conference! The agents are analyzing your content and will begin their discussion shortly. You can ask questions or join the conversation at any time.',
      sender: 'System',
      timestamp: new Date(),
      type: 'system'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        type: 'ai'
      };
      setMessages(prev => [...prev, aiMessage]);
    });

    // Listen for user messages (from other participants)
    newSocket.on('user-message', (data) => {
      // Don't add our own messages again
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

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Voice recording logic would go here
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-slate-600" />
          <h3 className="font-medium text-slate-800">Chat & Questions</h3>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
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
              <div className="text-sm">{message.content}</div>
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
            <div className="bg-slate-100 text-slate-800 rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                <span className="text-sm text-slate-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question or join the conversation..."
              className="w-full p-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={isProcessing}
            />
          </div>
          
          <div className="flex flex-col space-y-2">
            <button
              onClick={toggleRecording}
              className={`p-3 rounded-lg transition-colors ${
                isRecording
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;