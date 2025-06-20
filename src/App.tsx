import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Navigation from './components/Navigation';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import { useAuth } from './hooks/useAuth';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { user, loading } = useAuth();

  // Redirect to dashboard if user is authenticated
  useEffect(() => {
    if (user && currentPage === 'home') {
      setCurrentPage('dashboard');
    }
  }, [user, currentPage]);

  const handleAuthAction = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleNavigation = (page: string) => {
    // If user tries to access protected pages without auth, show login
    if (!user && ['dashboard', 'quiz-generator', 'study-rooms', 'marketplace', 'profile', 'bookmarks', 'materials', 'achievements', 'schedule', 'community', 'settings', 'help'].includes(page)) {
      handleAuthAction('signin');
      return;
    }
    setCurrentPage(page);
  };

  const renderPage = () => {
    // Show loading state
    if (loading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    // If user is authenticated, show dashboard for protected routes
    if (user && ['dashboard', 'quiz-generator', 'study-rooms', 'marketplace', 'profile', 'bookmarks', 'materials', 'achievements', 'schedule', 'community', 'settings', 'help'].includes(currentPage)) {
      return <Dashboard currentPage={currentPage} onNavigate={handleNavigation} />;
    }

    // Show landing page for public routes
    switch (currentPage) {
      case 'home':
        return <LandingPage onAuthAction={handleAuthAction} />;
      default:
        return <LandingPage onAuthAction={handleAuthAction} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!user && currentPage === 'home' && (
        <Navigation 
          currentPage={currentPage} 
          onPageChange={handleNavigation}
          onAuthAction={handleAuthAction}
        />
      )}
      
      {renderPage()}
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
      
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default App;