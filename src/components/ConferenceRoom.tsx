import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Users, Phone, PhoneOff } from 'lucide-react';
import AIParticipant from './AIParticipant';
import { aiService } from '../services/aiService';

interface ConferenceRoomProps {
  onEndCall: () => void;
}

const ConferenceRoom: React.FC<ConferenceRoomProps> = ({ onEndCall }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [activeParticipant, setActiveParticipant] = useState<number | null>(null);
  const [currentTopic, setCurrentTopic] = useState('Analyzing your content and preparing discussion...');
  const [isCallActive, setIsCallActive] = useState(true);
  const [conversationStarted, setConversationStarted] = useState(false);

  const participants = [
    { id: 1, name: 'Dr. Sarah Chen', role: 'Research Analyst', avatar: '👩‍🔬', color: 'bg-purple-100 text-purple-800', agentId: 'chen' },
    { id: 2, name: 'Marcus Thompson', role: 'Strategy Expert', avatar: '👨‍💼', color: 'bg-blue-100 text-blue-800', agentId: 'thompson' },
    { id: 3, name: 'Prof. Elena Rodriguez', role: 'Domain Specialist', avatar: '👩‍🏫', color: 'bg-green-100 text-green-800', agentId: 'rodriguez' },
    { id: 4, name: 'Alex Kim', role: 'Innovation Lead', avatar: '👨‍💻', color: 'bg-orange-100 text-orange-800', agentId: 'kim' },
  ];

  // Start conversation after component mounts
  useEffect(() => {
    const startConversation = async () => {
      try {
        const starter = await aiService.generateConversationStarter();
        setCurrentTopic('AI Conference Discussion in Progress');
        setConversationStarted(true);
        
        // Start the conversation flow
        setTimeout(() => {
          setActiveParticipant(0); // Dr. Chen starts
        }, 1000);
      } catch (error) {
        console.error('Failed to start conversation:', error);
        setCurrentTopic('Discussion ready - waiting for participants');
      }
    };

    if (!conversationStarted) {
      startConversation();
    }
  }, [conversationStarted]);

  // Simulate conversation flow between AI agents
  useEffect(() => {
    if (!conversationStarted || !isCallActive) return;

    const interval = setInterval(async () => {
      const nextParticipant = Math.floor(Math.random() * participants.length);
      setActiveParticipant(nextParticipant);
      
      try {
        const participant = participants[nextParticipant];
        await aiService.generateAgentResponse(participant.agentId, currentTopic);
      } catch (error) {
        console.error('Failed to generate agent response:', error);
      }

      // Clear active participant after speaking
      setTimeout(() => {
        setActiveParticipant(null);
      }, 3000);
    }, 6000);

    return () => clearInterval(interval);
  }, [conversationStarted, isCallActive, currentTopic, participants]);

  const handleEndCall = () => {
    setIsCallActive(false);
    aiService.clearConversation();
    onEndCall();
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
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
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
          {participants.map((participant, index) => (
            <AIParticipant
              key={participant.id}
              participant={participant}
              isActive={activeParticipant === index}
              isSpeaking={activeParticipant === index}
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
          {!conversationStarted && (
            <div className="mt-2">
              <div className="inline-flex items-center space-x-2 text-sm text-slate-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Preparing AI agents...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConferenceRoom;