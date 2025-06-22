import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Medal, 
  Star, 
  Target, 
  Zap, 
  BookOpen, 
  Brain, 
  Users, 
  Clock, 
  TrendingUp,
  Share2,
  Copy,
  ExternalLink,
  Calendar,
  Award,
  Crown,
  Flame,
  CheckCircle,
  Lock,
  MoreVertical,
  X,
  Download,
  Filter,
  Search,
  Grid,
  List,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'learning' | 'social' | 'streak' | 'milestone' | 'special';
  type: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  icon: string;
  requirement: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}

interface UserStats {
  totalQuizzes: number;
  totalStudySessions: number;
  totalTimeStudied: number;
  currentStreak: number;
  longestStreak: number;
  averageScore: number;
  materialsUploaded: number;
  roomsCreated: number;
  roomsJoined: number;
  totalPoints: number;
  level: number;
}

interface AchievementsManagerProps {
  onNavigate?: (page: string) => void;
}

const AchievementsManager: React.FC<AchievementsManagerProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'points' | 'progress'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingAchievement, setSharingAchievement] = useState<Achievement | null>(null);

  // Predefined achievements system
  const achievementDefinitions: Omit<Achievement, 'id' | 'progress' | 'unlocked' | 'unlockedAt'>[] = [
    // Learning Achievements
    {
      title: "First Steps",
      description: "Complete your first quiz",
      category: "learning",
      type: "bronze",
      icon: "🎯",
      requirement: 1,
      rarity: "common",
      points: 10
    },
    {
      title: "Quiz Master",
      description: "Complete 10 quizzes",
      category: "learning",
      type: "silver",
      icon: "🧠",
      requirement: 10,
      rarity: "common",
      points: 50
    },
    {
      title: "Knowledge Seeker",
      description: "Complete 50 quizzes",
      category: "learning",
      type: "gold",
      icon: "📚",
      requirement: 50,
      rarity: "rare",
      points: 200
    },
    {
      title: "Scholar",
      description: "Complete 100 quizzes",
      category: "learning",
      type: "platinum",
      icon: "🎓",
      requirement: 100,
      rarity: "epic",
      points: 500
    },
    {
      title: "Genius",
      description: "Complete 500 quizzes",
      category: "learning",
      type: "diamond",
      icon: "💎",
      requirement: 500,
      rarity: "legendary",
      points: 2000
    },

    // Streak Achievements
    {
      title: "Getting Started",
      description: "Maintain a 3-day study streak",
      category: "streak",
      type: "bronze",
      icon: "🔥",
      requirement: 3,
      rarity: "common",
      points: 25
    },
    {
      title: "Consistent Learner",
      description: "Maintain a 7-day study streak",
      category: "streak",
      type: "silver",
      icon: "⚡",
      requirement: 7,
      rarity: "common",
      points: 75
    },
    {
      title: "Dedicated Student",
      description: "Maintain a 30-day study streak",
      category: "streak",
      type: "gold",
      icon: "🌟",
      requirement: 30,
      rarity: "rare",
      points: 300
    },
    {
      title: "Study Machine",
      description: "Maintain a 100-day study streak",
      category: "streak",
      type: "platinum",
      icon: "👑",
      requirement: 100,
      rarity: "epic",
      points: 1000
    },

    // Time-based Achievements
    {
      title: "Quick Learner",
      description: "Study for 1 hour total",
      category: "milestone",
      type: "bronze",
      icon: "⏰",
      requirement: 60,
      rarity: "common",
      points: 15
    },
    {
      title: "Time Investor",
      description: "Study for 10 hours total",
      category: "milestone",
      type: "silver",
      icon: "📖",
      requirement: 600,
      rarity: "common",
      points: 100
    },
    {
      title: "Study Enthusiast",
      description: "Study for 50 hours total",
      category: "milestone",
      type: "gold",
      icon: "🏆",
      requirement: 3000,
      rarity: "rare",
      points: 400
    },
    {
      title: "Learning Legend",
      description: "Study for 200 hours total",
      category: "milestone",
      type: "platinum",
      icon: "🌠",
      requirement: 12000,
      rarity: "epic",
      points: 1500
    },

    // Social Achievements
    {
      title: "Room Creator",
      description: "Create your first study room",
      category: "social",
      type: "bronze",
      icon: "🏠",
      requirement: 1,
      rarity: "common",
      points: 20
    },
    {
      title: "Community Builder",
      description: "Create 5 study rooms",
      category: "social",
      type: "silver",
      icon: "🏘️",
      requirement: 5,
      rarity: "common",
      points: 100
    },
    {
      title: "Social Learner",
      description: "Join 10 study rooms",
      category: "social",
      type: "gold",
      icon: "👥",
      requirement: 10,
      rarity: "rare",
      points: 250
    },

    // Special Achievements
    {
      title: "Perfect Score",
      description: "Get 100% on a quiz",
      category: "special",
      type: "gold",
      icon: "💯",
      requirement: 1,
      rarity: "rare",
      points: 150
    },
    {
      title: "Speed Demon",
      description: "Complete a quiz in under 2 minutes",
      category: "special",
      type: "silver",
      icon: "⚡",
      requirement: 1,
      rarity: "rare",
      points: 100
    },
    {
      title: "Material Master",
      description: "Upload 25 study materials",
      category: "learning",
      type: "gold",
      icon: "📁",
      requirement: 25,
      rarity: "rare",
      points: 300
    }
  ];

  useEffect(() => {
    if (user) {
      loadUserStats();
      generateAchievements();
    }
  }, [user]);

  const loadUserStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        throw progressError;
      }

      // Load quiz count
      const { count: quizCount } = await supabase
        .from('quizzes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Load study sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('score, total_questions, time_spent')
        .eq('user_id', user.id);

      if (sessionsError) throw sessionsError;

      // Load materials count
      const { count: materialsCount } = await supabase
        .from('study_materials')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Load rooms data
      const { count: roomsCreated } = await supabase
        .from('study_rooms')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id);

      const { count: roomsJoined } = await supabase
        .from('room_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Calculate stats
      const totalSessions = sessionsData?.length || 0;
      const totalTimeStudied = sessionsData?.reduce((sum, session) => sum + (session.time_spent || 0), 0) || 0;
      const averageScore = totalSessions > 0 
        ? sessionsData.reduce((sum, session) => sum + (session.score / session.total_questions * 100), 0) / totalSessions 
        : 0;

      const stats: UserStats = {
        totalQuizzes: quizCount || 0,
        totalStudySessions: totalSessions,
        totalTimeStudied: Math.floor(totalTimeStudied / 60), // Convert to minutes
        currentStreak: progressData?.current_streak || 0,
        longestStreak: progressData?.longest_streak || 0,
        averageScore: Math.round(averageScore),
        materialsUploaded: materialsCount || 0,
        roomsCreated: roomsCreated || 0,
        roomsJoined: roomsJoined || 0,
        totalPoints: 0, // Will be calculated from achievements
        level: 1 // Will be calculated from points
      };

      setUserStats(stats);
    } catch (error: any) {
      console.error('Error loading user stats:', error);
      toast.error('Failed to load achievements data');
    } finally {
      setLoading(false);
    }
  };

  const generateAchievements = async () => {
    if (!userStats) return;

    const generatedAchievements: Achievement[] = achievementDefinitions.map((def, index) => {
      let progress = 0;
      let unlocked = false;

      // Calculate progress based on achievement type
      switch (def.category) {
        case 'learning':
          if (def.title.includes('quiz') || def.title.includes('Quiz')) {
            progress = userStats.totalStudySessions;
          } else if (def.title.includes('Material')) {
            progress = userStats.materialsUploaded;
          }
          break;
        case 'streak':
          progress = userStats.longestStreak;
          break;
        case 'milestone':
          progress = userStats.totalTimeStudied;
          break;
        case 'social':
          if (def.title.includes('Create') || def.title.includes('Creator')) {
            progress = userStats.roomsCreated;
          } else if (def.title.includes('Join')) {
            progress = userStats.roomsJoined;
          }
          break;
        case 'special':
          // These would need specific tracking - for now set to 0
          progress = 0;
          break;
      }

      unlocked = progress >= def.requirement;

      return {
        ...def,
        id: `achievement_${index}`,
        progress: Math.min(progress, def.requirement),
        unlocked,
        unlockedAt: unlocked ? new Date().toISOString() : undefined
      };
    });

    // Calculate total points and level
    const totalPoints = generatedAchievements
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + a.points, 0);
    
    const level = Math.floor(totalPoints / 100) + 1;

    setAchievements(generatedAchievements);
    if (userStats) {
      setUserStats({ ...userStats, totalPoints, level });
    }
  };

  useEffect(() => {
    if (userStats) {
      generateAchievements();
    }
  }, [userStats]);

  const getAchievementTypeColor = (type: string) => {
    switch (type) {
      case 'bronze': return 'from-amber-600 to-amber-800';
      case 'silver': return 'from-gray-400 to-gray-600';
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'platinum': return 'from-purple-400 to-purple-600';
      case 'diamond': return 'from-blue-400 to-cyan-400';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-600';
      case 'rare': return 'text-blue-600';
      case 'epic': return 'text-purple-600';
      case 'legendary': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const shareAchievement = async (achievement: Achievement) => {
    try {
      const shareText = `🏆 I just unlocked "${achievement.title}" on StudySnap! ${achievement.description} #StudySnap #Achievement`;
      
      if (navigator.share) {
        await navigator.share({
          title: `Achievement Unlocked: ${achievement.title}`,
          text: shareText,
          url: window.location.origin
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success('Achievement shared to clipboard!');
      }
      
      setShowShareModal(false);
      setSharingAchievement(null);
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share achievement');
    }
  };

  // Filter and sort achievements
  const filteredAchievements = achievements
    .filter(achievement => {
      const matchesSearch = achievement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           achievement.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || achievement.category === selectedCategory;
      const matchesType = selectedType === 'all' || achievement.type === selectedType;
      
      return matchesSearch && matchesCategory && matchesType;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'points':
          comparison = a.points - b.points;
          break;
        case 'progress':
          comparison = (a.progress / a.requirement) - (b.progress / b.requirement);
          break;
        case 'date':
        default:
          // Sort by unlocked status first, then by points
          if (a.unlocked !== b.unlocked) {
            comparison = a.unlocked ? -1 : 1;
          } else {
            comparison = b.points - a.points;
          }
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const completionPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Share Modal Component
  const ShareModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
        <button
          onClick={() => {
            setShowShareModal(false);
            setSharingAchievement(null);
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className={`w-16 h-16 bg-gradient-to-br ${getAchievementTypeColor(sharingAchievement?.type || '')} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <span className="text-2xl">{sharingAchievement?.icon}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Achievement</h2>
          <p className="text-gray-600">
            Share your "{sharingAchievement?.title}" achievement with others!
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">{sharingAchievement?.title}</h4>
            <p className="text-sm text-gray-600 mb-3">{sharingAchievement?.description}</p>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${getRarityColor(sharingAchievement?.rarity || '')}`}>
                {sharingAchievement?.rarity?.toUpperCase()}
              </span>
              <span className="font-medium text-gray-900">
                {sharingAchievement?.points} points
              </span>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => {
                setShowShareModal(false);
                setSharingAchievement(null);
              }}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (sharingAchievement) {
                  shareAchievement(sharingAchievement);
                }
              }}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
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
          <p className="text-gray-600">Loading your achievements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Achievements</h1>
            <p className="text-gray-600">Track your learning milestones and accomplishments</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{userStats?.level || 1}</div>
            <div className="text-sm text-gray-500">Level</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{userStats?.totalPoints || 0}</div>
            <div className="text-sm text-gray-500">Total Points</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{unlockedCount}</div>
            <div className="text-sm text-gray-500">Unlocked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{completionPercentage}%</div>
            <div className="text-sm text-gray-500">Complete</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{userStats?.currentStreak || 0}</div>
            <div className="text-sm text-gray-500">Current Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{userStats?.longestStreak || 0}</div>
            <div className="text-sm text-gray-500">Best Streak</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search achievements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-64"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="learning">Learning</option>
              <option value="social">Social</option>
              <option value="streak">Streak</option>
              <option value="milestone">Milestone</option>
              <option value="special">Special</option>
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
              <option value="diamond">Diamond</option>
            </select>

            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-');
                setSortBy(sort as any);
                setSortOrder(order as any);
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="date-desc">Recently Unlocked</option>
              <option value="points-desc">Highest Points</option>
              <option value="points-asc">Lowest Points</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="progress-desc">Most Progress</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Progress Overview */}
        <div className="mb-8 bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Overall Progress</h2>
            <span className="text-sm text-gray-500">
              {unlockedCount} of {totalCount} achievements unlocked
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          <div className="mt-2 text-center text-sm text-gray-600">
            {completionPercentage}% Complete
          </div>
        </div>

        {/* Achievements Grid/List */}
        {filteredAchievements.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No achievements found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search or filter criteria
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedType('all');
              }}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAchievements.map((achievement) => (
              <div 
                key={achievement.id} 
                className={`bg-white rounded-xl border-2 p-6 transition-all duration-300 hover:shadow-lg ${
                  achievement.unlocked 
                    ? 'border-green-200 hover:border-green-300' 
                    : 'border-gray-200 hover:border-gray-300 opacity-75'
                }`}
              >
                <div className="text-center">
                  <div className={`w-16 h-16 bg-gradient-to-br ${getAchievementTypeColor(achievement.type)} rounded-full flex items-center justify-center mx-auto mb-4 ${
                    !achievement.unlocked && 'grayscale'
                  }`}>
                    {achievement.unlocked ? (
                      <span className="text-2xl">{achievement.icon}</span>
                    ) : (
                      <Lock className="w-8 h-8 text-white" />
                    )}
                  </div>
                  
                  <h3 className="font-bold text-gray-900 mb-2">{achievement.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{achievement.description}</p>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{achievement.progress}</span>
                      <span>{achievement.requirement}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          achievement.unlocked ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min((achievement.progress / achievement.requirement) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${getRarityColor(achievement.rarity)}`}>
                      {achievement.rarity.toUpperCase()}
                    </span>
                    <span className="font-medium text-gray-900">
                      {achievement.points} pts
                    </span>
                  </div>
                  
                  {achievement.unlocked && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setSharingAchievement(achievement);
                          setShowShareModal(true);
                        }}
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50 text-sm font-medium text-gray-700">
              <div className="col-span-6">Achievement</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Progress</div>
              <div className="col-span-1">Points</div>
              <div className="col-span-1">Actions</div>
            </div>
            {filteredAchievements.map((achievement) => (
              <div key={achievement.id} className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                !achievement.unlocked && 'opacity-75'
              }`}>
                <div className="col-span-6 flex items-center space-x-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${getAchievementTypeColor(achievement.type)} rounded-lg flex items-center justify-center flex-shrink-0 ${
                    !achievement.unlocked && 'grayscale'
                  }`}>
                    {achievement.unlocked ? (
                      <span className="text-lg">{achievement.icon}</span>
                    ) : (
                      <Lock className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{achievement.title}</p>
                    <p className="text-sm text-gray-500 truncate">{achievement.description}</p>
                  </div>
                  {achievement.unlocked && (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <div className="col-span-2 flex items-center">
                  <span className={`text-sm font-medium capitalize ${getRarityColor(achievement.rarity)}`}>
                    {achievement.type}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <div className="w-full">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{achievement.progress}</span>
                      <span>{achievement.requirement}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          achievement.unlocked ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min((achievement.progress / achievement.requirement) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="col-span-1 flex items-center">
                  <span className="text-sm font-medium text-gray-900">{achievement.points}</span>
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  {achievement.unlocked && (
                    <button
                      onClick={() => {
                        setSharingAchievement(achievement);
                        setShowShareModal(true);
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Share Achievement"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && <ShareModal />}
    </div>
  );
};

export default AchievementsManager;