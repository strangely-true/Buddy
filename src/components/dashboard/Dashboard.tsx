import React, { useState, useEffect } from 'react'
import { Plus, Clock, FileText, Users, Mic, Search, Filter, History } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

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

interface DashboardProps {
  onStartNewConference: () => void
  onResumeConference: (sessionId: string) => void
  onShowHistory: () => void
}

const Dashboard: React.FC<DashboardProps> = ({ 
  onStartNewConference, 
  onResumeConference,
  onShowHistory 
}) => {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    if (user) {
      loadUserConversations()
    }
  }, [user])

  const loadUserConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5) // Show only recent 5 on dashboard

      if (error) throw error
      setConversations(data || [])
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = conversation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (conversation.topic_analysis && conversation.topic_analysis.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesFilter = filterType === 'all' || conversation.status === filterType
    return matchesSearch && matchesFilter
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'active':
        return 'bg-blue-100 text-blue-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Welcome back, {user?.user_metadata?.full_name || user?.user_metadata?.name || 'there'}!
            </h1>
            <p className="text-slate-600">
              Manage your AI conferences and start new discussions
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <button
              onClick={onStartNewConference}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
            >
              <div className="flex items-center space-x-3">
                <Plus className="w-6 h-6" />
                <div className="text-left">
                  <h3 className="font-semibold">Start New Conference</h3>
                  <p className="text-sm text-blue-100">Upload documents or enter a topic</p>
                </div>
              </div>
            </button>

            <button
              onClick={onShowHistory}
              className="bg-white p-6 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <History className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-800">View History</h3>
                  <p className="text-sm text-slate-600">Browse all conversations</p>
                </div>
              </div>
            </button>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{conversations.length}</h3>
                  <p className="text-sm text-slate-600">Total Conferences</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">
                    {conversations.filter(c => new Date(c.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                  </h3>
                  <p className="text-sm text-slate-600">This Week</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Conversations */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">Recent Conversations</h2>
              {conversations.length > 0 && (
                <button
                  onClick={onShowHistory}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                >
                  View All →
                </button>
              )}
            </div>

            {conversations.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">
                  No conversations yet
                </h3>
                <p className="text-slate-600 mb-6">
                  Start your first AI conference by uploading a document or entering a topic
                </p>
                <button
                  onClick={onStartNewConference}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Your First Conference
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {conversations.slice(0, 5).map((conversation) => (
                  <div
                    key={conversation.id}
                    className="p-6 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-slate-800">{conversation.title}</h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(conversation.status)}`}>
                            {conversation.status}
                          </span>
                        </div>
                        {conversation.topic_analysis && (
                          <p className="text-slate-600 text-sm mb-2 line-clamp-2">
                            {conversation.topic_analysis.substring(0, 150)}...
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-slate-500">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(conversation.created_at)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Mic className="w-3 h-3" />
                            <span>{conversation.total_messages} messages</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Users className="w-3 h-3" />
                            <span>{formatDuration(conversation.duration_seconds)}</span>
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <button 
                          onClick={() => onShowHistory()}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard