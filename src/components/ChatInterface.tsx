import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, MessageSquare, Settings } from 'lucide-react';
import { aiService } from '../services/aiService';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  type: 'user' | 'ai' | 'system';
}

interface ChatInterfaceProps {
  onApiKeySet?: (apiKey: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onApiKeySet }) => {
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
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for AI agent responses
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const history = aiService.getConversationHistory();
        const lastMessage = history[history.length - 1];
        
        if (lastMessage && !messages.find(m => m.content === lastMessage.split(': ')[1])) {
          const [speaker, content] = lastMessage.split(': ');
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            content: content,
            sender: speaker,
            timestamp: new Date(),
            type: 'ai'
          }]);
        }
      } catch (error) {
        // Silently handle errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

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

    try {
      // Get response from a random AI agent
      const agents = aiService.getAgents();
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      
      const response = await aiService.generateAgentResponse(
        randomAgent.id, 
        'User interaction', 
        currentInput
      );

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: randomAgent.name,
        timestamp: new Date(),
        type: 'ai'
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm having trouble connecting to the AI service. Please check your API key configuration.",
        sender: 'System',
        timestamp: new Date(),
        type: 'system'
      };
      setMessages(prev => [...prev, errorMessage]);
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

  const handleApiKeySubmit = () => {
    if (apiKey.trim()) {
      aiService.setApiKey(apiKey.trim());
      onApiKeySet?.(apiKey.trim());
      setShowApiKeyInput(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: 'Gemini API key configured successfully! The AI agents are now ready for advanced conversations.',
        sender: 'System',
        timestamp: new Date(),
        type: 'system'
      }]);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-slate-600" />
            <h3 className="font-medium text-slate-800">Chat & Questions</h3>
          </div>
          <button
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Configure API Key"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        
        {showApiKeyInput && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Gemini API Key
            </label>
            <div className="flex space-x-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleApiKeySubmit}
                className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Get your API key from Google AI Studio
            </p>
          </div>
        )}
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