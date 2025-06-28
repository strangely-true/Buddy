import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Users } from 'lucide-react';
import AIParticipant from './AIParticipant';

const ConferenceRoom: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [activeParticipant, setActiveParticipant] = useState<number | null>(null);

  const participants = [
    { id: 1, name: 'Dr. Sarah Chen', role: 'Research Analyst', avatar: '👩‍🔬', color: 'bg-purple-100 text-purple-800' },
    { id: 2, name: 'Marcus Thompson', role: 'Strategy Expert', avatar: '👨‍💼', color: 'bg-blue-100 text-blue-800' },
    { id: 3, name: 'Prof. Elena Rodriguez', role: 'Domain Specialist', avatar: '👩‍🏫', color: 'bg-green-100 text-green-800' },
    { id: 4, name: 'Alex Kim', role: 'Innovation Lead', avatar: '👨‍💻', color: 'bg-orange-100 text-orange-800' },
  ];

  // Simulate conversation flow
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveParticipant(prev => {
        const next = prev === null ? 0 : (prev + 1) % participants.length;
        return Math.random() > 0.3 ? next : null;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [participants.length]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-medium text-slate-800">AI Conference Room</h2>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Live
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
            >
              {!isMuted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
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
            Analyzing the implications of your uploaded content
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConferenceRoom;