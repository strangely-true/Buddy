import React, { useState } from 'react'
import { MessageCircle, Settings, LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import UserMenu from './auth/UserMenu'
import AuthModal from './auth/AuthModal'

interface HeaderProps {
  onShowApiKeys?: () => void
}

const Header: React.FC<HeaderProps> = ({ onShowApiKeys }) => {
  const { user } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <>
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
              {onShowApiKeys && (
                <button 
                  onClick={onShowApiKeys}
                  className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Configure API Keys"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}
              
              {user ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  )
}

export default Header