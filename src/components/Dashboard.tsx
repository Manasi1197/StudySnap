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
  Search,
  Bell,
  MoreHorizontal,
  Play,
  CheckCircle,
  Circle,
  LogOut,
  ShoppingBag,
  X,
  Filter,
  SortAsc,
  User,
  Calendar,
  Bookmark,
  Trash2,
  Archive,
  Mail,
  Phone,
  Globe,
  ExternalLink
} from 'lucide-react';
import QuizGenerator from './QuizGenerator';
import AudioPlayer from './AudioPlayer';
import FlashcardsViewer from './FlashcardsViewer';
import QuizTaker from './QuizTaker';
import StudyRoom from './StudyRoom';
import MaterialsManager from './MaterialsManager';
import AchievementsManager from './AchievementsManager';
import MarketplaceManager from './MarketplaceManager';
import SettingsManager from './SettingsManager';
import HelpCenter from './HelpCenter';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface DashboardProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

interface Notification {
  id: string;
  type: 'achievement' | 'reminder' | 'social' | 'system' | 'quiz';
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: string;
  action?: () => void;
}

interface SearchResult {
  id: string;
  type: 'quiz' | 'material' | 'room' | 'achievement' | 'user';
  title: string;
  description: string;
  category: string;
  action: () => void;
}

interface UserStats {
  totalQuizzes: number;
  totalStudySessions: number;
  totalMaterials: number;
  totalTimeStudied: number;
  currentStreak: number;
  longestStreak: number;
  totalAchievements: number;
  totalPoints: number;
  level: number;
  averageScore: number;
}

interface RecentActivity {
  id: string;
  type: 'quiz' | 'material' | 'session' | 'achievement';
  title: string;
  description: string;
  timestamp: string;
  progress?: number;
  status: 'completed' | 'in-progress' | 'new';
  icon: string;
  color: string;
}

const Dashboard: React.FC<DashboardProps> = ({ currentPage = 'dashboard', onNavigate }) => {
  const { user, signOut } = useAuth();
  const [currentSubPage, setCurrentSubPage] = React.useState<string | null>(null);
  const [subPageData, setSubPageData] = React.useState<any>(null);
  const [quizGeneratorState, setQuizGeneratorState] = React.useState<any>(null);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [userStats, setUserStats] = React.useState<UserStats | null>(null);
  const [recentActivity, setRecentActivity] = React.useState<RecentActivity[]>([]);
  const [showSearchModal, setShowSearchModal] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [notifications, setNotifications] = React.useState<Notification[]>([
    {
      id: '1',
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message: 'You earned the "Quiz Master" badge for completing 10 quizzes',
      time: '2 minutes ago',
      read: false,
      icon: '🏆',
      action: () => handleNavigation('achievements')
    },
    {
      id: '2',
      type: 'reminder',
      title: 'Study Reminder',
      message: 'Time for your daily study session! You have 3 pending quizzes.',
      time: '1 hour ago',
      read: false,
      icon: '📚',
      action: () => handleNavigation('quiz-generator')
    },
    {
      id: '3',
      type: 'social',
      title: 'New Study Room',
      message: 'Sarah invited you to join "Biology Study Group"',
      time: '3 hours ago',
      read: true,
      icon: '👥',
      action: () => handleNavigation('study-rooms')
    },
    {
      id: '4',
      type: 'quiz',
      title: 'Quiz Completed',
      message: 'Great job! You scored 85% on "Chemistry Basics"',
      time: '1 day ago',
      read: true,
      icon: '✅'
    },
    {
      id: '5',
      type: 'system',
      title: 'New Feature Available',
      message: 'AI Audio generation is now available for all your quizzes!',
      time: '2 days ago',
      read: true,
      icon: '🎵',
      action: () => handleNavigation('quiz-generator')
    }
  ]);

  // Load real-time data
  React.useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  // Listen for profile updates
  React.useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      setUserProfile(event.detail);
    };

    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
    };
  }, []);

  const loadUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setUserProfile(profileData);
      }

      // Load user progress
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Load quiz count
      const { count: quizCount } = await supabase
        .from('quizzes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Load study sessions
      const { data: sessionsData } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      // Load materials count
      const { count: materialsCount } = await supabase
        .from('study_materials')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Load recent quizzes for activity
      const { data: recentQuizzes } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Load recent materials for activity
      const { data: recentMaterials } = await supabase
        .from('study_materials')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      // Calculate stats
      const totalSessions = sessionsData?.length || 0;
      const totalTimeStudied = sessionsData?.reduce((sum, session) => sum + (session.time_spent || 0), 0) || 0;
      const averageScore = totalSessions > 0 
        ? Math.round(sessionsData.reduce((sum, session) => sum + (session.score / session.total_questions * 100), 0) / totalSessions)
        : 0;

      // Calculate achievements (mock for now)
      const totalAchievements = Math.min(Math.floor((quizCount || 0) / 2) + Math.floor(totalSessions / 3), 15);
      const totalPoints = totalAchievements * 50 + (quizCount || 0) * 10 + totalSessions * 5;
      const level = Math.floor(totalPoints / 100) + 1;

      const stats: UserStats = {
        totalQuizzes: quizCount || 0,
        totalStudySessions: totalSessions,
        totalMaterials: materialsCount || 0,
        totalTimeStudied: Math.floor(totalTimeStudied / 60), // Convert to minutes
        currentStreak: progressData?.current_streak || 0,
        longestStreak: progressData?.longest_streak || 0,
        totalAchievements,
        totalPoints,
        level,
        averageScore
      };

      setUserStats(stats);

      // Build recent activity
      const activity: RecentActivity[] = [];

      // Add recent quizzes
      recentQuizzes?.forEach(quiz => {
        activity.push({
          id: quiz.id,
          type: 'quiz',
          title: quiz.title,
          description: `Created ${quiz.questions?.length || 0} questions`,
          timestamp: quiz.created_at,
          status: 'completed',
          icon: '🧠',
          color: 'bg-purple-500'
        });
      });

      // Add recent materials
      recentMaterials?.forEach(material => {
        activity.push({
          id: material.id,
          type: 'material',
          title: material.title,
          description: `${material.file_type?.toUpperCase()} file uploaded`,
          timestamp: material.created_at,
          status: material.processing_status === 'completed' ? 'completed' : 'in-progress',
          icon: material.file_type === 'image' ? '🖼️' : material.file_type === 'pdf' ? '📄' : '📝',
          color: 'bg-blue-500'
        });
      });

      // Add recent sessions
      sessionsData?.slice(0, 3).forEach(session => {
        const percentage = Math.round((session.score / session.total_questions) * 100);
        activity.push({
          id: session.id,
          type: 'session',
          title: 'Quiz Session Completed',
          description: `Scored ${percentage}% on ${session.total_questions} questions`,
          timestamp: session.completed_at,
          progress: percentage,
          status: 'completed',
          icon: percentage >= 80 ? '🎉' : percentage >= 60 ? '👍' : '📚',
          color: percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-yellow-500' : 'bg-orange-500'
        });
      });

      // Sort by timestamp and take most recent
      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activity.slice(0, 8));

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get current user display info
  const getUserDisplayInfo = () => {
    if (userProfile) {
      return {
        name: userProfile.full_name || user?.email?.split('@')[0] || 'Student',
        avatar: userProfile.avatar_url
      };
    }
    return {
      name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student',
      avatar: null
    };
  };

  const displayInfo = getUserDisplayInfo();

  // Search functionality
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }

    try {
      const results: SearchResult[] = [];

      // Search quizzes
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title, description')
        .eq('user_id', user?.id)
        .ilike('title', `%${query}%`)
        .limit(3);

      quizzes?.forEach(quiz => {
        results.push({
          id: quiz.id,
          type: 'quiz',
          title: quiz.title,
          description: quiz.description || 'Quiz',
          category: 'Quiz',
          action: () => handleNavigation('quiz-generator')
        });
      });

      // Search materials
      const { data: materials } = await supabase
        .from('study_materials')
        .select('id, title, file_type')
        .eq('user_id', user?.id)
        .ilike('title', `%${query}%`)
        .limit(3);

      materials?.forEach(material => {
        results.push({
          id: material.id,
          type: 'material',
          title: material.title,
          description: `${material.file_type?.toUpperCase()} file`,
          category: 'Material',
          action: () => handleNavigation('materials')
        });
      });

      // Search study rooms
      const { data: rooms } = await supabase
        .from('study_rooms')
        .select('id, name, description, subject')
        .ilike('name', `%${query}%`)
        .limit(3);

      rooms?.forEach(room => {
        results.push({
          id: room.id,
          type: 'room',
          title: room.name,
          description: room.description || room.subject,
          category: 'Study Room',
          action: () => handleNavigation('study-rooms')
        });
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const handleSearchSelect = (result: SearchResult) => {
    result.action();
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
    toast.success(`Opening ${result.title}`);
  };

  // Notification functionality
  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notif => notif.id !== notificationId)
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'achievement': return Trophy;
      case 'reminder': return Clock;
      case 'social': return Users;
      case 'quiz': return Brain;
      case 'system': return Settings;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'achievement': return 'text-yellow-600 bg-yellow-100';
      case 'reminder': return 'text-blue-600 bg-blue-100';
      case 'social': return 'text-green-600 bg-green-100';
      case 'quiz': return 'text-purple-600 bg-purple-100';
      case 'system': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSearchIcon = (type: string) => {
    switch (type) {
      case 'quiz': return Brain;
      case 'material': return FileText;
      case 'room': return Users;
      case 'achievement': return Trophy;
      case 'user': return User;
      default: return Search;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

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
    { icon: ShoppingBag, label: 'Marketplace', page: 'marketplace' },
  ];

  const bottomSidebarItems = [
    { icon: Settings, label: 'Settings', page: 'settings' },
    { icon: HelpCircle, label: 'Help Center', page: 'help' },
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
        return <MarketplaceManager onNavigate={handleNavigation} />;
      case 'settings':
        return <SettingsManager onNavigate={handleNavigation} />;
      case 'help':
        return <HelpCenter onNavigate={handleNavigation} />;
      default:
        return (
          <div className="space-y-8">
            {/* Real-time Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{userStats?.totalQuizzes || 0}</div>
                <div className="text-sm text-gray-600 mb-4">Quizzes Created</div>
                <button 
                  onClick={() => handleNavigation('quiz-generator')}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Create new quiz
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{userStats?.totalStudySessions || 0}</div>
                <div className="text-sm text-gray-600 mb-4">Study Sessions</div>
                <button className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  {userStats?.totalTimeStudied || 0} minutes studied
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{userStats?.totalAchievements || 0}</div>
                <div className="text-sm text-gray-600 mb-4">Achievements</div>
                <button 
                  onClick={() => handleNavigation('achievements')}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Level {userStats?.level || 1} • {userStats?.totalPoints || 0} points
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                  <button className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    View All
                  </button>
                </div>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No recent activity</h3>
                    <p className="text-gray-600 mb-4">Start creating quizzes and studying to see your activity here!</p>
                    <button 
                      onClick={() => handleNavigation('quiz-generator')}
                      className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Create Your First Quiz
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className={`w-10 h-10 ${activity.color} rounded-lg flex items-center justify-center text-white text-lg`}>
                          {activity.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 truncate">{activity.title}</h4>
                            <span className="text-sm text-gray-500">{formatTimeAgo(activity.timestamp)}</span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{activity.description}</p>
                          {activity.progress !== undefined && (
                            <div className="mt-2 flex items-center space-x-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${activity.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500">{activity.progress}%</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {activity.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : activity.status === 'in-progress' ? (
                            <Clock className="w-5 h-5 text-orange-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Study Insights */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Study Insights</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-2">{userStats?.averageScore || 0}%</div>
                    <div className="text-sm text-gray-600">Average Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-2">{userStats?.currentStreak || 0}</div>
                    <div className="text-sm text-gray-600">Current Streak</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-2">{userStats?.totalMaterials || 0}</div>
                    <div className="text-sm text-gray-600">Study Materials</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  // Check if we're in a sub-page that should hide the sidebar
  const isInSubPage = currentPage === 'quiz-generator' && currentSubPage;

  // Search Modal Component
  const SearchModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-20">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 shadow-2xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <Search className="w-6 h-6 text-gray-400" />
            <input
              type="text"
              placeholder="Search quizzes, materials, rooms..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 text-lg border-none outline-none"
              autoFocus
            />
            <button
              onClick={() => {
                setShowSearchModal(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {searchQuery === '' ? (
            <div className="p-8 text-center">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Search StudySnap</h3>
              <p className="text-gray-600">Find your quizzes, study materials, and more</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">Try searching for something else</p>
            </div>
          ) : (
            <div className="p-4">
              <div className="text-sm text-gray-500 mb-4">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
              </div>
              <div className="space-y-2">
                {searchResults.map((result) => {
                  const Icon = getSearchIcon(result.type);
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSearchSelect(result)}
                      className="w-full flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{result.title}</h4>
                        <p className="text-sm text-gray-600 truncate">{result.description}</p>
                      </div>
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {result.category}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Notifications Dropdown Component
  const NotificationsDropdown = () => (
    <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={() => setShowNotifications(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h4>
            <p className="text-gray-600">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              return (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                      <span className="text-lg">{notification.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className={`text-sm mt-1 ${!notification.read ? 'text-gray-700' : 'text-gray-600'}`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">{notification.time}</span>
                        <div className="flex items-center space-x-2">
                          {notification.action && (
                            <button
                              onClick={() => {
                                notification.action!();
                                markNotificationAsRead(notification.id);
                                setShowNotifications(false);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              View
                            </button>
                          )}
                          {!notification.read && (
                            <button
                              onClick={() => markNotificationAsRead(notification.id)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={clearAllNotifications}
            className="w-full text-center text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Clear all notifications
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Hide only for Quiz Generator sub-pages */}
      {!isInSubPage && (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">StudySnap</span>
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
                  Welcome back, {displayInfo.name}! 👋
                </h1>
                {userStats && (
                  <p className="text-gray-600">
                    Level {userStats.level} • {userStats.totalPoints} points • {userStats.currentStreak} day streak
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-4">
                {/* Search Button */}
                <button 
                  onClick={() => setShowSearchModal(true)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                  title="Search"
                >
                  <Search className="w-5 h-5" />
                </button>
                
                {/* Notifications Button */}
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative rounded-lg hover:bg-gray-100"
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && <NotificationsDropdown />}
                </div>
                
                {/* Profile */}
                <div className="flex items-center space-x-3">
                  <img
                    src={displayInfo.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayInfo.name)}&size=32&background=6366f1&color=ffffff`}
                    alt="Profile"
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {displayInfo.name}
                    </div>
                    <div className="text-gray-500">Basic Member</div>
                  </div>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Dashboard Content */}
        <main className={`flex-1 ${!isInSubPage && currentPage !== 'quiz-generator' && currentPage !== 'study-rooms' && currentPage !== 'materials' && currentPage !== 'achievements' && currentPage !== 'marketplace' && currentPage !== 'settings' && currentPage !== 'help' ? 'p-8' : ''}`}>
          {/* Conditional container width based on current page */}
          {currentPage === 'quiz-generator' || isInSubPage || currentPage === 'study-rooms' || currentPage === 'materials' || currentPage === 'achievements' || currentPage === 'marketplace' || currentPage === 'settings' || currentPage === 'help' ? (
            // Full width for Quiz Generator, sub-pages, Study Rooms, Materials, Achievements, Marketplace, Settings, and Help
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
                        <h3 className="font-bold text-gray-900">Your Progress</h3>
                        <button className="p-1">
                          <MoreHorizontal className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                      <div className="text-center mb-6">
                        <img
                          src={displayInfo.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayInfo.name)}&size=64&background=6366f1&color=ffffff`}
                          alt="Profile"
                          className="w-16 h-16 rounded-full mx-auto mb-4"
                        />
                        <h4 className="font-bold text-gray-900">
                          {displayInfo.name}
                        </h4>
                        <p className="text-sm text-gray-500">Level {userStats?.level || 1} • {userStats?.totalPoints || 0} points</p>
                      </div>
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold text-gray-900">{userStats?.totalTimeStudied || 0}</span>
                          <select className="text-sm text-gray-500 border-none bg-transparent">
                            <option>This week</option>
                          </select>
                        </div>
                        <p className="text-sm text-gray-500">Minutes studied</p>
                      </div>
                      
                      {/* Progress visualization */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Study Streak</span>
                          <span className="font-medium">{userStats?.currentStreak || 0} days</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min((userStats?.currentStreak || 0) / 30 * 100, 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Average Score</span>
                          <span className="font-medium">{userStats?.averageScore || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${userStats?.averageScore || 0}%` }}
                          ></div>
                        </div>
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
                        <button 
                          onClick={() => handleNavigation('marketplace')}
                          className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-gray-900">Browse Marketplace</span>
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

      {/* Search Modal */}
      {showSearchModal && <SearchModal />}
    </div>
  );
};

export default Dashboard;