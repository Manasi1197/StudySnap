import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Users, 
  Trophy, 
  ShoppingBag, 
  User, 
  Bookmark, 
  FileText, 
  Award, 
  Calendar, 
  MessageSquare, 
  Settings, 
  HelpCircle, 
  LogOut,
  Plus,
  TrendingUp,
  Clock,
  Target,
  Zap,
  Brain,
  Star,
  BarChart3,
  PlusCircle,
  ArrowRight,
  ChevronRight,
  Activity,
  Lightbulb,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import QuizGenerator from './QuizGenerator';
import StudyRoom from './StudyRoom';
import MarketplaceManager from './MarketplaceManager';
import MaterialsManager from './MaterialsManager';
import AchievementsManager from './AchievementsManager';
import SettingsManager from './SettingsManager';
import HelpCenter from './HelpCenter';
import StudyAssistantChatbot from './StudyAssistantChatbot';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface DashboardProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface UserStats {
  totalQuizzes: number;
  totalStudySessions: number;
  currentStreak: number;
  totalPoints: number;
  level: number;
  recentActivity: any[];
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  action: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentPage, onNavigate }) => {
  const { user, signOut } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // Agent ID for the conversational AI chatbot
  const STUDY_ASSISTANT_AGENT_ID = 'agent_01jyxvmbyeetd9tpgp3sep36t8';

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      setProfile(event.detail);
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
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      setProfile(profileData);

      // Load user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        console.warn('No user progress found, will create default');
      }

      // Load quiz count
      const { count: quizCount } = await supabase
        .from('quizzes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Load study sessions count
      const { count: sessionsCount } = await supabase
        .from('study_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Calculate stats
      const stats: UserStats = {
        totalQuizzes: quizCount || 0,
        totalStudySessions: sessionsCount || 0,
        currentStreak: progressData?.current_streak || 0,
        totalPoints: (quizCount || 0) * 10 + (sessionsCount || 0) * 5, // Simple point calculation
        level: Math.floor(((quizCount || 0) * 10 + (sessionsCount || 0) * 5) / 100) + 1,
        recentActivity: []
      };

      setUserStats(stats);
    } catch (error: any) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'create-quiz',
      title: 'Create Quiz',
      description: 'Generate AI-powered quizzes from your materials',
      icon: Brain,
      color: 'bg-purple-500',
      action: () => onNavigate('quiz-generator')
    },
    {
      id: 'join-room',
      title: 'Study Room',
      description: 'Join or create collaborative study sessions',
      icon: Users,
      color: 'bg-blue-500',
      action: () => onNavigate('study-rooms')
    },
    {
      id: 'browse-marketplace',
      title: 'Marketplace',
      description: 'Discover and share study materials',
      icon: ShoppingBag,
      color: 'bg-green-500',
      action: () => onNavigate('marketplace')
    },
    {
      id: 'upload-materials',
      title: 'Upload Materials',
      description: 'Add new study materials and resources',
      icon: FileText,
      color: 'bg-orange-500',
      action: () => onNavigate('materials')
    }
  ];

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'quiz-generator', label: 'Quiz Generator', icon: Brain },
    { id: 'study-rooms', label: 'Study Rooms', icon: Users },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'materials', label: 'My Materials', icon: FileText },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help Center', icon: HelpCircle },
  ];

  const renderContent = () => {
    switch (currentPage) {
      case 'quiz-generator':
        return <QuizGenerator onNavigate={onNavigate} />;
      case 'study-rooms':
        return <StudyRoom onNavigate={onNavigate} />;
      case 'marketplace':
        return <MarketplaceManager onNavigate={onNavigate} />;
      case 'materials':
        return <MaterialsManager onNavigate={onNavigate} />;
      case 'achievements':
        return <AchievementsManager onNavigate={onNavigate} />;
      case 'settings':
        return <SettingsManager onNavigate={onNavigate} />;
      case 'help':
        return <HelpCenter onNavigate={onNavigate} />;
      default:
        return renderDashboardHome();
    }
  };

  const renderDashboardHome = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {profile?.full_name || user?.email?.split('@')[0] || 'Student'}! 👋
              </h1>
              <p className="text-purple-100 text-lg">
                Ready to continue your learning journey?
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">Level {userStats?.level || 1}</div>
              <div className="text-purple-100">{userStats?.totalPoints || 0} points</div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-32 h-32 bg-white bg-opacity-10 rounded-full blur-xl"></div>
        <div className="absolute bottom-4 left-4 w-24 h-24 bg-white bg-opacity-10 rounded-full blur-xl"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Quizzes</p>
              <p className="text-2xl font-bold text-gray-900">{userStats?.totalQuizzes || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Study Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{userStats?.totalStudySessions || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Current Streak</p>
              <p className="text-2xl font-bold text-gray-900">{userStats?.currentStreak || 0} days</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Points</p>
              <p className="text-2xl font-bold text-gray-900">{userStats?.totalPoints || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Star className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.action}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 text-left group hover:scale-105"
              >
                <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
                <div className="flex items-center mt-4 text-sm text-gray-500 group-hover:text-gray-700">
                  <span>Get started</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity & Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Recent Activity
          </h3>
          <div className="space-y-4">
            {userStats?.recentActivity?.length ? (
              userStats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity</p>
                <p className="text-sm text-gray-400">Start studying to see your activity here</p>
              </div>
            )}
          </div>
        </div>

        {/* Study Tips */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center">
            <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
            Study Tips
          </h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Use Active Recall</p>
                <p className="text-xs text-gray-600">Test yourself frequently instead of just re-reading notes</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Spaced Repetition</p>
                <p className="text-xs text-gray-600">Review material at increasing intervals for better retention</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">3</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Study Groups</p>
                <p className="text-xs text-gray-600">Join study rooms to learn collaboratively with peers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">StudySnap</span>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <img
              src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || user?.email || 'User')}&size=40&background=6366f1&color=ffffff`}
              alt="Profile"
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                Level {userStats?.level || 1} • {userStats?.totalPoints || 0} pts
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>

      {/* Study Assistant Chatbot - Only show when user is authenticated */}
      {user && <StudyAssistantChatbot agentId={STUDY_ASSISTANT_AGENT_ID} />}
    </div>
  );
};

export default Dashboard;