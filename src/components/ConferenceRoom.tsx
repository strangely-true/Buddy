import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Users, PhoneOff, Pause, Play, Clock, MessageCircle, Mic, Sparkles, AlertTriangle } from 'lucide-react';
import io, { Socket } from 'socket.io-client';
import { getSocketUrl } from '../config/api';

interface ConferenceRoomProps {
  onEndCall: () => void;
  sessionId: string;
  geminiApiKey: string;
  elevenLabsApiKey: string;
  onConversationEnd: () => void;
}

const ConferenceRoom: React.FC<ConferenceRoomProps> = ({ 
  onEndCall, 
  sessionId, 
  geminiApiKey, 
  elevenLabsApiKey,
  onConversationEnd
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
  const [maxMessages] = useState(15);
  const [discussionTime, setDiscussionTime] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const participants = [
    { 
      id: 'chen', 
      name: 'Dr. Sarah Chen', 
      role: 'Research Analyst', 
      avatar: '👩‍🔬', 
      color: 'from-purple-500 to-indigo-500',
      expertise: 'Data & Research'
    },
    { 
      id: 'thompson', 
      name: 'Marcus Thompson', 
      role: 'Strategy Expert', 
      avatar: '👨‍💼', 
      color: 'from-blue-500 to-cyan-500',
      expertise: 'Business Strategy'
    },
    { 
      id: 'rodriguez', 
      name: 'Prof. Elena Rodriguez', 
      role: 'Domain Specialist', 
      avatar: '👩‍🏫', 
      color: 'from-green-500 to-emerald-500',
      expertise: 'Academic Theory'
    },
    { 
      id: 'kim', 
      name: 'Alex Kim', 
      role: 'Innovation Lead', 
      avatar: '👨‍💻', 
      color: 'from-orange-500 to-red-500',
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

  useEffect(() => {
    if (isEnding) return;

    // Initialize socket connection
    try {
      const newSocket = io(getSocketUrl());
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Connected to backend');
        setConnectionError(false);
        // Join session
        newSocket.emit('join-session', sessionId);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnectionError(true);
        setCurrentTopic('Backend server not connected - limited functionality');
      });

      // Listen for agent messages
      newSocket.on('agent-message', (data) => {
        if (isEnding) return;
        
        setActiveParticipant(data.agentId);
        setCurrentTopic('AI Expert Discussion in Progress');
        setConversationStatus('active');
        setMessageCount(prev => prev + 1);
        
        if (data.audio && isSpeakerOn && !isPaused && !isEnding) {
          playAudio(data.audio, data.audioDuration || 5000);
        } else if (data.audioDuration) {
          setTimeout(() => {
            if (!isEnding) {
              setActiveParticipant(null);
            }
          }, data.audioDuration);
        } else {
          setTimeout(() => {
            if (!isEnding) {
              setActiveParticipant(null);
            }
          }, 5000);
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
        if (isEnding) return;
        
        console.log('Conversation ended naturally');
        handleConversationEnd();
      });

      // Listen for session end
      newSocket.on('session-ended', () => {
        if (!isEnding) {
          console.log('Session ended');
          handleConversationEnd();
        }
      });

      // Start conversation only if connected
      if (!connectionError) {
        newSocket.emit('start-conversation', {
          sessionId,
          geminiApiKey,
          elevenLabsApiKey
        });
      }

      return () => {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.src = '';
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        newSocket.disconnect();
      };
    } catch (error) {
      console.error('Failed to initialize socket connection:', error);
      setConnectionError(true);
      setCurrentTopic('Backend server not available');
    }
  }, [sessionId, geminiApiKey, elevenLabsApiKey]);

  const handleConversationEnd = () => {
    if (isEnding) return;
    
    console.log('Handling conversation end');
    setIsEnding(true);
    setIsCallActive(false);
    
    // Stop any playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
    }
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Disconnect socket
    if (socket) {
      socket.disconnect();
    }
    
    // End the conversation and go back to upload
    setTimeout(() => {
      onConversationEnd();
    }, 1000);
  };

  const playAudio = (audioBase64: string, duration: number) => {
    if (isEnding) return;
    
    try {
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
    if (!socket || isEnding || connectionError) return;

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

  const handleEndCall = () => {
    if (isEnding) return;
    
    console.log('Manual end call triggered');
    
    if (socket && !connectionError) {
      socket.emit('end-session', sessionId);
    }
    
    handleConversationEnd();
  };

  const toggleSpeaker = () => {
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

  if (isEnding) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700/50 h-full flex flex-col items-center justify-center shadow-2xl">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Discussion Complete!</h2>
          <p className="text-gray-300 mb-6 text-lg">
            The AI experts have concluded their discussion. You'll be redirected to start a new conversation.
          </p>
          <div className="text-sm text-gray-400 bg-gray-700/50 rounded-xl p-4 inline-block">
            Duration: {formatTime(discussionTime)} • Messages: {messageCount}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700/50 h-full flex flex-col overflow-hidden shadow-2xl">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 backdrop-blur-xl text-white p-6 border-b border-gray-600/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">AI Expert Panel</h2>
              <div className="flex items-center space-x-4 mt-1">
                <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                  isCallActive && !connectionError ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {isCallActive && !connectionError ? '🔴 Live' : connectionError ? '⚠️ Offline' : 'Ended'}
                </span>
                {conversationStatus === 'active' && !connectionError && (
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                    isPaused ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {isPaused ? '⏸️ Paused' : '🎙️ Speaking'}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Discussion Stats */}
          <div className="text-right">
            <div className="flex items-center space-x-6 text-sm text-gray-300">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>{formatTime(discussionTime)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-4 h-4" />
                <span>{messageCount}/{maxMessages}</span>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="w-32 h-2 bg-gray-600/50 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        </div>

        {/* Connection Error Warning */}
        {connectionError && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="text-sm text-red-300">
              <strong>Backend Disconnected:</strong> Deploy the backend server to enable full AI discussion features.
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-center space-x-4 mt-6">
          <button
            onClick={toggleConversation}
            disabled={!isCallActive || conversationStatus === 'ended' || isEnding || connectionError}
            className={`p-4 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              isPaused 
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg' 
                : 'bg-gray-700/50 hover:bg-gray-600/50 text-white border border-gray-600/50'
            }`}
            title={isPaused ? 'Resume Discussion' : 'Pause Discussion'}
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleSpeaker}
            disabled={!isCallActive || isEnding}
            className={`p-4 rounded-2xl transition-all duration-200 disabled:opacity-50 ${
              isSpeakerOn 
                ? 'bg-gray-700/50 hover:bg-gray-600/50 text-white border border-gray-600/50' 
                : 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
            }`}
            title={isSpeakerOn ? 'Mute Audio' : 'Unmute Audio'}
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={handleEndCall}
            disabled={isEnding}
            className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl transition-all duration-200 disabled:opacity-50 shadow-lg"
            title="End Discussion"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Participants Grid - Modern Design */}
      <div className="flex-1 p-8">
        <div className="grid grid-cols-2 gap-6 h-full">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className={`relative bg-gray-700/30 backdrop-blur-sm rounded-3xl p-6 border transition-all duration-300 ${
                activeParticipant === participant.id && !connectionError
                  ? 'border-purple-500/50 shadow-lg shadow-purple-500/20 scale-105 bg-gradient-to-br from-purple-500/10 to-pink-500/10' 
                  : 'border-gray-600/30 hover:border-gray-500/50 hover:shadow-lg'
              }`}
            >
              {/* Speaking Animation */}
              {activeParticipant === participant.id && !isPaused && !isEnding && !connectionError && (
                <div className="absolute -top-2 -right-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                    <Mic className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              {/* Avatar */}
              <div className="text-center mb-6">
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-4xl mb-4 mx-auto transition-all duration-300 shadow-lg ${
                  activeParticipant === participant.id && !connectionError
                    ? `bg-gradient-to-br ${participant.color} scale-110 shadow-xl` 
                    : 'bg-gray-600/50'
                }`}>
                  {participant.avatar}
                </div>
                
                <h3 className="font-bold text-white mb-2 text-lg">{participant.name}</h3>
                <div className={`inline-block px-4 py-2 rounded-xl text-sm font-medium mb-3 bg-gradient-to-r ${participant.color} text-white`}>
                  {participant.role}
                </div>
                <div className="text-sm text-gray-300 font-medium">
                  {participant.expertise}
                </div>
              </div>

              {/* Status Indicator */}
              <div className="text-center">
                {activeParticipant === participant.id && !isPaused && !isEnding && !connectionError ? (
                  <div className="space-y-3">
                    <div className="text-sm text-green-300 font-medium flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>Speaking...</span>
                    </div>
                    <div className="flex justify-center space-x-1">
                      <div className="w-1 h-6 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="w-1 h-4 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-8 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1 h-3 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <span>{connectionError ? 'Offline' : 'Listening'}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modern Status Footer */}
      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 border-t border-gray-600/30 p-6">
        <div className="text-center">
          <p className="text-sm text-gray-300 mb-2 font-medium flex items-center justify-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>Current Discussion</span>
          </p>
          <p className="text-lg font-bold text-white mb-4">
            {currentTopic}
          </p>
          
          {conversationStatus === 'preparing' && !connectionError && (
            <div className="inline-flex items-center space-x-2 text-sm text-blue-300 bg-blue-500/20 px-4 py-2 rounded-full border border-blue-500/30">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>Analyzing content and preparing discussion...</span>
            </div>
          )}
          
          {conversationStatus === 'active' && activeParticipant && !isPaused && !isEnding && !connectionError && (
            <div className="inline-flex items-center space-x-2 text-sm text-green-300 bg-green-500/20 px-4 py-2 rounded-full border border-green-500/30">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>{participants.find(p => p.id === activeParticipant)?.name} is analyzing...</span>
            </div>
          )}
          
          {isPaused && !isEnding && !connectionError && (
            <div className="inline-flex items-center space-x-2 text-sm text-yellow-300 bg-yellow-500/20 px-4 py-2 rounded-full border border-yellow-500/30">
              <Pause className="w-3 h-3" />
              <span>Discussion paused - Click play to resume</span>
            </div>
          )}

          {connectionError && (
            <div className="inline-flex items-center space-x-2 text-sm text-red-300 bg-red-500/20 px-4 py-2 rounded-full border border-red-500/30">
              <AlertTriangle className="w-3 h-3" />
              <span>Backend server required for AI discussion features</span>
            </div>
          )}

          {messageCount >= maxMessages && !isEnding && !connectionError && (
            <div className="inline-flex items-center space-x-2 text-sm text-red-300 bg-red-500/20 px-4 py-2 rounded-full mt-2 border border-red-500/30">
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