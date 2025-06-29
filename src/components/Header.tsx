import React from 'react'
import { MessageCircle, Settings } from 'lucide-react'

interface HeaderProps {
  onShowApiKeys: () => void
}

const Header: React.FC<HeaderProps> = ({ onShowApiKeys }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Buddy
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={onShowApiKeys}
              className="flex items-center space-x-2 p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Configure API Keys"
            >
              <Settings className="w-5 h-5" />
              <span className="hidden sm:block text-sm font-medium">API Keys</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header