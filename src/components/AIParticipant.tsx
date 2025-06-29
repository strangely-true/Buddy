import React from 'react';
import { Mic, MicOff } from 'lucide-react';

interface Participant {
  id: string;
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
    <div className={`relative bg-white rounded-2xl p-6 h-full transition-all duration-300 border-2 ${
      isActive 
        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-xl transform scale-105' 
        : 'border-slate-200 hover:border-slate-300 hover:shadow-lg'
    }`}>
      {/* Speaking Indicator */}
      {isSpeaking && (
        <div className="absolute top-4 right-4">
          <div className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
            <Mic className="w-3 h-3" />
            <span>Speaking</span>
            <div className="flex space-x-1">
              <div className="w-1 h-3 bg-white rounded-full animate-pulse" />
              <div className="w-1 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
              <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        </div>
      )}

      {/* Listening Indicator */}
      {isActive && !isSpeaking && (
        <div className="absolute top-4 right-4">
          <div className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
            <MicOff className="w-3 h-3" />
            <span>Listening</span>
          </div>
        </div>
      )}

      {/* Avatar and Info */}
      <div className="text-center h-full flex flex-col justify-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto transition-all duration-300 ${
          isActive 
            ? 'ring-4 ring-blue-300 shadow-lg transform scale-110' 
            : 'ring-2 ring-slate-200'
        } bg-white shadow-md`}>
          {participant.avatar}
        </div>
        
        <h3 className={`font-bold text-lg mb-2 transition-colors ${
          isActive ? 'text-blue-800' : 'text-slate-800'
        }`}>
          {participant.name}
        </h3>
        
        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${participant.color}`}>
          {participant.role}
        </div>

        {/* Status */}
        <div className="mt-auto">
          {isSpeaking ? (
            <div className="space-y-3">
              <div className="text-sm text-green-700 font-medium">Currently Speaking</div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full animate-pulse" style={{ width: '75%' }} />
              </div>
            </div>
          ) : isActive ? (
            <div className="text-sm text-blue-700 font-medium">Active & Listening</div>
          ) : (
            <div className="text-sm text-slate-500">Waiting</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIParticipant;