import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Users, PhoneOff, Pause, Play, Clock } from 'lucide-react';
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
  const [discussionTime, setDiscussionTime] = useState(0);
  const [maxDiscussionTime] = useState(15 * 60); // 15 minutes in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupRef = useRef<boolean>(false);

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
            // Auto-end discussion after 15 minutes
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
      }
    };
  }, [conversationStatus, isPaused, maxDiscussionTime]);

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
    if (socket) {
      socket.emit('end-session', sessionId);
      socket.disconnect();
      setSocket(null);
    }
    
    setActiveParticipant(null);
    setIsCallActive(false);
    setConversationStatus('ended');
  };

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Join session
    newSocket.emit('join-session', sessionId);

    // Listen for agent messages
    newSocket.on('agent-message', (data) => {
      if (cleanupRef.current) return;
      
      setActiveParticipant(data.agentId);
      setCurrentTopic('AI Expert Discussion in Progress');
      setConversationStatus('active');
      
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
      if (currentAudio) {
        currentAudio.pause();
      }
    });

    newSocket.on('conversation-resumed', () => {
      if (cleanupRef.current) return;
      setIsPaused(false);
    });

    // Listen for conversation end
    newSocket.on('conversation-ended', (data) => {
      if (cleanupRef.current) return;
      setConversationStatus('ended');
      setCurrentTopic(data.message);
      setActiveParticipant(null);
    });

    // Listen for session end
    newSocket.on('session-ended', () => {
      if (cleanupRef.current) return;
      setIsCallActive(false);
    });

    // Start conversation
    newSocket.emit('start-conversation', {
      sessionId,
      geminiApiKey,
      elevenLabsApiKey
    });

    return () => {
      cleanupResources();
    };
  }, [sessionId, geminiApiKey, elevenLabsApiKey]);

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
    if (!socket || cleanupRef.current) return;

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-medium text-slate-800">AI Expert Panel</h2>
            <span className={`px-2 py-1 text-xs rounded-full ${
              isCallActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isCallActive ? 'Live Discussion' : 'Ended'}
            </span>
            {conversationStatus === 'active' && (
              <span className={`px-2 py-1 text-xs rounded-full ${
                isPaused ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {isPaused ? 'Paused' : 'Speaking'}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Discussion Timer */}
            <div className="flex items-center space-x-1 text-sm">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className={getTimeColor()}>
                {formatTime(discussionTime)} / {formatTime(maxDiscussionTime)}
              </span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center space-x-2">
              {/* Pause/Resume Button */}
              <button
                onClick={toggleConversation}
                disabled={!isCallActive || conversationStatus === 'ended' || cleanupRef.current}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isPaused 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                }`}
                title={isPaused ? 'Resume Discussion' : 'Pause Discussion'}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>

              <button
                onClick={toggleSpeaker}
                disabled={!isCallActive || cleanupRef.current}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isSpeakerOn 
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
                title={isSpeakerOn ? 'Mute Audio' : 'Unmute Audio'}
              >
                {isSpeakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={handleEndCall}
                disabled={cleanupRef.current}
                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                title="End Discussion"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-2 gap-4 h-full">
          {participants.map((participant) => (
            <AIParticipant
              key={participant.id}
              participant={participant}
              isActive={activeParticipant === participant.id}
              isSpeaking={activeParticipant === participant.id && !isPaused}
            />
          ))}
        </div>
      </div>

      {/* Current Topic */}
      <div className="p-6 border-t border-slate-200 bg-slate-50">
        <div className="text-center">
          <p className="text-sm text-slate-600 mb-1">Current Discussion</p>
          <p className="text-lg font-medium text-slate-800">
            {currentTopic}
          </p>
          {conversationStatus === 'preparing' && (
            <div className="mt-2">
              <div className="inline-flex items-center space-x-2 text-sm text-slate-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Analyzing content and preparing discussion...</span>
              </div>
            </div>
          )}
          {conversationStatus === 'active' && activeParticipant && !isPaused && (
            <div className="mt-2">
              <div className="inline-flex items-center space-x-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>{participants.find(p => p.id === activeParticipant)?.name} is speaking...</span>
              </div>
            </div>
          )}
          {isPaused && (
            <div className="mt-2">
              <div className="inline-flex items-center space-x-2 text-sm text-yellow-600">
                <Pause className="w-3 h-3" />
                <span>Discussion paused - Click play to resume</span>
              </div>
            </div>
          )}
          {conversationStatus === 'ended' && (
            <div className="mt-2">
              <div className="inline-flex items-center space-x-2 text-sm text-slate-500">
                <span>✅ Expert discussion completed</span>
              </div>
            </div>
          )}
          {discussionTime >= maxDiscussionTime && (
            <div className="mt-2">
              <div className="inline-flex items-center space-x-2 text-sm text-red-600">
                <Clock className="w-3 h-3" />
                <span>Maximum discussion time reached</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConferenceRoom;