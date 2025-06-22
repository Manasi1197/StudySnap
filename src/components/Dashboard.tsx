import React from 'react';
import { 
  Brain, 
  Users, 
  Trophy, 
  TrendingUp, 
  Camera, 
  MessageSquare,
  DollarSign,
  Star,
  Clock,
  BookOpen,
  Target,
  Zap,
  ArrowRight,
  Sparkles,
  Home,
  GraduationCap,
  FileText,
  Award,
  Folder,
  HelpCircle,
  Settings,
  Moon,
  Search,
  Bell,
  MoreHorizontal,
  Play,
  CheckCircle,
  Circle,
  LogOut
} from 'lucide-react';
import QuizGenerator from './QuizGenerator';
import AudioPlayer from './AudioPlayer';
import FlashcardsViewer from './FlashcardsViewer';
import QuizTaker from './QuizTaker';
import StudyRoom from './StudyRoom';
import MaterialsManager from './MaterialsManager';
import AchievementsManager from './AchievementsManager';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface DashboardProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentPage = 'dashboard', onNavigate }) => {
  const { user, signOut } = useAuth();
  const [currentSubPage, setCurrentSubPage] = React.useState<string | null>(null);
  const [subPageData, setSubPageData] = React.useState<any>(null);
  const [quizGeneratorState, setQuizGeneratorState] = React.useState<any>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      if (onNavigate) {
        onNavigate('home');
      }
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  const handleSubPageNavigation = (page: string, data?: any) => {
    // Store the complete quiz data when navigating to any sub-page
    if (data && data.quiz) {
      setQuizGeneratorState({
        quiz: data.quiz,
        audioUrl: data.audioUrl || null
      });
    }
    
    setCurrentSubPage(page);
    setSubPageData(data);
  };

  const handleBackToQuizOverview = () => {
    // Return to the quiz overview (review step) with preserved state
    setCurrentSubPage(null);
    setSubPageData(null);
    // The QuizGenerator will remain in 'review' state showing the overview
  };

  const handleNavigateFromSubPage = (targetView: 'audio' | 'flashcards' | 'take-quiz') => {
    if (!quizGeneratorState || !quizGeneratorState.quiz) {
      toast.error('Quiz data not available. Returning to overview.');
      handleBackToQuizOverview();
      return;
    }

    const quiz = quizGeneratorState.quiz;
    const audioUrl = quizGeneratorState.audioUrl;

    switch (targetView) {
      case 'audio':
        setCurrentSubPage('audio-player');
        setSubPageData({
          quiz: quiz,
          audioUrl: audioUrl || 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
          title: quiz.title,
          description: quiz.description
        });
        break;
      
      case 'flashcards':
        setCurrentSubPage('flashcards');
        setSubPageData({
          quiz: quiz,
          audioUrl: audioUrl,
          title: quiz.title,
          flashcards: quiz.flashcards
        });
        break;
      
      case 'take-quiz':
        setCurrentSubPage('take-quiz');
        setSubPageData({
          quiz: quiz,
          audioUrl: audioUrl
        });
        break;
    }
  };

  const sidebarItems = [
    { icon: Home, label: 'Home', page: 'dashboard' },
    { icon: Brain, label: 'Quiz Generator', page: 'quiz-generator' },
    { icon: Users, label: 'Study Rooms', page: 'study-rooms' },
    { icon: FileText, label: 'Materials', page: 'materials' },
    { icon: Award, label: 'Achievements', page: 'achievements' },
    { icon: DollarSign, label: 'Marketplace', page: 'marketplace' },
  ];

  const bottomSidebarItems = [
    { icon: Settings, label: 'Settings', page: 'settings' },
    { icon: HelpCircle, label: 'Help Center', page: 'help' },
    { icon: Moon, label: 'Dark Mode', page: 'dark-mode' },
  ];

  const statsCards = [
    {
      number: '24',
      label: 'Quizzes Created',
      icon: Brain,
      color: 'bg-teal-500',
      action: 'View details'
    },
    {
      number: '56',
      label: 'Study Sessions',
      icon: Clock,
      color: 'bg-purple-500',
      action: 'View details'
    },
    {
      number: '17',
      label: 'Achievements',
      icon: Trophy,
      color: 'bg-orange-500',
      action: 'View details'
    }
  ];

  const continuelearning = [
    {
      title: 'Biology Fundamentals',
      level: 'Advanced',
      duration: '5 hours',
      progress: 30,
      status: 'In Progress',
      icon: '🧬',
      color: 'bg-cyan-500'
    },
    {
      title: 'Calculus Mastery',
      level: 'Intermediate',
      duration: '6 hours',
      progress: 70,
      status: 'In Progress',
      icon: '📐',
      color: 'bg-purple-500'
    },
    {
      title: 'Chemistry Basics',
      level: 'Beginner',
      duration: '7 hours',
      progress: 100,
      status: 'Completed',
      icon: '⚗️',
      color: 'bg-gray-800'
    }
  ];

  const recommendations = [
    {
      title: 'AI Quiz Workshop',
      description: 'Master your skills in creating AI-powered quizzes and learn how to optimize learning outcomes.',
      level: 'Advanced',
      duration: '6 hours',
      rating: 4.9,
      reviews: '1.85K',
      color: 'bg-teal-600',
      icon: '🎯'
    },
    {
      title: 'Study Room Facilitation',
      description: 'Procreate Dreams has transformed my ability to make animations from my art. Yet when I first opened...',
      level: 'Beginner',
      duration: '6 hours',
      rating: 4.9,
      reviews: '1.89K',
      color: 'bg-orange-500',
      icon: '🎨'
    },
    {
      title: 'Monetization Strategies',
      description: 'Master your skills in selling study materials and learn how to promote collaboration and find...',
      level: 'Intermediate',
      duration: '6 hours',
      rating: 4.9,
      reviews: '1.89K',
      color: 'bg-blue-600',
      icon: '💰'
    }
  ];

  const handleNavigation = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  const renderMainContent = () => {
    // Handle sub-pages for quiz generator
    if (currentPage === 'quiz-generator') {
      if (currentSubPage === 'audio-player' && subPageData) {
        return (
          <AudioPlayer
            title={subPageData.title}
            description={subPageData.description}
            audioUrl={subPageData.audioUrl}
            onBack={handleBackToQuizOverview}
            onNavigate={handleNavigateFromSubPage}
            quizData={subPageData.quiz}
          />
        );
      }
      
      if (currentSubPage === 'flashcards' && subPageData) {
        return (
          <FlashcardsViewer
            title={subPageData.title}
            flashcards={subPageData.flashcards}
            onBack={handleBackToQuizOverview}
            onNavigate={handleNavigateFromSubPage}
            quizData={subPageData.quiz}
          />
        );
      }

      if (currentSubPage === 'take-quiz' && subPageData) {
        return (
          <QuizTaker
            quiz={subPageData.quiz}
            onBack={handleBackToQuizOverview}
            onNavigate={handleNavigateFromSubPage}
          />
        );
      }
      
      return (
        <QuizGenerator 
          onNavigate={handleSubPageNavigation} 
          initialGeneratedQuiz={quizGeneratorState?.quiz}
        />
      );
    }

    switch (currentPage) {
      case 'study-rooms':
        return <StudyRoom onNavigate={handleNavigation} />;
      case 'materials':
        return <MaterialsManager onNavigate={handleNavigation} />;
      case 'achievements':
        return <AchievementsManager onNavigate={handleNavigation} />;
      case 'marketplace':
        return (
          <div className="text-center pt-20">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Marketplace</h1>
            <p className="text-xl text-gray-600">Monetize your study materials - feature in development!</p>
          </div>
        );
      case 'settings':
        return (
          <div className="text-center pt-20">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Settings</h1>
            <p className="text-xl text-gray-600">Customize your learning experience - coming soon!</p>
          </div>
        );
      case 'help':
        return (
          <div className="text-center pt-20">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
            <p className="text-xl text-gray-600">Get support and learn how to use StudySnap - coming soon!</p>
          </div>
        );
      default:
        return (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {statsCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div key={index} className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{card.number}</div>
                    <div className="text-sm text-gray-600 mb-4">{card.label}</div>
                    <button className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      {card.action}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Continue Learning */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Continue Learning</h2>
                  <button className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    See All
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-500 pb-2">
                    <div>Course Name</div>
                    <div>Progress</div>
                    <div>Status</div>
                    <div></div>
                  </div>
                  {continuelearning.map((course, index) => (
                    <div key={index} className="grid grid-cols-4 gap-4 items-center py-4 border-t border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${course.color} rounded-lg flex items-center justify-center text-white text-lg`}>
                          {course.icon}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{course.title}</div>
                          <div className="text-sm text-gray-500">{course.level} • {course.duration}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${course.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-600">{course.progress}%</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {course.status === 'Completed' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-orange-500" />
                        )}
                        <span className={`text-sm font-medium ${
                          course.status === 'Completed' ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {course.status}
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <ArrowRight className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended for you */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Recommended for you</h2>
                  <button className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    See All
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="group cursor-pointer">
                      <div className={`${rec.color} rounded-xl p-8 mb-4 group-hover:scale-105 transition-transform duration-300`}>
                        <div className="text-4xl mb-4">{rec.icon}</div>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors">
                        {rec.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {rec.description}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span>{rec.level}</span>
                          <span>{rec.duration}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="font-medium">{rec.rating}</span>
                          <span>({rec.reviews})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  // Check if we're in a sub-page that should hide the sidebar
  const isInSubPage = currentPage === 'quiz-generator' && currentSubPage;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Hide only for Quiz Generator sub-pages */}
      {!isInSubPage && (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">StudyHub</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 py-6">
            <nav className="px-4 space-y-1">
              {sidebarItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = currentPage === item.page;
                return (
                  <button
                    key={index}
                    onClick={() => handleNavigation(item.page)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Navigation */}
          <div className="p-4 border-t border-gray-200">
            <nav className="space-y-1">
              {bottomSidebarItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = currentPage === item.page;
                return (
                  <button
                    key={index}
                    onClick={() => handleNavigation(item.page)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header - Show for all pages except Quiz Generator sub-pages */}
        {!isInSubPage && (
          <header className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'}! 👋
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Search className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                <div className="flex items-center space-x-3">
                  <img
                    src="https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"
                    alt="Profile"
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'}
                    </div>
                    <div className="text-gray-500">Basic Member</div>
                  </div>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Dashboard Content */}
        <main className={`flex-1 ${!isInSubPage && currentPage !== 'quiz-generator' && currentPage !== 'study-rooms' && currentPage !== 'materials' && currentPage !== 'achievements' ? 'p-8' : ''}`}>
          {/* Conditional container width based on current page */}
          {currentPage === 'quiz-generator' || isInSubPage || currentPage === 'study-rooms' || currentPage === 'materials' || currentPage === 'achievements' ? (
            // Full width for Quiz Generator, sub-pages, Study Rooms, Materials, and Achievements
            <div className="w-full">
              {renderMainContent()}
            </div>
          ) : (
            // Constrained width for other pages with sidebar layout
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-4 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-3">
                  {renderMainContent()}
                </div>

                {/* Right Sidebar - Only show on dashboard home */}
                {currentPage === 'dashboard' && (
                  <div className="space-y-6">
                    {/* Progress Card */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900">Progress</h3>
                        <button className="p-1">
                          <MoreHorizontal className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                      <div className="text-center mb-6">
                        <img
                          src="https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"
                          alt="Profile"
                          className="w-16 h-16 rounded-full mx-auto mb-4"
                        />
                        <h4 className="font-bold text-gray-900">
                          {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'}
                        </h4>
                        <p className="text-sm text-gray-500">Basic Member</p>
                      </div>
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold text-gray-900">30</span>
                          <select className="text-sm text-gray-500 border-none bg-transparent">
                            <option>This week</option>
                          </select>
                        </div>
                        <p className="text-sm text-gray-500">Hours spend</p>
                      </div>
                      <div className="space-y-2">
                        {[30, 15, 25, 35, 28, 32, 30].map((height, index) => (
                          <div key={index} className="flex items-end space-x-1">
                            <div 
                              className="bg-teal-500 rounded-sm w-8 transition-all duration-300 hover:bg-teal-600"
                              style={{ height: `${height}px` }}
                            ></div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span>Sun 15</span>
                        <span>Sat 20</span>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
                      <div className="space-y-3">
                        <button 
                          onClick={() => handleNavigation('quiz-generator')}
                          className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-gray-900">Create Quiz</span>
                        </button>
                        <button 
                          onClick={() => handleNavigation('study-rooms')}
                          className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                            <Users className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-gray-900">Join Study Room</span>
                        </button>
                        <button 
                          onClick={() => handleNavigation('materials')}
                          className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-gray-900">Manage Materials</span>
                        </button>
                        <button 
                          onClick={() => handleNavigation('achievements')}
                          className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                            <Award className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-gray-900">View Achievements</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;