import React, { useState } from 'react';
import { Type, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface TextPromptProps {
  onSessionStart: (sessionId: string) => void;
  isApiKeyConfigured: boolean;
  geminiApiKey: string;
  elevenLabsApiKey: string;
}

const TextPrompt: React.FC<TextPromptProps> = ({ 
  onSessionStart, 
  isApiKeyConfigured, 
  geminiApiKey,
  elevenLabsApiKey 
}) => {
  const [textPrompt, setTextPrompt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!textPrompt.trim()) return;
    
    if (!isApiKeyConfigured) {
      setError('Please configure your Gemini API key before starting a discussion.');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await axios.post('http://localhost:3001/api/process-content', {
        content: textPrompt.trim(),
        type: 'text prompt',
        sessionId,
        geminiApiKey
      });

      if (response.data.success) {
        setUploading(false);
        onSessionStart(sessionId);
      } else {
        throw new Error('Failed to process content');
      }
    } catch (error) {
      console.error('Content processing error:', error);
      setError('Failed to process content. Please check your API key and try again.');
      setUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-800 font-medium">Error</h4>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Text Input Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <Type className={`w-5 h-5 ${isApiKeyConfigured ? 'text-slate-400' : 'text-slate-300'}`} />
            </div>
            <div className="flex-1 space-y-4">
              <textarea
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isApiKeyConfigured 
                  ? "Enter a topic, question, or idea for the AI experts to discuss. Be specific about what you want them to analyze..."
                  : "Configure your API keys to start a conversation..."
                }
                className="w-full h-32 p-4 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
                disabled={uploading || !isApiKeyConfigured}
              />
              <button
                onClick={handleSubmit}
                disabled={!textPrompt.trim() || uploading || !isApiKeyConfigured}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Starting AI Discussion...</span>
                  </div>
                ) : (
                  'Start Focused AI Discussion'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-blue-800 font-medium mb-2">💡 Tips for Great Discussions</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Be specific about what aspects you want the experts to focus on</li>
          <li>• Ask targeted questions to guide the expert analysis</li>
          <li>• The discussion will stay focused on your topic - experts won't deviate</li>
          <li>• You can ask follow-up questions during the discussion</li>
        </ul>
      </div>
    </div>
  );
};

export default TextPrompt;