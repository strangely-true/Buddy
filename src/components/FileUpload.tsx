import React, { useState } from 'react';
import { Type, Loader2, AlertCircle, Settings, Sparkles, Key } from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '../config/api';

interface FileUploadProps {
  onSessionStart: (sessionId: string) => void;
  isApiKeyConfigured: boolean;
  geminiApiKey: string;
  elevenLabsApiKey: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onSessionStart, 
  isApiKeyConfigured, 
  geminiApiKey,
  elevenLabsApiKey 
}) => {
  const [uploading, setUploading] = useState(false);
  const [textPrompt, setTextPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPersonalityConfig, setShowPersonalityConfig] = useState(false);

  const handleSubmit = async () => {
    if (!textPrompt.trim()) {
      setError('Please enter a discussion topic to start the AI conference.');
      return;
    }

    if (!geminiApiKey.trim()) {
      setError('Gemini API key is required. Please configure your API keys first.');
      return;
    }

    if (!elevenLabsApiKey.trim()) {
      setError('ElevenLabs API key is required for voice synthesis. Please configure your API keys first.');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const content = textPrompt.trim();

      console.log('Sending content to API:', { 
        textLength: content.length
      });

      const response = await axios.post(getApiUrl('/api/process-content'), {
        content: content,
        type: 'text',
        sessionId,
        geminiApiKey
      });

      if (response.data.success) {
        console.log('Content processed successfully');
        setUploading(false);
        onSessionStart(sessionId);
      } else {
        throw new Error(response.data.error || 'Failed to process content');
      }
    } catch (error) {
      console.error('Content processing error:', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
          setError('Cannot connect to backend server. Please check if the backend is deployed and running.');
        } else {
          const errorMessage = error.response?.data?.error || error.message;
          setError(`Failed to process content: ${errorMessage}`);
        }
      } else {
        setError('Failed to process content. Please check your connection and try again.');
      }
      setUploading(false);
    }
  };

  const canSubmit = textPrompt.trim() && !uploading && geminiApiKey.trim() && elevenLabsApiKey.trim();

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-start space-x-4">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-red-300 font-semibold text-lg mb-1">Error</h4>
              <p className="text-red-200/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* API Keys Required Warning */}
      {(!geminiApiKey.trim() || !elevenLabsApiKey.trim()) && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-amber-400 to-orange-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <Key className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-300 text-lg mb-2">API Keys Required</h3>
              <p className="text-amber-200/80 mb-4 leading-relaxed">
                Both Gemini and ElevenLabs API keys are required to use the AI conference platform. 
                Please configure your API keys to continue.
              </p>
              <div className="space-y-2 text-sm text-amber-200/70">
                <p>• <strong>Gemini API:</strong> Powers the AI expert discussions and content analysis</p>
                <p>• <strong>ElevenLabs API:</strong> Provides realistic voice synthesis for each AI expert</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Input Card */}
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700/50 overflow-hidden shadow-2xl">
        {/* Text Input Area */}
        <div className="p-8">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 mt-2">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Type className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Discussion Topic <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  placeholder="Describe your topic, ask questions, or provide context for discussion. Our AI experts will create a focused conversation around your input..."
                  className="w-full h-40 p-6 bg-gray-700/50 border border-gray-600/50 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:bg-gray-800/50 disabled:text-gray-400 text-white placeholder-gray-400 transition-all duration-200"
                  disabled={uploading}
                />
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => setShowPersonalityConfig(!showPersonalityConfig)}
                  className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors group"
                >
                  <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                  <span className="text-sm font-medium">Configure AI Personalities</span>
                  <span className="text-xs text-gray-500">(Optional)</span>
                </button>
                
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl font-semibold hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {uploading ? (
                    <div className="flex items-center justify-center space-x-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Initializing AI Discussion...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-3">
                      <Sparkles className="w-5 h-5" />
                      <span>Start AI Expert Discussion</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personality Configuration */}
      {showPersonalityConfig && (
        <PersonalityConfig />
      )}

      {/* Tips Card */}
      <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-sm">
        <h4 className="text-blue-300 font-semibold text-lg mb-4 flex items-center space-x-2">
          <Sparkles className="w-5 h-5" />
          <span>Tips for Engaging Discussions</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-200/80">
          <div className="space-y-2">
            <p>• Be specific about focus areas for expert analysis</p>
            <p>• Ask targeted questions to guide discussions</p>
          </div>
          <div className="space-y-2">
            <p>• Provide detailed context for deeper insights</p>
            <p>• Experts maintain focus on your chosen topic</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Personality Configuration Component
const PersonalityConfig: React.FC = () => {
  const [personalities, setPersonalities] = useState(() => {
    const saved = localStorage.getItem('ai_personalities');
    return saved ? JSON.parse(saved) : {
      chen: {
        name: 'Dr. Sarah Chen',
        role: 'Research Analyst',
        personality: 'methodical, evidence-based, asks probing questions about data validity and research methodology',
        expertise: 'research methodology, data analysis, statistical significance, peer review standards'
      },
      thompson: {
        name: 'Marcus Thompson',
        role: 'Strategy Expert',
        personality: 'pragmatic, results-oriented, challenges ideas with real-world implementation concerns',
        expertise: 'business strategy, market dynamics, competitive analysis, ROI assessment'
      },
      rodriguez: {
        name: 'Prof. Elena Rodriguez',
        role: 'Domain Specialist',
        personality: 'theoretical, comprehensive, provides deep contextual background and historical perspective',
        expertise: 'theoretical frameworks, academic literature, conceptual foundations, interdisciplinary connections'
      },
      kim: {
        name: 'Alex Kim',
        role: 'Innovation Lead',
        personality: 'forward-thinking, disruptive, challenges conventional thinking with emerging trends',
        expertise: 'emerging technologies, future trends, disruptive innovation, technological implications'
      }
    };
  });

  const handlePersonalityChange = (agentId: string, field: string, value: string) => {
    const updated = {
      ...personalities,
      [agentId]: {
        ...personalities[agentId],
        [field]: value
      }
    };
    setPersonalities(updated);
    localStorage.setItem('ai_personalities', JSON.stringify(updated));
  };

  const resetToDefaults = () => {
    localStorage.removeItem('ai_personalities');
    window.location.reload();
  };

  const agentColors = {
    chen: 'from-purple-500 to-indigo-500',
    thompson: 'from-blue-500 to-cyan-500',
    rodriguez: 'from-green-500 to-emerald-500',
    kim: 'from-orange-500 to-red-500'
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold text-white flex items-center space-x-3">
          <Settings className="w-6 h-6 text-purple-400" />
          <span>AI Expert Personalities</span>
        </h3>
        <button
          onClick={resetToDefaults}
          className="px-4 py-2 text-gray-300 hover:text-white border border-gray-600/50 hover:border-gray-500/50 rounded-xl transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Object.entries(personalities).map(([agentId, agent]) => (
          <div key={agentId} className="space-y-4 p-6 bg-gray-700/30 border border-gray-600/30 rounded-2xl">
            <div className={`w-12 h-12 bg-gradient-to-r ${agentColors[agentId as keyof typeof agentColors]} rounded-xl flex items-center justify-center mb-4`}>
              <span className="text-white font-bold text-lg">
                {agent.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Name</label>
              <input
                type="text"
                value={agent.name}
                onChange={(e) => handlePersonalityChange(agentId, 'name', e.target.value)}
                className="w-full p-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Role</label>
              <input
                type="text"
                value={agent.role}
                onChange={(e) => handlePersonalityChange(agentId, 'role', e.target.value)}
                className="w-full p-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Personality</label>
              <textarea
                value={agent.personality}
                onChange={(e) => handlePersonalityChange(agentId, 'personality', e.target.value)}
                className="w-full p-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Expertise</label>
              <textarea
                value={agent.expertise}
                onChange={(e) => handlePersonalityChange(agentId, 'expertise', e.target.value)}
                className="w-full p-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                rows={3}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <p className="text-blue-300 text-sm flex items-center space-x-2">
          <Sparkles className="w-4 h-4" />
          <span>Customize how each AI expert behaves and responds. Changes are saved automatically and apply to new discussions.</span>
        </p>
      </div>
    </div>
  );
};

export default FileUpload;