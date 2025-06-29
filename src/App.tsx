import React, { useState, useEffect } from 'react'
import { MessageCircle, Settings, Sparkles } from 'lucide-react'
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <Header onShowApiKeys={handleShowApiKeyModal} />
      
      {currentView === 'upload' && (
        <div className="container mx-auto px-4 py-8 lg:py-16">
          <div className="max-w-5xl mx-auto">
            <div className="mb-12 text-center">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <MessageCircle className="w-10 h-10 text-white" />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
                </div>
                <h1 className="text-5xl lg:text-7xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-6 leading-tight">
                  AI Expert
                  <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Conference
                  </span>
                </h1>
                <p className="text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                  Transform your documents into dynamic AI discussions with expert perspectives
                </p>
              </div>
            </div>
            
            {!geminiApiKey && (
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6 lg:p-8 mb-8 backdrop-blur-sm">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-400 to-orange-400 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-amber-300 text-lg mb-2">API Configuration Required</h3>
                    <p className="text-amber-200/80 mb-4 leading-relaxed">
                      Configure your Gemini API key to unlock the full AI conference experience. ElevenLabs is optional for voice synthesis.
                    </p>
                    <button
                      onClick={handleShowApiKeyModal}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
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
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
            <div className="xl:col-span-2">
              <ConferenceRoom 
                onEndCall={handleConversationEnd} 
                sessionId={sessionId}
                geminiApiKey={geminiApiKey}
                elevenLabsApiKey={elevenLabsApiKey}
                onConversationEnd={handleConversationEnd}
              />
            </div>
            <div className="xl:col-span-1">
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

      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
    </div>
  )
}

export default App