import React, { useState, useEffect } from 'react'
import { ArrowLeft, Clock, MessageCircle, Users, Download } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface ConversationMessage {
  id: string
  speaker_id: string
  speaker_name: string
  message_content: string
  message_type: string
  timestamp: string
  audio_duration: number
  sequence_number: number
}

interface Conversation {
  id: string
  session_id: string
  title: string
  topic_analysis: string | null
  content_type: string
  status: string
  total_messages: number
  duration_seconds: number
  created_at: string
  updated_at: string
}

interface ConversationDetailProps {
  conversationId: string
  onBack: () => void
}

const ConversationDetail: React.FC<ConversationDetailProps> = ({ conversationId, onBack }) => {
  const { user } = useAuth()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && conversationId) {
      loadConversationDetail()
    }
  }, [user, conversationId])

  const loadConversationDetail = async () => {
    try {
      // Load conversation details
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', user!.id)
        .single()

      if (conversationError) throw conversationError
      setConversation(conversationData)

      // Load conversation messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('sequence_number', { ascending: true })

      if (messagesError) throw messagesError
      setMessages(messagesData || [])
    } catch (error) {
      console.error('Error loading conversation detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getAgentColor = (speakerId: string) => {
    const colors = {
      'chen': 'bg-purple-100 text-purple-800 border-purple-200',
      'thompson': 'bg-blue-100 text-blue-800 border-blue-200',
      'rodriguez': 'bg-green-100 text-green-800 border-green-200',
      'kim': 'bg-orange-100 text-orange-800 border-orange-200',
      'user': 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600'
    }
    return colors[speakerId as keyof typeof colors] || 'bg-slate-100 text-slate-800 border-slate-200'
  }

  const getAgentAvatar = (speakerId: string) => {
    const avatars = {
      'chen': '👩‍🔬',
      'thompson': '👨‍💼',
      'rodriguez': '👩‍🏫',
      'kim': '👨‍💻',
      'user': '👤'
    }
    return avatars[speakerId as keyof typeof avatars] || '🤖'
  }

  const exportConversation = () => {
    if (!conversation || !messages.length) return

    const exportData = {
      conversation: {
        title: conversation.title,
        topic: conversation.topic_analysis,
        duration: formatDuration(conversation.duration_seconds),
        totalMessages: conversation.total_messages,
        createdAt: formatDate(conversation.created_at),
        status: conversation.status
      },
      messages: messages.map(msg => ({
        speaker: msg.speaker_name,
        message: msg.message_content,
        timestamp: formatTime(msg.timestamp),
        type: msg.message_type
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation-${conversation.session_id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Conversation not found</h2>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700 transition-colors"
          >
            ← Back to History
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to History</span>
            </button>
            
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-slate-800 mb-2">
                    {conversation.title}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-slate-600">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(conversation.created_at)}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>{conversation.total_messages} messages</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{formatDuration(conversation.duration_seconds)}</span>
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={exportConversation}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>
              
              {conversation.topic_analysis && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-medium text-slate-800 mb-2">Discussion Topic</h3>
                  <p className="text-slate-600 text-sm">{conversation.topic_analysis}</p>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">Conversation Messages</h2>
            </div>
            
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.message_type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 shadow-sm border ${getAgentColor(message.speaker_id)}`}
                  >
                    {message.message_type !== 'user' && (
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{getAgentAvatar(message.speaker_id)}</span>
                        <div className="text-xs font-bold opacity-90">
                          {message.speaker_name}
                        </div>
                      </div>
                    )}
                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.message_content}
                    </div>
                    <div className={`text-xs mt-2 opacity-75 ${
                      message.message_type === 'user' ? 'text-blue-100' : 'text-slate-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConversationDetail