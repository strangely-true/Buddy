import React, { useState } from 'react';
import Header from './components/Header';
import ConferenceRoom from './components/ConferenceRoom';
import FileUpload from './components/FileUpload';
import ChatInterface from './components/ChatInterface';
import { SessionProvider } from './contexts/SessionContext';

function App() {
  const [hasSession, setHasSession] = useState(false);

  return (
    <SessionProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        
        {!hasSession ? (
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-6xl font-light text-slate-800 mb-4">
                  Welcome to <span className="font-medium text-blue-600">Buddy</span>
                </h1>
                <p className="text-xl text-slate-600 mb-8">
                  Transform your documents into engaging AI conversations
                </p>
              </div>
              
              <FileUpload onSessionStart={() => setHasSession(true)} />
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-4 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
              <div className="lg:col-span-2">
                <ConferenceRoom />
              </div>
              <div className="lg:col-span-1">
                <ChatInterface />
              </div>
            </div>
          </div>
        )}
      </div>
    </SessionProvider>
  );
}

export default App;