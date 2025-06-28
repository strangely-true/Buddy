import React, { useState, useRef, useEffect } from 'react'
import { User, LogOut, Settings, History, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface UserMenuProps {
  onShowSettings?: () => void
}

const UserMenu: React.FC<UserMenuProps> = ({ onShowSettings }) => {
  const { user, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsOpen(false)
      // Force page reload to clear any cached state
      window.location.reload()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handleSettings = () => {
    setIsOpen(false)
    if (onShowSettings) {
      onShowSettings()
    }
  }

  if (!user) return null

  const userDisplayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
  const userAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden">
          {userAvatar ? (
            <img src={userAvatar} alt={userDisplayName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-white" />
          )}
        </div>
        <span className="text-sm font-medium text-gray-700 hidden sm:block">
          {userDisplayName}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{userDisplayName}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          
          <div className="py-1">
            <button className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <History className="w-4 h-4" />
              <span>Conference History</span>
            </button>
            <button 
              onClick={handleSettings}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>

          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMenu