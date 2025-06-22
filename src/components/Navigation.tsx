import React, { useState } from 'react';
import { 
  Menu, 
  X,
  Zap
} from 'lucide-react';

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onAuthAction: (mode: 'signin' | 'signup') => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentPage, onPageChange, onAuthAction }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white/95 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              StudySnap
            </span>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={() => onAuthAction('signin')}
              className="text-gray-600 hover:text-gray-900 px-6 py-3 rounded-2xl font-semibold transition-all duration-300"
            >
              Sign In
            </button>
            <button 
              onClick={() => onAuthAction('signup')}
              className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Get Started
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900 p-2"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-gray-100">
            <div className="flex flex-col space-y-3">
              <button 
                onClick={() => {
                  onAuthAction('signin');
                  setIsMenuOpen(false);
                }}
                className="w-full text-gray-600 hover:text-gray-900 px-4 py-4 rounded-2xl font-semibold transition-all duration-300"
              >
                Sign In
              </button>
              <button 
                onClick={() => {
                  onAuthAction('signup');
                  setIsMenuOpen(false);
                }}
                className="w-full bg-gray-900 text-white px-4 py-4 rounded-2xl font-semibold"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;