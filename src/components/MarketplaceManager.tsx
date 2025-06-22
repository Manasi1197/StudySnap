import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Search, 
  Filter, 
  Star, 
  Heart, 
  Download, 
  Eye, 
  TrendingUp, 
  Users, 
  BookOpen, 
  FileText, 
  Image, 
  Play, 
  ShoppingCart, 
  Plus, 
  Grid, 
  List, 
  SortAsc, 
  SortDesc, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Share2, 
  Award, 
  Clock, 
  Target, 
  Zap, 
  Crown, 
  Sparkles,
  ChevronDown,
  X,
  Upload,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  type: 'quiz' | 'flashcard_set' | 'study_material' | 'course';
  rating: number;
  reviews: number;
  downloads: number;
  preview_image?: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  seller: {
    name: string;
    avatar: string;
    verified: boolean;
  };
  created_at: string;
}

interface MarketplaceManagerProps {
  onNavigate?: (page: string) => void;
}

const MarketplaceManager: React.FC<MarketplaceManagerProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');

  // Mock data for demonstration
  const mockItems: MarketplaceItem[] = [
    {
      id: '1',
      title: 'Advanced Calculus Quiz Pack',
      description: 'Comprehensive quiz collection covering differential and integral calculus with detailed explanations.',
      price: 29.99,
      category: 'Mathematics',
      type: 'quiz',
      rating: 4.8,
      reviews: 156,
      downloads: 1240,
      preview_image: 'https://images.pexels.com/photos/6238050/pexels-photo-6238050.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      tags: ['calculus', 'mathematics', 'advanced', 'university'],
      difficulty: 'advanced',
      seller: {
        name: 'Dr. Sarah Chen',
        avatar: 'https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
        verified: true
      },
      created_at: '2024-01-15'
    },
    {
      id: '2',
      title: 'Biology Flashcard Collection',
      description: 'Essential biology concepts for high school and college students with visual aids and mnemonics.',
      price: 19.99,
      category: 'Science',
      type: 'flashcard_set',
      rating: 4.9,
      reviews: 203,
      downloads: 2100,
      preview_image: 'https://images.pexels.com/photos/8471831/pexels-photo-8471831.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      tags: ['biology', 'science', 'flashcards', 'visual'],
      difficulty: 'intermediate',
      seller: {
        name: 'Prof. Michael Rodriguez',
        avatar: 'https://images.pexels.com/photos/5212361/pexels-photo-5212361.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
        verified: true
      },
      created_at: '2024-01-12'
    },
    {
      id: '3',
      title: 'Spanish Grammar Mastery',
      description: 'Complete Spanish grammar course with interactive exercises and pronunciation guides.',
      price: 39.99,
      category: 'Languages',
      type: 'course',
      rating: 4.7,
      reviews: 89,
      downloads: 567,
      preview_image: 'https://images.pexels.com/photos/4491461/pexels-photo-4491461.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      tags: ['spanish', 'grammar', 'language', 'course'],
      difficulty: 'beginner',
      seller: {
        name: 'Maria Gonzalez',
        avatar: 'https://images.pexels.com/photos/5212700/pexels-photo-5212700.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
        verified: false
      },
      created_at: '2024-01-10'
    },
    {
      id: '4',
      title: 'Chemistry Lab Notes',
      description: 'Detailed laboratory procedures and safety protocols for organic chemistry experiments.',
      price: 24.99,
      category: 'Science',
      type: 'study_material',
      rating: 4.6,
      reviews: 67,
      downloads: 890,
      preview_image: 'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      tags: ['chemistry', 'lab', 'organic', 'safety'],
      difficulty: 'intermediate',
      seller: {
        name: 'Dr. James Wilson',
        avatar: 'https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
        verified: true
      },
      created_at: '2024-01-08'
    },
    {
      id: '5',
      title: 'History Timeline Quiz',
      description: 'Interactive timeline quizzes covering major historical events from ancient to modern times.',
      price: 15.99,
      category: 'History',
      type: 'quiz',
      rating: 4.5,
      reviews: 124,
      downloads: 1560,
      preview_image: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      tags: ['history', 'timeline', 'events', 'interactive'],
      difficulty: 'beginner',
      seller: {
        name: 'Prof. Emily Davis',
        avatar: 'https://images.pexels.com/photos/5212361/pexels-photo-5212361.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
        verified: true
      },
      created_at: '2024-01-05'
    },
    {
      id: '6',
      title: 'Programming Fundamentals',
      description: 'Learn the basics of programming with Python through hands-on exercises and projects.',
      price: 49.99,
      category: 'Technology',
      type: 'course',
      rating: 4.9,
      reviews: 312,
      downloads: 2890,
      preview_image: 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      tags: ['programming', 'python', 'coding', 'beginner'],
      difficulty: 'beginner',
      seller: {
        name: 'Alex Thompson',
        avatar: 'https://images.pexels.com/photos/5212700/pexels-photo-5212700.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
        verified: true
      },
      created_at: '2024-01-03'
    }
  ];

  useEffect(() => {
    setItems(mockItems);
    setLoading(false);
  }, []);

  const categories = [
    'all',
    'Mathematics',
    'Science',
    'Languages',
    'History',
    'Technology',
    'Business',
    'Arts'
  ];

  const types = [
    { value: 'all', label: 'All Types' },
    { value: 'quiz', label: 'Quizzes' },
    { value: 'flashcard_set', label: 'Flashcards' },
    { value: 'study_material', label: 'Study Materials' },
    { value: 'course', label: 'Courses' }
  ];

  const sortOptions = [
    { value: 'popular', label: 'Most Popular' },
    { value: 'newest', label: 'Newest First' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' }
  ];

  const filteredItems = items
    .filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesType = selectedType === 'all' || item.type === selectedType;
      
      return matchesSearch && matchesCategory && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'price_low':
          return a.price - b.price;
        case 'price_high':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'popular':
        default:
          return b.downloads - a.downloads;
      }
    });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quiz':
        return <Target className="w-4 h-4" />;
      case 'flashcard_set':
        return <BookOpen className="w-4 h-4" />;
      case 'study_material':
        return <FileText className="w-4 h-4" />;
      case 'course':
        return <Play className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const handlePurchase = (item: MarketplaceItem) => {
    toast.success(`Added "${item.title}" to cart!`);
  };

  const tabs = [
    { id: 'browse', label: 'Browse', icon: Search },
    { id: 'my-items', label: 'My Items', icon: User },
    { id: 'purchases', label: 'Purchases', icon: ShoppingCart },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
            <p className="text-gray-600">Discover and share educational content</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Sell Content</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search marketplace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full sm:w-64"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {types.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
      <div className="p-4 sm:p-8">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{filteredItems.length}</p>
                <p className="text-sm text-gray-500">Items Available</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">12.5K</p>
                <p className="text-sm text-gray-500">Total Downloads</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">2.8K</p>
                <p className="text-sm text-gray-500">Active Sellers</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">4.7</p>
                <p className="text-sm text-gray-500">Avg Rating</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items Grid/List */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No items found</h3>
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
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                <div className="relative">
                  <img
                    src={item.preview_image}
                    alt={item.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(item.difficulty)}`}>
                      {item.difficulty}
                    </span>
                    <span className="bg-white bg-opacity-90 text-gray-800 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                      {getTypeIcon(item.type)}
                      <span className="capitalize">{item.type.replace('_', ' ')}</span>
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <button className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-white transition-colors">
                      <Heart className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <img
                      src={item.seller.avatar}
                      alt={item.seller.name}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm text-gray-600">{item.seller.name}</span>
                    {item.seller.verified && (
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                  
                  <div className="flex items-center space-x-4 mb-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span>{item.rating}</span>
                      <span>({item.reviews})</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Download className="w-4 h-4" />
                      <span>{item.downloads}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-purple-600">{formatPrice(item.price)}</span>
                    <button
                      onClick={() => handlePurchase(item)}
                      className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors font-medium"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50 text-sm font-medium text-gray-700">
              <div className="col-span-5">Item</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-1">Rating</div>
              <div className="col-span-1">Downloads</div>
              <div className="col-span-2">Price</div>
              <div className="col-span-1">Actions</div>
            </div>
            {filteredItems.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="col-span-5 flex items-center space-x-3">
                  <img
                    src={item.preview_image}
                    alt={item.title}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-sm text-gray-500 truncate">{item.seller.name}</p>
                  </div>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-gray-600">{item.category}</span>
                </div>
                <div className="col-span-1 flex items-center">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">{item.rating}</span>
                  </div>
                </div>
                <div className="col-span-1 flex items-center">
                  <span className="text-sm text-gray-600">{item.downloads}</span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-lg font-bold text-purple-600">{formatPrice(item.price)}</span>
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  <button
                    onClick={() => handlePurchase(item)}
                    className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600 transition-colors"
                  >
                    Buy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplaceManager;