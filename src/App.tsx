import React, { useState, useEffect } from 'react'
import { MessageCircle, Settings, LogIn } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SessionProvider } from './contexts/SessionContext'
import Header from './components/Header'
import Dashboard from './components/dashboard/Dashboard'
import ConferenceRoom from './components/ConferenceRoom'
import FileUpload from './components/FileUpload'
import ChatInterface from './components/ChatInterface'
import ApiKeyModal from './components/ApiKeyModal'
import ConversationSummary from './components/ConversationSummary'
import ConversationHistory from './components/ConversationHistory'
import ConversationDetail from './components/ConversationDetail'
import { supabase } from './lib/supabase'

function AppContent() {
  const { user, loading } = useAuth()
  const [currentView, setCurrentView] = useState<'dashboard' | 'upload' | 'conference' | 'summary' | 'history' | 'conversation-detail'>('dashboard')
  const [hasSession, setHasSession] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [conversationSummary, setConversationSummary] = useState<any>(null)
  const [selectedConversationId, setSelectedConversationId] = useState<string>('')
  const [isProcessingEnd, setIsProcessingEnd] = useState(false)

  // Load API keys from localStorage on mount
  useEffect(() => {
    const savedGeminiKey = localStorage.getItem('gemini_api_key')
    const savedElevenLabsKey = localStorage.getItem('elevenlabs_api_key')
    
    if (savedGeminiKey) setGeminiApiKey(savedGeminiKey)
    if (savedElevenLabsKey) setElevenLabsApiKey(savedElevenLabsKey)
  }, [])

  // Handle OAuth callback and prevent infinite redirects
  useEffect(() => {
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      
      if (code && window.location.pathname === '/auth/callback') {
        try {
          // Clear the URL to prevent re-processing
          window.history.replaceState({}, document.title, '/')
          
          // Let Supabase handle the auth callback
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('Auth callback error:', error)
          }
        } catch (error) {
          console.error('Error handling auth callback:', error)
          // Redirect to home on error
          window.location.href = '/'
        }
      }
    }

    handleAuthCallback()
  }, [])

  const handleSessionStart = (newSessionId: string) => {
    setSessionId(newSessionId)
    setHasSession(true)
    setCurrentView('conference')
    setIsProcessingEnd(false) // Reset processing state
  }

  const handleConversationEnd = async (summary: any) => {
    // Prevent multiple calls
    if (isProcessingEnd) {
      console.log('Already processing conversation end, skipping...')
      return
    }
    
    setIsProcessingEnd(true)
    
    try {
      console.log('Processing conversation end with summary:', summary)
      
      // Save conversation to database if user is authenticated
      if (user && summary.sessionId) {
        const { data: conversation, error: conversationError } = await supabase
          .from('conversations')
          .insert({
            session_id: summary.sessionId,
            user_id: user.id,
            title: summary.topic || `AI Discussion - ${new Date().toLocaleDateString()}`,
            topic_analysis: summary.topic,
            content_type: 'ai_discussion',
            status: 'completed',
            total_messages: summary.totalMessages || 0,
            duration_seconds: summary.duration || 0
          })
          .select()
          .single()

        if (conversationError) {
          console.error('Error saving conversation:', conversationError)
        } else {
          console.log('Conversation saved successfully:', conversation)
        }
      }

      // Set summary and navigate
      setConversationSummary(summary)
      setHasSession(false)
      setSessionId('')
      setCurrentView('summary')
      
    } catch (error) {
      console.error('Error handling conversation end:', error)
      // Still show summary even if save fails
      setConversationSummary(summary)
      setHasSession(false)
      setSessionId('')
      setCurrentView('summary')
    } finally {
      // Reset processing state after a delay to prevent rapid re-triggering
      setTimeout(() => {
        setIsProcessingEnd(false)
      }, 2000)
    }
  }

  const handleEndCall = () => {
    // This is for emergency fallback only
    console.log('Emergency end call triggered')
    if (!isProcessingEnd) {
      setHasSession(false)
      setSessionId('')
      setCurrentView('dashboard')
      setIsProcessingEnd(false)
    }
  }

  const handleBackToDashboard = () => {
    setCurrentView('dashboard')
    setConversationSummary(null)
    setSelectedConversationId('')
    setIsProcessingEnd(false)
  }

  const handleStartNewConference = () => {
    setCurrentView('upload')
    setIsProcessingEnd(false)
  }

  const handleShowHistory = () => {
    setCurrentView('history')
  }

  const handleViewConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId)
    setCurrentView('conversation-detail')
  }

  const handleResumeConference = (sessionId: string) => {
    // TODO: Implement resume functionality
    console.log('Resume conference:', sessionId)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header onShowApiKeys={currentView !== 'dashboard' ? handleShowApiKeyModal : undefined} />
      
      {user ? (
        <>
          {currentView === 'dashboard' && (
            <Dashboard 
              onStartNewConference={handleStartNewConference}
              onResumeConference={handleResumeConference}
              onShowHistory={handleShowHistory}
            />
          )}

          {currentView === 'upload' && (
            <div className="container mx-auto px-4 py-8">
              <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4"
                  >
                    ← Back to Dashboard
                  </button>
                  <h1 className="text-3xl font-bold text-slate-800 mb-2">
                    Start New Conference
                  </h1>
                  <p className="text-slate-600">
                    Upload documents or enter a topic to begin your AI discussion
                  </p>
                </div>
                
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
                
                <FileUpload 
                  onSessionStart={handleSessionStart} 
                  isApiKeyConfigured={!!geminiApiKey}
                  geminiApiKey={geminiApiKey}
                  elevenLabsApiKey={elevenLabsApiKey}
                />
              </div>
            </div>
          )}

          {currentView === 'conference' && hasSession && !isProcessingEnd && (
            <div className="container mx-auto px-4 py-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
                <div className="lg:col-span-2">
                  <ConferenceRoom 
                    onEndCall={handleEndCall} 
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

          {currentView === 'summary' && conversationSummary && (
            <ConversationSummary
              summary={conversationSummary}
              onBackToDashboard={handleBackToDashboard}
            />
          )}

          {currentView === 'history' && (
            <ConversationHistory
              onBackToDashboard={handleBackToDashboard}
              onViewConversation={handleViewConversation}
            />
          )}

          {currentView === 'conversation-detail' && selectedConversationId && (
            <ConversationDetail
              conversationId={selectedConversationId}
              onBack={() => setCurrentView('history')}
            />
          )}

          {/* Processing overlay */}
          {isProcessingEnd && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-8 text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Processing...</h3>
                <p className="text-slate-600">Saving your conversation and generating summary...</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-12">
              <h1 className="text-5xl md:text-6xl font-bold text-slate-800 mb-6">
                Transform Documents into
                <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI Conversations
                </span>
              </h1>
              <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
                Upload any document and watch as AI experts analyze, discuss, and debate the content in real-time. 
                Join the conversation with your voice or text.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">AI Expert Panels</h3>
                <p className="text-slate-600 text-sm">
                  Four specialized AI agents analyze your content from different perspectives
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Voice Integration</h3>
                <p className="text-slate-600 text-sm">
                  Speak naturally to join the discussion or ask questions
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <LogIn className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Save & Resume</h3>
                <p className="text-slate-600 text-sm">
                  Keep track of all your conferences and insights
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-2xl">
              <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
              <p className="text-blue-100 mb-6">
                Sign in with Google to save your conferences and unlock advanced features
              </p>
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

function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <AppContent />
      </SessionProvider>
    </AuthProvider>
  )
}

export default App