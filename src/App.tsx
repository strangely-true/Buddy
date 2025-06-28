import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ConferenceRoom from './components/ConferenceRoom';
import FileUpload from './components/FileUpload';
import ChatInterface from './components/ChatInterface';
import ApiKeyModal from './components/ApiKeyModal';
import { SessionProvider } from './contexts/SessionContext';

function App() {
  const [hasSession, setHasSession] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('');
  const [sessionId, setSessionId] = useState('');

  // Load API keys from localStorage on mount
  useEffect(() => {
    const savedGeminiKey = localStorage.getItem('gemini_api_key');
    const savedElevenLabsKey = localStorage.getItem('elevenlabs_api_key');
    
    if (savedGeminiKey) setGeminiApiKey(savedGeminiKey);
    if (savedElevenLabsKey) setElevenLabsApiKey(savedElevenLabsKey);
    
    // Show modal if no Gemini key is configured
    if (!savedGeminiKey) {
      setShowApiKeyModal(true);
    }
  }, []);

  const handleSessionStart = (newSessionId: string) => {
    setSessionId(newSessionId);
    setHasSession(true);
  };

  const handleEndCall = () => {
    setHasSession(false);
    setSessionId('');
  };

  const handleApiKeySave = (geminiKey: string, elevenLabsKey?: string) => {
    setGeminiApiKey(geminiKey);
    localStorage.setItem('gemini_api_key', geminiKey);
    
    if (elevenLabsKey) {
      setElevenLabsApiKey(elevenLabsKey);
      localStorage.setItem('elevenlabs_api_key', elevenLabsKey);
    }
  };

  const handleShowApiKeyModal = () => {
    setShowApiKeyModal(true);
  };

  return (
    <SessionProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header onShowApiKeys={handleShowApiKeyModal} />
        
        {!hasSession ? (
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-6xl font-light text-slate-800 mb-4">
                  Welcome to <span className="font-medium text-blue-600">Buddy</span>
                </h1>
                <p className="text-xl text-slate-600 mb-8">
                  Transform your documents into engaging AI conversations
                </p>
                {!geminiApiKey && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
                    <p className="text-amber-800 text-sm">
                      💡 <strong>Get Started:</strong> Configure your API keys to begin creating AI conferences
                    </p>
                    <button
                      onClick={handleShowApiKeyModal}
                      className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition-colors"
                    >
                      Configure API Keys
                    </button>
                  </div>
                )}
              </div>
              
              <FileUpload 
                onSessionStart={handleSessionStart} 
                isApiKeyConfigured={!!geminiApiKey}
                geminiApiKey={geminiApiKey}
                elevenLabsApiKey={elevenLabsApiKey}
              />
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-4 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
              <div className="lg:col-span-2">
                <ConferenceRoom 
                  onEndCall={handleEndCall} 
                  sessionId={sessionId}
                  geminiApiKey={geminiApiKey}
                  elevenLabsApiKey={elevenLabsApiKey}
                />
              </div>
              <div className="lg:col-span-1">
                <ChatInterface 
                  sessionId={sessionId}
                  geminiApiKey={geminiApiKey}
                  elevenLabsApiKey={elevenLabsApiKey}
                />
              </div>
            </div>
          </div>
        )}

        <ApiKeyModal
          isOpen={showApiKeyModal}
          onClose={() => setShowApiKeyModal(false)}
          onSave={handleApiKeySave}
          currentGeminiKey={geminiApiKey}
          currentElevenLabsKey={elevenLabsApiKey}
        />
      </div>
    </SessionProvider>
  );
}

export default App;