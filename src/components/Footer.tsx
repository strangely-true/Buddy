import React from 'react';
import { Zap, ExternalLink } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900/50 backdrop-blur-xl border-t border-gray-700/30 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          {/* Left side - Copyright */}
          <div className="text-gray-400 text-sm">
            © 2024 Buddy AI Conference. All rights reserved.
          </div>
          
          {/* Right side - Built with Bolt badge */}
          <a
            href="https://bolt.new"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl hover:from-purple-500/20 hover:to-pink-500/20 hover:border-purple-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/10"
          >
            <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
              Built with Bolt
            </span>
            <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-purple-400 transition-colors" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;