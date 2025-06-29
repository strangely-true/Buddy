import React from 'react';
import { Mic } from 'lucide-react';

interface Participant {
  id: number;
  name: string;
  role: string;
  avatar: string;
  color: string;
}

interface AIParticipantProps {
  participant: Participant;
  isActive: boolean;
  isSpeaking: boolean;
}

const AIParticipant: React.FC<AIParticipantProps> = ({ participant, isActive, isSpeaking }) => {
  return (
    <div className={`relative bg-slate-50 rounded-xl p-6 transition-all duration-300 ${
      isActive ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-slate-100'
    }`}>
      {/* Speaking Indicator */}
      {isSpeaking && (
        <div className="absolute top-3 right-3">
          <div className="flex items-center space-x-1">
            <Mic className="w-4 h-4 text-green-600" />
            <div className="flex space-x-1">
              <div className="w-1 h-4 bg-green-600 rounded-full animate-pulse" />
              <div className="w-1 h-3 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
              <div className="w-1 h-5 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        </div>
      )}

      {/* Avatar */}
      <div className="text-center mb-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-3 mx-auto ${
          isActive ? 'ring-4 ring-blue-300' : ''
        } bg-white shadow-sm`}>
          {participant.avatar}
        </div>
        
        <h3 className="font-medium text-slate-800 mb-1">{participant.name}</h3>
        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${participant.color}`}>
          {participant.role}
        </div>
      </div>

      {/* Speaking Status */}
      <div className="text-center">
        {isSpeaking ? (
          <div className="space-y-2">
            <div className="text-sm text-green-700 font-medium">Speaking...</div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full animate-pulse" style={{ width: '70%' }} />
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">Listening</div>
        )}
      </div>
    </div>
  );
};

export default AIParticipant;