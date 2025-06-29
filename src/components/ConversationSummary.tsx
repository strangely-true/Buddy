import React from 'react'
import { Clock, MessageCircle, Users, CheckCircle, ArrowLeft } from 'lucide-react'

interface ConversationSummaryProps {
  summary: {
    sessionId: string
    totalMessages: number
    duration: number
    topic: string
    participants: string[]
    endedAt: string
    status: string
  }
  onBackToDashboard: () => void
}

const ConversationSummary: React.FC<ConversationSummaryProps> = ({ summary, onBackToDashboard }) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Discussion Complete!
          </h1>
          <p className="text-slate-600">
            Your AI expert panel has concluded their focused discussion
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <h2 className="text-xl font-bold mb-2">Conversation Summary</h2>
            <p className="text-blue-100 text-sm">Session ID: {summary.sessionId}</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Topic */}
            <div>
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                Discussion Topic
              </h3>
              <p className="text-slate-800 font-medium">
                {summary.topic}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-slate-800">
                  {formatDuration(summary.duration)}
                </div>
                <div className="text-sm text-slate-600">Duration</div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-slate-800">
                  {summary.totalMessages}
                </div>
                <div className="text-sm text-slate-600">Expert Messages</div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-slate-800">
                  {summary.participants.length}
                </div>
                <div className="text-sm text-slate-600">AI Experts</div>
              </div>
            </div>

            {/* Participants */}
            <div>
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">
                AI Expert Panel
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {summary.participants.map((participant, index) => (
                  <div key={index} className="flex items-center space-x-3 bg-slate-50 rounded-lg p-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {participant.charAt(0)}
                    </div>
                    <span className="text-slate-700 font-medium text-sm">{participant}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Completion Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Successfully Completed</span>
              </div>
              <p className="text-green-700 text-sm">
                Ended on {formatDate(summary.endedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onBackToDashboard}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center space-x-2 bg-white text-slate-700 px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all duration-200 font-medium"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Start New Discussion</span>
          </button>
        </div>

        {/* Note */}
        <div className="text-center mt-6">
          <p className="text-sm text-slate-500">
            This conversation has been saved to your history and can be accessed from your dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ConversationSummary