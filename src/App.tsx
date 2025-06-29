import React, { useState, useEffect } from 'react'
import { MessageCircle, Settings } from 'lucide-react'
import Header from './components/Header'
import ConferenceRoom from './components/ConferenceRoom'
import FileUpload from './components/FileUpload'
import ChatInterface from './components/ChatInterface'
import ApiKeyModal from './components/ApiKeyModal'

function App() {
  const [currentView, setCurrentView] = useState<'upload' | 'conference'>('upload')
  const [hasSession, setHasSession] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('')
  const [sessionId, setSessionId] = useState('')

  // Load API keys from localStorage on mount
  useEffect(() => {
    const savedGeminiKey = localStorage.getItem('gemini_api_key')
    const savedElevenLabsKey = localStorage.getItem('elevenlabs_api_key')
    
    if (savedGeminiKey) setGeminiApiKey(savedGeminiKey)
    if (savedElevenLabsKey) setElevenLabsApiKey(savedElevenLabsKey)

    // Show API key modal if no Gemini key is configured
    if (!savedGeminiKey) {
      setShowApiKeyModal(true)
    }
  }, [])

  const handleSessionStart = (newSessionId: string) => {
    setSessionId(newSessionId)
    setHasSession(true)
    setCurrentView('conference')
  }

  const handleConversationEnd = () => {
    // Reset everything and go back to upload
    setHasSession(false)
    setSessionId('')
    setCurrentView('upload')
  }

  const handleApiKeySave = (geminiKey: string, elevenLabsKey?: string) => {
    setGeminiApiKey(geminiKey)
    localStorage.setItem('gemini_api_key', geminiKey)
    
    if (elevenLabsKey) {
      setElevenLabsApiKey(elevenLabsKey)
      localStorage.setItem('elevenlabs_api_key', elevenLabsKey)
    }
  }

  const handleShowApiKeyModal = () => {
    setShowApiKeyModal(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header onShowApiKeys={handleShowApiKeyModal} />
      
      {currentView === 'upload' && (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-slate-800 mb-2">
                AI Expert Conference
              </h1>
              <p className="text-slate-600 text-lg">
                Upload documents or enter a topic to start your AI discussion
              </p>
            </div>
            
            {!geminiApiKey && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
                <div className="flex items-center space-x-3">
                  <Settings className="w-6 h-6 text-amber-600" />
                  <div>
                    <h3 className="font-semibold text-amber-800">API Keys Required</h3>
                    <p className="text-amber-700 text-sm mt-1">
                      Configure your Gemini API key to start creating AI conferences. ElevenLabs is optional for voice synthesis.
                    </p>
                    <button
                      onClick={handleShowApiKeyModal}
                      className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition-colors"
                    >
                      Configure API Keys
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <FileUpload 
              onSessionStart={handleSessionStart} 
              isApiKeyConfigured={!!geminiApiKey}
              geminiApiKey={geminiApiKey}
              elevenLabsApiKey={elevenLabsApiKey}
            />
          </div>
        </div>
      )}

      {currentView === 'conference' && hasSession && (
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
            <div className="lg:col-span-2">
              <ConferenceRoom 
                onEndCall={handleConversationEnd} 
                sessionId={sessionId}
                geminiApiKey={geminiApiKey}
                elevenLabsApiKey={elevenLabsApiKey}
                onConversationEnd={handleConversationEnd}
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
  )
}

export default App