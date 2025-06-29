import React, { useState, useEffect } from 'react'
import { MessageCircle, Settings, Sparkles, Key, AlertTriangle } from 'lucide-react'
import Header from './components/Header'
import Footer from './components/Footer'
import ConferenceRoom from './components/ConferenceRoom'
import ChatInterface from './components/ChatInterface'
import ApiKeyModal from './components/ApiKeyModal'

function App() {
  const [currentView, setCurrentView] = useState<'upload' | 'conference'>('upload')
  const [hasSession, setHasSession] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [textPrompt, setTextPrompt] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load API keys from localStorage on mount
  useEffect(() => {
    const savedGeminiKey = localStorage.getItem('gemini_api_key')
    const savedElevenLabsKey = localStorage.getItem('elevenlabs_api_key')
    
    if (savedGeminiKey) setGeminiApiKey(savedGeminiKey)
    if (savedElevenLabsKey) setElevenLabsApiKey(savedElevenLabsKey)

    // Show API key modal if either key is missing
    if (!savedGeminiKey || !savedElevenLabsKey) {
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

  const handleSubmit = async () => {
    if (!textPrompt.trim()) {
      setError('Please enter a discussion topic to start the AI conference.')
      return;
    }

    if (!geminiApiKey.trim()) {
      setError('Gemini API key is required. Please configure your API keys first.')
      return;
    }

    if (!elevenLabsApiKey.trim()) {
      setError('ElevenLabs API key is required for voice synthesis. Please configure your API keys first.')
      return;
    }
    
    setUploading(true)
    setError(null)
    
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const content = textPrompt.trim()

      console.log('Sending content to API:', { 
        textLength: content.length
      })

      const response = await fetch(`${import.meta.env.DEV ? 'http://localhost:3001' : 'https://buddy-2uux.onrender.com'}/api/process-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          type: 'text',
          sessionId,
          geminiApiKey
        })
      })

      const data = await response.json()

      if (data.success) {
        console.log('Content processed successfully')
        setUploading(false)
        handleSessionStart(sessionId)
      } else {
        throw new Error(data.error || 'Failed to process content')
      }
    } catch (error) {
      console.error('Content processing error:', error)
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          setError('Cannot connect to backend server. Please check if the backend is deployed and running.')
        } else {
          setError(`Failed to process content: ${error.message}`)
        }
      } else {
        setError('Failed to process content. Please check your connection and try again.')
      }
      setUploading(false)
    }
  }

  const areApiKeysConfigured = geminiApiKey.trim() && elevenLabsApiKey.trim()
  const canSubmit = textPrompt.trim() && !uploading && geminiApiKey.trim() && elevenLabsApiKey.trim()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col">
      <Header onShowApiKeys={handleShowApiKeyModal} />
      
      {currentView === 'upload' && (
        <div className="container mx-auto px-4 py-8 lg:py-16 flex-1">
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
                  Transform your ideas into dynamic AI discussions with expert perspectives
                </p>
              </div>
            </div>
            
            {!areApiKeysConfigured && (
              <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-2xl p-6 lg:p-8 mb-8 backdrop-blur-sm">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-400 to-pink-400 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-300 text-lg mb-2">API Keys Required</h3>
                    <p className="text-red-200/80 mb-4 leading-relaxed">
                      Both Gemini and ElevenLabs API keys are required to use the AI conference platform. 
                      Please configure your API keys to continue.
                    </p>
                    <div className="space-y-2 text-sm text-red-200/70 mb-4">
                      <p>• <strong>Gemini API:</strong> Powers the AI expert discussions and content analysis</p>
                      <p>• <strong>ElevenLabs API:</strong> Provides realistic voice synthesis for each AI expert</p>
                    </div>
                    <button
                      onClick={handleShowApiKeyModal}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Configure API Keys
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-2xl p-6 backdrop-blur-sm mb-8">
                <div className="flex items-start space-x-4">
                  <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-red-300 font-semibold text-lg mb-1">Error</h4>
                    <p className="text-red-200/80">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Main Input Card */}
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700/50 overflow-hidden shadow-2xl mb-8">
              <div className="p-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-2">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
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
                    
                    <div className="flex justify-end">
                      <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl font-semibold hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        {uploading ? (
                          <div className="flex items-center justify-center space-x-3">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
        </div>
      )}

      {currentView === 'conference' && hasSession && (
        <div className="container mx-auto px-4 py-4 flex-1">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
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

      <Footer />

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