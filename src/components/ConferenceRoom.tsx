import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Users, PhoneOff, Pause, Play, Clock, Mic, MicOff } from 'lucide-react';
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
  const [currentTopic, setCurrentTopic] = useState('Preparing AI conference...');
  const [isCallActive, setIsCallActive] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [conversationStatus, setConversationStatus] = useState<'preparing' | 'active' | 'paused' | 'ended'>('preparing');
  const [isPaused, setIsPaused] = useState(false);
  const [discussionTime, setDiscussionTime] = useState(0);
  const [maxDiscussionTime] = useState(15 * 60); // 15 minutes in seconds
  const [messageCount, setMessageCount] = useState(0);
  const [maxMessages] = useState(18);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupRef = useRef<boolean>(false);
  const socketRef = useRef<Socket | null>(null);

  const participants = [
    { id: 'chen', name: 'Dr. Sarah Chen', role: 'Research Analyst', avatar: '👩‍🔬', color: 'bg-purple-100 text-purple-800' },
    { id: 'thompson', name: 'Marcus Thompson', role: 'Strategy Expert', avatar: '👨‍💼', color: 'bg-blue-100 text-blue-800' },
    { id: 'rodriguez', name: 'Prof. Elena Rodriguez', role: 'Domain Specialist', avatar: '👩‍🏫', color: 'bg-green-100 text-green-800' },
    { id: 'kim', name: 'Alex Kim', role: 'Innovation Lead', avatar: '👨‍💻', color: 'bg-orange-100 text-orange-800' },
  ];

  // Timer management
  useEffect(() => {
    if (conversationStatus === 'active' && !isPaused && !cleanupRef.current) {
      timerRef.current = setInterval(() => {
        setDiscussionTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDiscussionTime) {
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

  useEffect(() => {
    if (cleanupRef.current) return;

    // Initialize socket connection
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);
    socketRef.current = newSocket;

    // Join session
    newSocket.emit('join-session', sessionId);

    // Listen for agent messages
    newSocket.on('agent-message', (data) => {
      if (cleanupRef.current) return;
      
      setActiveParticipant(data.agentId);
      setCurrentTopic('AI Expert Discussion in Progress');
      setConversationStatus('active');
      setMessageCount(prev => prev + 1);
      
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
      setIsPaused(true);
      setConversationStatus('paused');
      if (currentAudio) {
        currentAudio.pause();
      }
    });

    newSocket.on('conversation-resumed', () => {
      if (cleanupRef.current) return;
      setIsPaused(false);
      setConversationStatus('active');
    });

    // Listen for conversation end
    newSocket.on('conversation-ended', (data) => {
      if (cleanupRef.current) return;
      setConversationStatus('ended');
      setCurrentTopic(data.message);
      setActiveParticipant(null);
      setIsCallActive(false);
    });

    // Listen for session end
    newSocket.on('session-ended', () => {
      if (cleanupRef.current) return;
      setIsCallActive(false);
      setConversationStatus('ended');
    });

    // Start conversation
    newSocket.emit('start-conversation', {
      sessionId,
      geminiApiKey,
      elevenLabsApiKey,
      userId: user?.id
    });

    return () => {
      cleanupResources();
    };
  }, [sessionId, geminiApiKey, elevenLabsApiKey, user?.id]);

  const playAudio = (audioBase64: string, duration: number) => {
    if (cleanupRef.current) return;
    
    try {
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
        console.error('Audio playback error');
        URL.revokeObjectURL(audioUrl);
        if (!cleanupRef.current) {
          setActiveParticipant(null);
          setCurrentAudio(null);
        }
      };
      
      audio.play().catch(error => {
        console.error('Audio playback error:', error);
        if (!cleanupRef.current) {
          setActiveParticipant(null);
          setCurrentAudio(null);
        }
      });
    } catch (error) {
      console.error('Audio processing error:', error);
      if (!cleanupRef.current) {
        setActiveParticipant(null);
      }
    }
  };

  const toggleConversation = () => {
    if (!socket || cleanupRef.current || conversationStatus === 'ended') return;

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
    
    cleanupResources();
    
    // Call parent handler with a slight delay to ensure cleanup is complete
    setTimeout(() => {
      onEndCall();
    }, 100);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    if (!isSpeakerOn && currentAudio) {
      currentAudio.pause();
      setActiveParticipant(null);
    }
  };

  const getStatusBadge = () => {
    switch (conversationStatus) {
      case 'preparing':
        return <span className="px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 font-medium">Preparing</span>;
      case 'active':
        return <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">Live Discussion</span>;
      case 'paused':
        return <span className="px-3 py-1 text-xs rounded-full bg-orange-100 text-orange-800 font-medium">Paused</span>;
      case 'ended':
        return <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-800 font-medium">Ended</span>;
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
                <p className="text-sm text-slate-600">4 Specialists • Real-time Discussion</p>
              </div>
            </div>
            {getStatusBadge()}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Control Buttons */}
            <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
              {/* Pause/Resume Button */}
              <button
                onClick={toggleConversation}
                disabled={conversationStatus === 'ended' || conversationStatus === 'preparing'}
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
                disabled={conversationStatus === 'ended'}
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
          
          {conversationStatus === 'preparing' && (
            <div className="flex items-center justify-center space-x-2 text-sm text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Analyzing content and preparing discussion...</span>
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
        </div>
      </div>
    </div>
  );
};

export default ConferenceRoom;