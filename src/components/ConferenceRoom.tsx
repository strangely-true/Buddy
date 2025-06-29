import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Users, PhoneOff, Pause, Play, Clock, MessageCircle } from 'lucide-react';
import AIParticipant from './AIParticipant';
import io, { Socket } from 'socket.io-client';

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
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [activeParticipant, setActiveParticipant] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState('Preparing AI conference...');
  const [isCallActive, setIsCallActive] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [conversationStatus, setConversationStatus] = useState('preparing');
  const [isPaused, setIsPaused] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [maxMessages] = useState(15); // Limited focused discussion
  const [discussionTime, setDiscussionTime] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const endingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const participants = [
    { 
      id: 'chen', 
      name: 'Dr. Sarah Chen', 
      role: 'Research Analyst', 
      avatar: '👩‍🔬', 
      color: 'bg-purple-100 text-purple-800',
      expertise: 'Data & Research'
    },
    { 
      id: 'thompson', 
      name: 'Marcus Thompson', 
      role: 'Strategy Expert', 
      avatar: '👨‍💼', 
      color: 'bg-blue-100 text-blue-800',
      expertise: 'Business Strategy'
    },
    { 
      id: 'rodriguez', 
      name: 'Prof. Elena Rodriguez', 
      role: 'Domain Specialist', 
      avatar: '👩‍🏫', 
      color: 'bg-green-100 text-green-800',
      expertise: 'Academic Theory'
    },
    { 
      id: 'kim', 
      name: 'Alex Kim', 
      role: 'Innovation Lead', 
      avatar: '👨‍💻', 
      color: 'bg-orange-100 text-orange-800',
      expertise: 'Future Tech'
    },
  ];

  // Timer for discussion duration
  useEffect(() => {
    if (conversationStatus === 'active' && !isPaused && !isEnding) {
      timerRef.current = setInterval(() => {
        setDiscussionTime(prev => prev + 1);
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
      }
    };
  }, [conversationStatus, isPaused, isEnding]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Enhanced call ending with proper cleanup and routing
  const handleCallEnd = async () => {
    try {
      setIsEnding(true);
      setRoutingError(null);
      
      // Stop any playing audio immediately
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
        setCurrentAudio(null);
      }
      
      // Clear all timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (endingTimeoutRef.current) {
        clearTimeout(endingTimeoutRef.current);
        endingTimeoutRef.current = null;
      }
      
      // Update states
      setIsCallActive(false);
      setActiveParticipant(null);
      setConversationStatus('ended');
      
      // Disconnect socket
      if (socket) {
        socket.emit('end-session', sessionId);
        socket.disconnect();
        setSocket(null);
      }
      
      // Route to home page with a small delay to ensure cleanup
      endingTimeoutRef.current = setTimeout(() => {
        try {
          onEndCall();
        } catch (error) {
          console.error('Routing error:', error);
          setRoutingError('Failed to return to home page. Please refresh the page.');
          setIsEnding(false);
        }
      }, 500);
      
    } catch (error) {
      console.error('Error ending call:', error);
      setRoutingError('Error ending call. Please try again.');
      setIsEnding(false);
    }
  };

  // Handle conversation end event
  const handleConversationEnd = () => {
    setConversationStatus('ended');
    setCurrentTopic('Expert discussion completed successfully');
    setActiveParticipant(null);
    
    // Auto-end call after conversation completes
    endingTimeoutRef.current = setTimeout(() => {
      handleCallEnd();
    }, 3000);
  };

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Join session
    newSocket.emit('join-session', sessionId);

    // Listen for agent messages
    newSocket.on('agent-message', (data) => {
      if (!isEnding) {
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
            if (!isEnding) {
              setActiveParticipant(null);
            }
          }, data.audioDuration);
        } else {
          // Default timeout if no duration provided
          setTimeout(() => {
            if (!isEnding) {
              setActiveParticipant(null);
            }
          }, 5000);
        }
      }
    });

    // Listen for conversation pause/resume
    newSocket.on('conversation-paused', () => {
      if (!isEnding) {
        setIsPaused(true);
        if (currentAudio) {
          currentAudio.pause();
        }
      }
    });

    newSocket.on('conversation-resumed', () => {
      if (!isEnding) {
        setIsPaused(false);
      }
    });

    // Listen for conversation end
    newSocket.on('conversation-ended', (data) => {
      if (!isEnding) {
        handleConversationEnd();
      }
    });

    // Listen for session end
    newSocket.on('session-ended', () => {
      if (!isEnding) {
        handleCallEnd();
      }
    });

    // Start conversation
    newSocket.emit('start-conversation', {
      sessionId,
      geminiApiKey,
      elevenLabsApiKey
    });

    return () => {
      // Cleanup on unmount
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (endingTimeoutRef.current) {
        clearTimeout(endingTimeoutRef.current);
      }
      newSocket.disconnect();
    };
  }, [sessionId, geminiApiKey, elevenLabsApiKey]);

  const playAudio = (audioBase64: string, duration: number) => {
    if (isEnding) return;
    
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
        if (!isEnding) {
          setActiveParticipant(null);
        }
        setCurrentAudio(null);
      };

      audio.onerror = () => {
        console.error('Audio playback error');
        URL.revokeObjectURL(audioUrl);
        if (!isEnding) {
          setActiveParticipant(null);
        }
        setCurrentAudio(null);
      };
      
      audio.play().catch(error => {
        console.error('Audio playback error:', error);
        if (!isEnding) {
          setActiveParticipant(null);
        }
        setCurrentAudio(null);
      });
    } catch (error) {
      console.error('Audio processing error:', error);
      if (!isEnding) {
        setActiveParticipant(null);
      }
    }
  };

  const toggleConversation = () => {
    if (!socket || isEnding) return;

    if (isPaused) {
      socket.emit('resume-conversation', sessionId);
      setIsPaused(false);
    } else {
      socket.emit('pause-conversation', sessionId);
      setIsPaused(true);
      if (currentAudio) {
        currentAudio.pause();
      }
    }
  };

  const toggleSpeaker = () => {
    if (isEnding) return;
    
    setIsSpeakerOn(!isSpeakerOn);
    if (!isSpeakerOn && currentAudio) {
      currentAudio.pause();
      setActiveParticipant(null);
    }
  };

  const getProgressPercentage = () => {
    return Math.min((messageCount / maxMessages) * 100, 100);
  };

  const getProgressColor = () => {
    const percentage = getProgressPercentage();
    if (percentage > 80) return 'bg-red-500';
    if (percentage > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl shadow-xl border border-slate-200 h-full flex flex-col overflow-hidden">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Expert Panel</h2>
              <div className="flex items-center space-x-3 mt-1">
                <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                  isCallActive && !isEnding ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
                }`}>
                  {isCallActive && !isEnding ? '🔴 Live' : isEnding ? '⏳ Ending...' : 'Ended'}
                </span>
                {conversationStatus === 'active' && !isEnding && (
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                    isPaused ? 'bg-yellow-500/20 text-yellow-100' : 'bg-blue-500/20 text-blue-100'
                  }`}>
                    {isPaused ? '⏸️ Paused' : '🎙️ Speaking'}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Discussion Stats */}
          <div className="text-right">
            <div className="flex items-center space-x-4 text-sm text-blue-100">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{formatTime(discussionTime)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageCircle className="w-4 h-4" />
                <span>{messageCount}/{maxMessages}</span>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="w-32 h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center space-x-3 mt-4">
          <button
            onClick={toggleConversation}
            disabled={!isCallActive || conversationStatus === 'ended' || isEnding}
            className={`p-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              isPaused 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
            title={isPaused ? 'Resume Discussion' : 'Pause Discussion'}
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleSpeaker}
            disabled={!isCallActive || isEnding}
            className={`p-3 rounded-xl transition-all duration-200 disabled:opacity-50 ${
              isSpeakerOn 
                ? 'bg-white/20 hover:bg-white/30 text-white' 
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={isSpeakerOn ? 'Mute Audio' : 'Unmute Audio'}
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={handleCallEnd}
            disabled={isEnding}
            className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="End Discussion"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

        {/* Error Display */}
        {routingError && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
            <p className="text-red-100 text-sm">{routingError}</p>
          </div>
        )}
      </div>

      {/* Participants Grid - Modern Design */}
      <div className="flex-1 p-8">
        <div className="grid grid-cols-2 gap-6 h-full">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className={`relative bg-white rounded-2xl p-6 border-2 transition-all duration-300 ${
                activeParticipant === participant.id && !isEnding
                  ? 'border-blue-400 shadow-lg scale-105 bg-gradient-to-br from-blue-50 to-white' 
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              {/* Speaking Animation */}
              {activeParticipant === participant.id && !isPaused && !isEnding && (
                <div className="absolute -top-2 -right-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
              )}

              {/* Avatar */}
              <div className="text-center mb-4">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl mb-3 mx-auto transition-all duration-300 ${
                  activeParticipant === participant.id && !isEnding
                    ? 'bg-gradient-to-br from-blue-100 to-purple-100 scale-110' 
                    : 'bg-slate-100'
                }`}>
                  {participant.avatar}
                </div>
                
                <h3 className="font-bold text-slate-800 mb-1">{participant.name}</h3>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${participant.color}`}>
                  {participant.role}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {participant.expertise}
                </div>
              </div>

              {/* Status Indicator */}
              <div className="text-center">
                {activeParticipant === participant.id && !isPaused && !isEnding ? (
                  <div className="space-y-2">
                    <div className="text-sm text-green-700 font-medium flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Speaking...</span>
                    </div>
                    <div className="flex justify-center space-x-1">
                      <div className="w-1 h-4 bg-green-500 rounded-full animate-pulse"></div>
                      <div className="w-1 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-5 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                    <span>Listening</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modern Status Footer */}
      <div className="bg-gradient-to-r from-slate-50 to-white border-t border-slate-200 p-6">
        <div className="text-center">
          <p className="text-sm text-slate-600 mb-2 font-medium">Current Discussion</p>
          <p className="text-lg font-bold text-slate-800 mb-3">
            {currentTopic}
          </p>
          
          {conversationStatus === 'preparing' && !isEnding && (
            <div className="inline-flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Analyzing content and preparing discussion...</span>
            </div>
          )}
          
          {conversationStatus === 'active' && activeParticipant && !isPaused && !isEnding && (
            <div className="inline-flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>{participants.find(p => p.id === activeParticipant)?.name} is analyzing...</span>
            </div>
          )}
          
          {isPaused && !isEnding && (
            <div className="inline-flex items-center space-x-2 text-sm text-yellow-600 bg-yellow-50 px-4 py-2 rounded-full">
              <Pause className="w-3 h-3" />
              <span>Discussion paused - Click play to resume</span>
            </div>
          )}
          
          {(conversationStatus === 'ended' || isEnding) && (
            <div className="inline-flex items-center space-x-2 text-sm text-slate-600 bg-slate-100 px-4 py-2 rounded-full">
              <span>{isEnding ? '⏳ Ending discussion...' : '✅ Expert discussion completed'}</span>
            </div>
          )}

          {messageCount >= maxMessages && !isEnding && (
            <div className="inline-flex items-center space-x-2 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-full mt-2">
              <MessageCircle className="w-3 h-3" />
              <span>Discussion limit reached - Wrapping up</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConferenceRoom;