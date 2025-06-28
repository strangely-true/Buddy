import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Users, PhoneOff } from 'lucide-react';
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
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [activeParticipant, setActiveParticipant] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState('Preparing AI conference...');
  const [isCallActive, setIsCallActive] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [conversationStatus, setConversationStatus] = useState('preparing');

  const participants = [
    { id: 'chen', name: 'Dr. Sarah Chen', role: 'Research Analyst', avatar: '👩‍🔬', color: 'bg-purple-100 text-purple-800' },
    { id: 'thompson', name: 'Marcus Thompson', role: 'Strategy Expert', avatar: '👨‍💼', color: 'bg-blue-100 text-blue-800' },
    { id: 'rodriguez', name: 'Prof. Elena Rodriguez', role: 'Domain Specialist', avatar: '👩‍🏫', color: 'bg-green-100 text-green-800' },
    { id: 'kim', name: 'Alex Kim', role: 'Innovation Lead', avatar: '👨‍💻', color: 'bg-orange-100 text-orange-800' },
  ];

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Join session
    newSocket.emit('join-session', sessionId);

    // Listen for agent messages
    newSocket.on('agent-message', (data) => {
      setActiveParticipant(data.agentId);
      setCurrentTopic('AI Conference Discussion in Progress');
      setConversationStatus('active');
      
      // Play audio if available and speaker is on
      if (data.audio && isSpeakerOn) {
        playAudio(data.audio, data.audioDuration || 5000);
      } else if (data.audioDuration) {
        // Even without audio, simulate the speaking duration
        setTimeout(() => {
          setActiveParticipant(null);
        }, data.audioDuration);
      } else {
        // Default timeout if no duration provided
        setTimeout(() => {
          setActiveParticipant(null);
        }, 5000);
      }
    });

    // Listen for conversation end
    newSocket.on('conversation-ended', (data) => {
      setConversationStatus('ended');
      setCurrentTopic(data.message);
      setActiveParticipant(null);
    });

    // Listen for session end
    newSocket.on('session-ended', () => {
      setIsCallActive(false);
    });

    // Start conversation
    newSocket.emit('start-conversation', {
      sessionId,
      geminiApiKey,
      elevenLabsApiKey
    });

    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
      }
      newSocket.disconnect();
    };
  }, [sessionId, geminiApiKey, elevenLabsApiKey]);

  const playAudio = (audioBase64: string, duration: number) => {
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
        setActiveParticipant(null);
        setCurrentAudio(null);
      };

      audio.onerror = () => {
        console.error('Audio playback error');
        URL.revokeObjectURL(audioUrl);
        setActiveParticipant(null);
        setCurrentAudio(null);
      };
      
      audio.play().catch(error => {
        console.error('Audio playback error:', error);
        setActiveParticipant(null);
        setCurrentAudio(null);
      });
    } catch (error) {
      console.error('Audio processing error:', error);
      setActiveParticipant(null);
    }
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
    }
    if (socket) {
      socket.emit('end-session', sessionId);
      socket.disconnect();
    }
    onEndCall();
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
            <h2 className="text-lg font-medium text-slate-800">AI Conference Room</h2>
            <span className={`px-2 py-1 text-xs rounded-full ${
              isCallActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isCallActive ? 'Live' : 'Ended'}
            </span>
            {conversationStatus === 'active' && (
              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                Speaking
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleSpeaker}
              className={`p-2 rounded-lg transition-colors ${
                isSpeakerOn 
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
              title={isSpeakerOn ? 'Mute Speaker' : 'Unmute Speaker'}
            >
              {isSpeakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-lg transition-colors ${
                !isMuted 
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {!isMuted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <button
              onClick={handleEndCall}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              title="End Call"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
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
              isSpeaking={activeParticipant === participant.id}
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
                <span>Starting conversation...</span>
              </div>
            </div>
          )}
          {conversationStatus === 'active' && activeParticipant && (
            <div className="mt-2">
              <div className="inline-flex items-center space-x-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>{participants.find(p => p.id === activeParticipant)?.name} is speaking...</span>
              </div>
            </div>
          )}
          {conversationStatus === 'ended' && (
            <div className="mt-2">
              <div className="inline-flex items-center space-x-2 text-sm text-slate-500">
                <span>✅ Discussion completed</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConferenceRoom;