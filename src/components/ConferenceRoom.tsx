import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Users, PhoneOff, Pause, Play, Clock, Mic, MicOff, AlertCircle, RefreshCw } from 'lucide-react';
import AIParticipant from './AIParticipant';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

interface ConferenceRoomProps {
  onEndCall: () => void;
  sessionId: string;
  geminiApiKey: string;
  elevenLabsApiKey: string;
}

const ConferenceRoom: React.FC<ConferenceRoomProps> = ({ 
  onEndCall, 
  sessionId, 
  geminiApiKey, 
  elevenLabsApiKey 
}) => {
  const { user } = useAuth();
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [activeParticipant, setActiveParticipant] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState('Initializing AI conference...');
  const [isCallActive, setIsCallActive] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [conversationStatus, setConversationStatus] = useState<'initializing' | 'preparing' | 'active' | 'paused' | 'ended' | 'error'>('initializing');
  const [isPaused, setIsPaused] = useState(false);
  const [discussionTime, setDiscussionTime] = useState(0);
  const [maxDiscussionTime] = useState(15 * 60); // 15 minutes in seconds
  const [messageCount, setMessageCount] = useState(0);
  const [maxMessages] = useState(18);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [conversationStarted, setConversationStarted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupRef = useRef<boolean>(false);
  const socketRef = useRef<Socket | null>(null);
  const initializationRef = useRef<boolean>(false);

  const participants = [
    { id: 'chen', name: 'Dr. Sarah Chen', role: 'Research Analyst', avatar: '👩‍🔬', color: 'bg-purple-100 text-purple-800' },
    { id: 'thompson', name: 'Marcus Thompson', role: 'Strategy Expert', avatar: '👨‍💼', color: 'bg-blue-100 text-blue-800' },
    { id: 'rodriguez', name: 'Prof. Elena Rodriguez', role: 'Domain Specialist', avatar: '👩‍🏫', color: 'bg-green-100 text-green-800' },
    { id: 'kim', name: 'Alex Kim', role: 'Innovation Lead', avatar: '👨‍💻', color: 'bg-orange-100 text-orange-800' },
  ];

  // Enhanced logging function
  const log = (level: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [CONFERENCE-${level.toUpperCase()}] ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  };

  // Timer management
  useEffect(() => {
    if (conversationStatus === 'active' && !isPaused && !cleanupRef.current) {
      timerRef.current = setInterval(() => {
        setDiscussionTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDiscussionTime) {
            log('info', 'Discussion time limit reached');
            handleEndCall();
            return maxDiscussionTime;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [conversationStatus, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    const percentage = discussionTime / maxDiscussionTime;
    if (percentage > 0.8) return 'text-red-600';
    if (percentage > 0.6) return 'text-orange-600';
    return 'text-slate-600';
  };

  const cleanupResources = () => {
    if (cleanupRef.current) return;
    cleanupRef.current = true;
    
    log('info', 'Cleaning up resources');
    
    // Clean up audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      setCurrentAudio(null);
    }
    
    // Clean up timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Clean up socket
    if (socketRef.current) {
      socketRef.current.emit('end-session', sessionId);
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }
    
    setActiveParticipant(null);
    setIsCallActive(false);
    setConversationStatus('ended');
  };

  const startConversation = () => {
    if (!socket || conversationStarted || cleanupRef.current) {
      log('warn', 'Cannot start conversation', { 
        hasSocket: !!socket, 
        conversationStarted, 
        cleanupRef: cleanupRef.current 
      });
      return;
    }

    log('info', 'Manually starting conversation');
    setConversationStarted(true);
    setConversationStatus('preparing');
    setCurrentTopic('AI experts are starting the discussion...');
    
    socket.emit('start-conversation', {
      sessionId,
      geminiApiKey,
      elevenLabsApiKey,
      userId: user?.id
    });
  };

  useEffect(() => {
    if (cleanupRef.current || initializationRef.current) return;
    initializationRef.current = true;

    log('info', 'Initializing conference room', { sessionId, geminiApiKey: !!geminiApiKey });

    // Validate required props
    if (!sessionId || !geminiApiKey) {
      log('error', 'Missing required props', { sessionId: !!sessionId, geminiApiKey: !!geminiApiKey });
      setError('Missing session ID or API key');
      setConversationStatus('error');
      return;
    }

    // Initialize socket connection
    const newSocket = io('http://localhost:3001', {
      timeout: 10000,
      forceNew: true
    });
    
    setSocket(newSocket);
    socketRef.current = newSocket;

    // Connection event handlers
    newSocket.on('connect', () => {
      log('info', 'Socket connected');
      setConnectionStatus('connected');
      setError(null);
      
      // Join session
      newSocket.emit('join-session', sessionId);
    });

    newSocket.on('disconnect', () => {
      log('warn', 'Socket disconnected');
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', (error) => {
      log('error', 'Socket connection error', error);
      setConnectionStatus('error');
      setError('Failed to connect to server');
    });

    // Session event handlers
    newSocket.on('session-status', (data) => {
      log('info', 'Received session status', data);
      if (data.status === 'prepared') {
        setConversationStatus('preparing');
        setCurrentTopic('Session prepared. Click "Start Discussion" to begin.');
        setIsCallActive(true);
      }
    });

    // Listen for agent messages
    newSocket.on('agent-message', (data) => {
      if (cleanupRef.current) return;
      
      log('info', 'Received agent message', { agentId: data.agentId, agentName: data.agentName });
      
      setActiveParticipant(data.agentId);
      setCurrentTopic('AI Expert Discussion in Progress');
      setConversationStatus('active');
      setMessageCount(prev => prev + 1);
      setIsCallActive(true);
      
      // Play audio if available, speaker is on, and not paused
      if (data.audio && isSpeakerOn && !isPaused) {
        playAudio(data.audio, data.audioDuration || 5000);
      } else if (data.audioDuration) {
        // Even without audio, simulate the speaking duration
        setTimeout(() => {
          if (!cleanupRef.current) {
            setActiveParticipant(null);
          }
        }, data.audioDuration);
      } else {
        // Default timeout if no duration provided
        setTimeout(() => {
          if (!cleanupRef.current) {
            setActiveParticipant(null);
          }
        }, 5000);
      }
    });

    // Listen for conversation pause/resume
    newSocket.on('conversation-paused', () => {
      if (cleanupRef.current) return;
      log('info', 'Conversation paused');
      setIsPaused(true);
      setConversationStatus('paused');
      if (currentAudio) {
        currentAudio.pause();
      }
    });

    newSocket.on('conversation-resumed', () => {
      if (cleanupRef.current) return;
      log('info', 'Conversation resumed');
      setIsPaused(false);
      setConversationStatus('active');
    });

    // Listen for conversation end
    newSocket.on('conversation-ended', (data) => {
      if (cleanupRef.current) return;
      log('info', 'Conversation ended', data);
      setConversationStatus('ended');
      setCurrentTopic(data.message);
      setActiveParticipant(null);
      setIsCallActive(false);
    });

    // Listen for session end
    newSocket.on('session-ended', () => {
      if (cleanupRef.current) return;
      log('info', 'Session ended');
      setIsCallActive(false);
      setConversationStatus('ended');
    });

    // Listen for errors
    newSocket.on('error', (error) => {
      log('error', 'Socket error received', error);
      setError(typeof error === 'string' ? error : 'An error occurred');
      if (error === 'Session not found') {
        setConversationStatus('error');
      }
    });

    return () => {
      log('info', 'Component unmounting, cleaning up');
      cleanupResources();
    };
  }, [sessionId, geminiApiKey, elevenLabsApiKey, user?.id]);

  const playAudio = (audioBase64: string, duration: number) => {
    if (cleanupRef.current) return;
    
    try {
      log('info', 'Playing audio', { duration });
      
      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
      }

      const audioBlob = new Blob([Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      setCurrentAudio(audio);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (!cleanupRef.current) {
          setActiveParticipant(null);
          setCurrentAudio(null);
        }
      };

      audio.onerror = () => {
        log('error', 'Audio playback error');
        URL.revokeObjectURL(audioUrl);
        if (!cleanupRef.current) {
          setActiveParticipant(null);
          setCurrentAudio(null);
        }
      };
      
      audio.play().catch(error => {
        log('error', 'Audio play error', error);
        if (!cleanupRef.current) {
          setActiveParticipant(null);
          setCurrentAudio(null);
        }
      });
    } catch (error) {
      log('error', 'Audio processing error', error);
      if (!cleanupRef.current) {
        setActiveParticipant(null);
      }
    }
  };

  const toggleConversation = () => {
    if (!socket || cleanupRef.current || conversationStatus === 'ended' || conversationStatus === 'error') return;

    log('info', 'Toggling conversation', { isPaused });

    if (isPaused) {
      socket.emit('resume-conversation', sessionId);
    } else {
      socket.emit('pause-conversation', sessionId);
      if (currentAudio) {
        currentAudio.pause();
      }
    }
  };

  const handleEndCall = () => {
    if (cleanupRef.current) return;
    
    log('info', 'Ending call');
    cleanupResources();
    
    // Call parent handler with a slight delay to ensure cleanup is complete
    setTimeout(() => {
      onEndCall();
    }, 100);
  };

  const toggleSpeaker = () => {
    log('info', 'Toggling speaker', { currentState: isSpeakerOn });
    setIsSpeakerOn(!isSpeakerOn);
    if (!isSpeakerOn && currentAudio) {
      currentAudio.pause();
      setActiveParticipant(null);
    }
  };

  const getStatusBadge = () => {
    switch (conversationStatus) {
      case 'initializing':
        return <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">Initializing</span>;
      case 'preparing':
        return <span className="px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 font-medium">Ready to Start</span>;
      case 'active':
        return <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">Live Discussion</span>;
      case 'paused':
        return <span className="px-3 py-1 text-xs rounded-full bg-orange-100 text-orange-800 font-medium">Paused</span>;
      case 'ended':
        return <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-800 font-medium">Ended</span>;
      case 'error':
        return <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-800 font-medium">Error</span>;
      default:
        return null;
    }
  };

  const getProgressPercentage = () => {
    return Math.min((discussionTime / maxDiscussionTime) * 100, 100);
  };

  const getMessageProgress = () => {
    return Math.min((messageCount / maxMessages) * 100, 100);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'disconnected':
        return 'text-orange-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Show error state
  if (conversationStatus === 'error') {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-red-200 h-full flex flex-col items-center justify-center p-8">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-red-800 mb-2">Conference Error</h2>
        <p className="text-red-600 text-center mb-6">{error || 'An error occurred while setting up the conference'}</p>
        <button
          onClick={handleEndCall}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-xl border border-slate-200 h-full flex flex-col overflow-hidden">
      {/* Enhanced Header */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">AI Expert Panel</h2>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-slate-600">4 Specialists • Real-time Discussion</p>
                  <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`text-xs ${getConnectionStatusColor()}`}>
                    {connectionStatus}
                  </span>
                </div>
              </div>
            </div>
            {getStatusBadge()}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Start Discussion Button */}
            {conversationStatus === 'preparing' && !conversationStarted && (
              <button
                onClick={startConversation}
                disabled={connectionStatus !== 'connected'}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Start Discussion
              </button>
            )}

            {/* Control Buttons */}
            <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
              {/* Pause/Resume Button */}
              <button
                onClick={toggleConversation}
                disabled={conversationStatus === 'ended' || conversationStatus === 'preparing' || conversationStatus === 'initializing' || conversationStatus === 'error'}
                className={`p-2 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isPaused 
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-md' 
                    : 'bg-orange-600 text-white hover:bg-orange-700 shadow-md'
                }`}
                title={isPaused ? 'Resume Discussion' : 'Pause Discussion'}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>

              <button
                onClick={toggleSpeaker}
                disabled={conversationStatus === 'ended' || conversationStatus === 'error'}
                className={`p-2 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isSpeakerOn 
                    ? 'bg-slate-600 text-white hover:bg-slate-700 shadow-md' 
                    : 'bg-red-600 text-white hover:bg-red-700 shadow-md'
                }`}
                title={isSpeakerOn ? 'Mute Audio' : 'Unmute Audio'}
              >
                {isSpeakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={handleEndCall}
                disabled={cleanupRef.current}
                className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all duration-200 disabled:opacity-50 shadow-md"
                title="End Discussion"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Time Progress */}
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Discussion Time</span>
              </div>
              <span className={`text-sm font-mono ${getTimeColor()}`}>
                {formatTime(discussionTime)} / {formatTime(maxDiscussionTime)}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  getProgressPercentage() > 80 ? 'bg-red-500' : 
                  getProgressPercentage() > 60 ? 'bg-orange-500' : 'bg-blue-500'
                }`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>

          {/* Message Progress */}
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Mic className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Messages</span>
              </div>
              <span className="text-sm font-mono text-slate-600">
                {messageCount} / {maxMessages}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="h-2 bg-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${getMessageProgress()}%` }}
              />
            </div>
          </div>

          {/* Current Speaker */}
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <MicOff className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Current Speaker</span>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              {activeParticipant ? 
                participants.find(p => p.id === activeParticipant)?.name || 'Unknown' : 
                'None'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Participants Grid */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-2 gap-6 h-full">
          {participants.map((participant) => (
            <div key={participant.id} className="h-full">
              <AIParticipant
                participant={participant}
                isActive={activeParticipant === participant.id}
                isSpeaking={activeParticipant === participant.id && conversationStatus === 'active' && !isPaused}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Status Footer */}
      <div className="bg-white border-t border-slate-200 p-6">
        <div className="text-center">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Current Discussion</h3>
            <p className="text-slate-600 max-w-2xl mx-auto">
              {currentTopic}
            </p>
          </div>
          
          {conversationStatus === 'initializing' && (
            <div className="flex items-center justify-center space-x-2 text-sm text-blue-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Connecting to AI conference system...</span>
            </div>
          )}
          
          {conversationStatus === 'preparing' && !conversationStarted && (
            <div className="flex items-center justify-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Ready to start! Click "Start Discussion" to begin the expert panel.</span>
            </div>
          )}

          {conversationStatus === 'preparing' && conversationStarted && (
            <div className="flex items-center justify-center space-x-2 text-sm text-yellow-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>AI experts are analyzing your topic and preparing discussion...</span>
            </div>
          )}
          
          {conversationStatus === 'active' && activeParticipant && !isPaused && (
            <div className="flex items-center justify-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>{participants.find(p => p.id === activeParticipant)?.name} is speaking...</span>
            </div>
          )}
          
          {isPaused && (
            <div className="flex items-center justify-center space-x-2 text-sm text-orange-600">
              <Pause className="w-4 h-4" />
              <span>Discussion paused - Click play to resume</span>
            </div>
          )}
          
          {conversationStatus === 'ended' && (
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-600">
              <span>✅ Expert discussion completed</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center space-x-2 text-sm text-red-600 mt-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConferenceRoom;