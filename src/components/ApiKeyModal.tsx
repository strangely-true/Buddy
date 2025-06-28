import React, { useState } from 'react';
import { X, Key, Eye, EyeOff } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-800">Configure API Keys</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Gemini API Key */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Gemini API Key <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Enter your Gemini API key..."
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Get your API key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          {/* ElevenLabs API Key */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              ElevenLabs API Key <span className="text-slate-400">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type={showElevenLabsKey ? 'text' : 'password'}
                value={elevenLabsKey}
                onChange={(e) => setElevenLabsKey(e.target.value)}
                placeholder="Enter your ElevenLabs API key..."
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowElevenLabsKey(!showElevenLabsKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showElevenLabsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              For AI voice synthesis. Get your key from{' '}
              <a
                href="https://elevenlabs.io/app/settings/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                ElevenLabs
              </a>
            </p>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Your API keys are stored locally and never sent to our servers. 
              They're only used to communicate directly with Google and ElevenLabs APIs.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!geminiKey.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save Keys
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;