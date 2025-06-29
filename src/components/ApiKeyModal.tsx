import React, { useState } from 'react';
import { X, Key, Eye, EyeOff, Sparkles, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (geminiKey: string, elevenLabsKey?: string) => void;
  currentGeminiKey?: string;
  currentElevenLabsKey?: string;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentGeminiKey = '',
  currentElevenLabsKey = ''
}) => {
  const [geminiKey, setGeminiKey] = useState(currentGeminiKey);
  const [elevenLabsKey, setElevenLabsKey] = useState(currentElevenLabsKey);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showElevenLabsKey, setShowElevenLabsKey] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (geminiKey.trim()) {
      onSave(geminiKey.trim(), elevenLabsKey.trim() || undefined);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg w-full border border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <Key className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Configure API Keys</h2>
              <p className="text-gray-400 text-sm">Unlock the full AI experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-gray-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Gemini API Key */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              Gemini API Key <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Enter your Gemini API key..."
                className="w-full px-4 py-3 pr-12 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <p className="text-xs text-gray-400">
                Get your API key from{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline inline-flex items-center space-x-1"
                >
                  <span>Google AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>

          {/* ElevenLabs API Key */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              ElevenLabs API Key <span className="text-gray-500">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type={showElevenLabsKey ? 'text' : 'password'}
                value={elevenLabsKey}
                onChange={(e) => setElevenLabsKey(e.target.value)}
                placeholder="Enter your ElevenLabs API key..."
                className="w-full px-4 py-3 pr-12 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowElevenLabsKey(!showElevenLabsKey)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showElevenLabsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <p className="text-xs text-gray-400">
                For AI voice synthesis. Get your key from{' '}
                <a
                  href="https://elevenlabs.io/app/settings/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline inline-flex items-center space-x-1"
                >
                  <span>ElevenLabs</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-300 font-medium mb-1">Privacy & Security</p>
                <p className="text-xs text-blue-200/80">
                  Your API keys are stored locally in your browser and never sent to our servers. 
                  They're only used to communicate directly with Google and ElevenLabs APIs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-8 border-t border-gray-700/50">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-300 hover:text-white border border-gray-600/50 hover:border-gray-500/50 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!geminiKey.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
          >
            Save Keys
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;