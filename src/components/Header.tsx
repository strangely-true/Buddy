import React from 'react'
import { MessageCircle, Settings, Sparkles } from 'lucide-react'

interface HeaderProps {
  onShowApiKeys: () => void
}

const Header: React.FC<HeaderProps> = ({ onShowApiKeys }) => {
  return (
    <header className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/50 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-xl blur-lg opacity-30 animate-pulse"></div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Buddy
              </span>
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={onShowApiKeys}
              className="group flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all duration-200 border border-gray-700/50 hover:border-gray-600/50"
              title="Configure API Keys"
            >
              <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              <span className="hidden sm:block text-sm font-medium">API Keys</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header