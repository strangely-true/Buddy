import React, { useState, useEffect } from 'react'
import { Plus, Clock, FileText, Users, Mic, Search, Filter } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

interface ConferenceSession {
  id: string
  title: string
  description: string | null
  content_type: string
  created_at: string
  session_data: any
}

interface DashboardProps {
  onStartNewConference: () => void
  onResumeConference: (sessionId: string) => void
}

const Dashboard: React.FC<DashboardProps> = ({ onStartNewConference, onResumeConference }) => {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ConferenceSession[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    if (user) {
      loadUserSessions()
    }
  }, [user])

  const loadUserSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('conference_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (session.description && session.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesFilter = filterType === 'all' || session.content_type === filterType
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

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
      case 'PDF document':
      case 'Word document':
        return <FileText className="w-4 h-4" />
      case 'image':
        return <FileText className="w-4 h-4" />
      case 'text prompt':
        return <Mic className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'document':
      case 'PDF document':
      case 'Word document':
        return 'bg-blue-100 text-blue-800'
      case 'image':
        return 'bg-green-100 text-green-800'
      case 'text prompt':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your conferences...</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{sessions.length}</h3>
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
                    {sessions.filter(s => new Date(s.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                  </h3>
                  <p className="text-sm text-slate-600">This Week</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search conferences..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <Filter className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="document">Documents</option>
                  <option value="image">Images</option>
                  <option value="text prompt">Text Prompts</option>
                </select>
              </div>
            </div>
          </div>

          {/* Conference Sessions */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">Your Conferences</h2>
            </div>

            {filteredSessions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">
                  {sessions.length === 0 ? 'No conferences yet' : 'No matching conferences'}
                </h3>
                <p className="text-slate-600 mb-6">
                  {sessions.length === 0 
                    ? 'Start your first AI conference by uploading a document or entering a topic'
                    : 'Try adjusting your search or filter criteria'
                  }
                </p>
                {sessions.length === 0 && (
                  <button
                    onClick={onStartNewConference}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Start Your First Conference
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-6 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => onResumeConference(session.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-slate-800">{session.title}</h3>
                          <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getContentTypeColor(session.content_type)}`}>
                            {getContentTypeIcon(session.content_type)}
                            <span>{session.content_type}</span>
                          </span>
                        </div>
                        {session.description && (
                          <p className="text-slate-600 text-sm mb-2 line-clamp-2">
                            {session.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-slate-500">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(session.created_at)}</span>
                          </span>
                          {session.session_data?.totalMessages && (
                            <span className="flex items-center space-x-1">
                              <Mic className="w-3 h-3" />
                              <span>{session.session_data.totalMessages} messages</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                          Resume →
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