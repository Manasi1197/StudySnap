import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Star, 
  Heart, 
  Download, 
  Eye, 
  DollarSign,
  Plus,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Tag,
  User,
  Calendar,
  TrendingUp,
  Award,
  ShoppingCart,
  CreditCard,
  Package,
  MoreVertical,
  Edit3,
  Trash2,
  Share2,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Upload,
  Image as ImageIcon,
  FileText,
  BookOpen,
  Brain,
  Target,
  Zap,
  Crown,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface MarketplaceItem {
  id: string;
  seller_id: string;
  category_id: string;
  title: string;
  description: string;
  content_type: 'quiz' | 'flashcard_set' | 'study_material' | 'course' | 'template';
  content_id?: string;
  price: number;
  original_price?: number;
  currency: string;
  preview_content: any;
  tags: string[];
  difficulty_level: string;
  subject: string;
  language: string;
  thumbnail_url?: string;
  images: string[];
  file_size?: number;
  download_count: number;
  view_count: number;
  favorite_count: number;
  average_rating: number;
  total_reviews: number;
  status: 'draft' | 'published' | 'paused' | 'archived';
  featured: boolean;
  featured_until?: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  seller?: SellerProfile;
  category?: MarketplaceCategory;
  is_favorited?: boolean;
  is_purchased?: boolean;
}

interface SellerProfile {
  id: string;
  user_id: string;
  business_name?: string;
  bio?: string;
  website_url?: string;
  social_links: any;
  verification_status: 'pending' | 'verified' | 'rejected';
  total_sales: number;
  total_revenue: number;
  average_rating: number;
  total_reviews: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface MarketplaceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

interface Purchase {
  id: string;
  buyer_id: string;
  seller_id: string;
  item_id: string;
  purchase_price: number;
  currency: string;
  payment_method: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  download_limit: number;
  downloads_used: number;
  access_expires_at?: string;
  created_at: string;
  item?: MarketplaceItem;
}

interface MarketplaceManagerProps {
  onNavigate?: (page: string) => void;
}

const MarketplaceManager: React.FC<MarketplaceManagerProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'browse' | 'sell' | 'purchases' | 'favorites'>('browse');
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [favorites, setFavorites] = useState<MarketplaceItem[]>([]);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'rating' | 'price_low' | 'price_high'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCategories(),
        loadItems(),
        loadSellerProfile(),
        loadPurchases(),
        loadFavorites()
      ]);
    } catch (error) {
      console.error('Error loading marketplace data:', error);
      toast.error('Failed to load marketplace data');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error loading categories:', error);
    }
  };

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_items')
        .select(`
          *,
          seller:seller_profiles(
            *,
            profile:profiles(full_name, avatar_url)
          ),
          category:marketplace_categories(*)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check if items are favorited by current user
      if (data && user) {
        const { data: favoritesData } = await supabase
          .from('marketplace_favorites')
          .select('item_id')
          .eq('user_id', user.id);

        const favoriteIds = new Set(favoritesData?.map(f => f.item_id) || []);

        // Check if items are purchased by current user
        const { data: purchasesData } = await supabase
          .from('marketplace_purchases')
          .select('item_id')
          .eq('buyer_id', user.id)
          .eq('payment_status', 'completed');

        const purchasedIds = new Set(purchasesData?.map(p => p.item_id) || []);

        const itemsWithStatus = data.map(item => ({
          ...item,
          is_favorited: favoriteIds.has(item.id),
          is_purchased: purchasedIds.has(item.id)
        }));

        setItems(itemsWithStatus);
      } else {
        setItems(data || []);
      }
    } catch (error: any) {
      console.error('Error loading items:', error);
    }
  };

  const loadSellerProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('seller_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSellerProfile(data);
    } catch (error: any) {
      console.error('Error loading seller profile:', error);
    }
  };

  const loadPurchases = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('marketplace_purchases')
        .select(`
          *,
          item:marketplace_items(
            *,
            seller:seller_profiles(
              *,
              profile:profiles(full_name)
            )
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error: any) {
      console.error('Error loading purchases:', error);
    }
  };

  const loadFavorites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('marketplace_favorites')
        .select(`
          *,
          item:marketplace_items(
            *,
            seller:seller_profiles(
              *,
              profile:profiles(full_name)
            ),
            category:marketplace_categories(*)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data?.map(f => f.item) || []);
    } catch (error: any) {
      console.error('Error loading favorites:', error);
    }
  };

  const createSellerProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('seller_profiles')
        .insert({
          user_id: user.id,
          business_name: user.user_metadata?.full_name || 'My Store',
          bio: 'Welcome to my store! I create quality educational content.',
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      setSellerProfile(data);
      toast.success('Seller profile created successfully!');
    } catch (error: any) {
      console.error('Error creating seller profile:', error);
      toast.error('Failed to create seller profile');
    }
  };

  const toggleFavorite = async (itemId: string) => {
    if (!user) {
      toast.error('Please sign in to add favorites');
      return;
    }

    try {
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      if (item.is_favorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('marketplace_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', itemId);

        if (error) throw error;
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('marketplace_favorites')
          .insert({
            user_id: user.id,
            item_id: itemId
          });

        if (error) throw error;
        toast.success('Added to favorites');
      }

      // Update local state
      setItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, is_favorited: !i.is_favorited } : i
      ));

      // Reload favorites if on favorites view
      if (currentView === 'favorites') {
        loadFavorites();
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const purchaseItem = async (item: MarketplaceItem) => {
    if (!user) {
      toast.error('Please sign in to make purchases');
      return;
    }

    if (item.is_purchased) {
      toast.info('You already own this item');
      return;
    }

    try {
      // In a real app, this would integrate with Stripe or another payment processor
      const { data, error } = await supabase
        .from('marketplace_purchases')
        .insert({
          buyer_id: user.id,
          seller_id: item.seller_id,
          item_id: item.id,
          purchase_price: item.price,
          currency: item.currency,
          payment_method: 'stripe',
          payment_status: 'completed', // In real app, this would be 'pending' until payment confirms
          transaction_id: `txn_${Date.now()}`,
          download_limit: 5,
          downloads_used: 0
        })
        .select()
        .single();

      if (error) throw error;

      // Record analytics
      await supabase
        .from('marketplace_analytics')
        .insert({
          item_id: item.id,
          event_type: 'purchase',
          user_id: user.id,
          metadata: { price: item.price, currency: item.currency }
        });

      toast.success('Purchase successful! Item added to your library.');
      
      // Update local state
      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, is_purchased: true } : i
      ));

      loadPurchases();
    } catch (error: any) {
      console.error('Error purchasing item:', error);
      toast.error('Failed to complete purchase');
    }
  };

  const viewItem = async (item: MarketplaceItem) => {
    setSelectedItem(item);
    setShowItemModal(true);

    // Record view analytics
    try {
      await supabase
        .from('marketplace_analytics')
        .insert({
          item_id: item.id,
          event_type: 'view',
          user_id: user?.id,
          metadata: {}
        });

      // Update view count locally
      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, view_count: i.view_count + 1 } : i
      ));
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  // Filter and sort items
  const filteredItems = items
    .filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || item.difficulty_level === selectedDifficulty;
      const matchesPrice = item.price >= priceRange[0] && item.price <= priceRange[1];
      
      return matchesSearch && matchesCategory && matchesDifficulty && matchesPrice;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.download_count - a.download_count;
        case 'rating':
          return b.average_rating - a.average_rating;
        case 'price_low':
          return a.price - b.price;
        case 'price_high':
          return b.price - a.price;
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'quiz': return <Brain className="w-4 h-4" />;
      case 'flashcard_set': return <BookOpen className="w-4 h-4" />;
      case 'study_material': return <FileText className="w-4 h-4" />;
      case 'course': return <Target className="w-4 h-4" />;
      case 'template': return <Zap className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  // Item Detail Modal Component
  const ItemDetailModal = () => {
    if (!selectedItem) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col relative">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {getContentTypeIcon(selectedItem.content_type)}
                <span className="text-sm font-medium text-gray-600 capitalize">
                  {selectedItem.content_type.replace('_', ' ')}
                </span>
              </div>
              {selectedItem.featured && (
                <div className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                  <Crown className="w-3 h-3" />
                  <span>Featured</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowItemModal(false)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
              {/* Main Content */}
              <div className="lg:col-span-2 p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* Title and Description */}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">{selectedItem.title}</h1>
                    <p className="text-gray-700 leading-relaxed">{selectedItem.description}</p>
                  </div>

                  {/* Tags */}
                  {selectedItem.tags.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview Content */}
                  {selectedItem.preview_content && Object.keys(selectedItem.preview_content).length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Preview</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-600 text-sm">Preview content would be displayed here</p>
                      </div>
                    </div>
                  )}

                  {/* Seller Info */}
                  {selectedItem.seller && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">About the Seller</h3>
                      <div className="flex items-start space-x-4 bg-gray-50 rounded-lg p-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {selectedItem.seller.business_name || selectedItem.seller.profile?.full_name}
                          </h4>
                          {selectedItem.seller.bio && (
                            <p className="text-gray-600 text-sm mt-1">{selectedItem.seller.bio}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span>{selectedItem.seller.average_rating.toFixed(1)}</span>
                            </div>
                            <span>{selectedItem.seller.total_sales} sales</span>
                            {selectedItem.seller.verification_status === 'verified' && (
                              <div className="flex items-center space-x-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span>Verified</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1 bg-gray-50 p-6 border-l border-gray-200">
                <div className="space-y-6">
                  {/* Price and Purchase */}
                  <div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {formatPrice(selectedItem.price, selectedItem.currency)}
                    </div>
                    {selectedItem.original_price && selectedItem.original_price > selectedItem.price && (
                      <div className="text-sm text-gray-500 line-through">
                        {formatPrice(selectedItem.original_price, selectedItem.currency)}
                      </div>
                    )}
                    
                    <div className="mt-4 space-y-3">
                      {selectedItem.is_purchased ? (
                        <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">You own this item</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => purchaseItem(selectedItem)}
                          className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center space-x-2"
                        >
                          <ShoppingCart className="w-5 h-5" />
                          <span>Purchase Now</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => toggleFavorite(selectedItem.id)}
                        className={`w-full py-3 px-4 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 ${
                          selectedItem.is_favorited
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Heart className={`w-5 h-5 ${selectedItem.is_favorited ? 'fill-current' : ''}`} />
                        <span>{selectedItem.is_favorited ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Statistics</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Downloads:</span>
                        <span className="font-medium text-gray-900">{selectedItem.download_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Views:</span>
                        <span className="font-medium text-gray-900">{selectedItem.view_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Favorites:</span>
                        <span className="font-medium text-gray-900">{selectedItem.favorite_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Rating:</span>
                        <div className="flex items-center space-x-1">
                          <div className="flex items-center">
                            {renderStars(selectedItem.average_rating)}
                          </div>
                          <span className="font-medium text-gray-900">
                            ({selectedItem.total_reviews})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Details</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Difficulty:</span>
                        <span className="font-medium text-gray-900 capitalize">{selectedItem.difficulty_level}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Subject:</span>
                        <span className="font-medium text-gray-900">{selectedItem.subject}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Language:</span>
                        <span className="font-medium text-gray-900">{selectedItem.language.toUpperCase()}</span>
                      </div>
                      {selectedItem.file_size && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">File Size:</span>
                          <span className="font-medium text-gray-900">
                            {(selectedItem.file_size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading marketplace...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
            <p className="text-gray-600">Discover and sell educational content</p>
          </div>
          <div className="flex items-center space-x-4">
            {!sellerProfile && (
              <button
                onClick={createSellerProfile}
                className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Become a Seller</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-8">
        <div className="flex space-x-8">
          {[
            { id: 'browse', label: 'Browse', icon: ShoppingBag },
            { id: 'purchases', label: 'My Purchases', icon: Package },
            { id: 'favorites', label: 'Favorites', icon: Heart },
            ...(sellerProfile ? [{ id: 'sell', label: 'Sell', icon: DollarSign }] : [])
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  currentView === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Browse View */}
      {currentView === 'browse' && (
        <>
          {/* Filters */}
          <div className="bg-white border-b border-gray-200 px-8 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search marketplace..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                {/* Difficulty Filter */}
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="newest">Newest</option>
                  <option value="popular">Most Popular</option>
                  <option value="rating">Highest Rated</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Items Grid/List */}
          <div className="p-8">
            {filteredItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No items found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search or filter criteria
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedDifficulty('all');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                    {/* Thumbnail */}
                    <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-white text-4xl">
                          {getContentTypeIcon(item.content_type)}
                        </div>
                      )}
                      
                      {/* Overlay Actions */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => viewItem(item)}
                            className="p-2 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleFavorite(item.id)}
                            className={`p-2 rounded-full transition-colors ${
                              item.is_favorited
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-white text-gray-900 hover:bg-gray-100'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${item.is_favorited ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Featured Badge */}
                      {item.featured && (
                        <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                          <Crown className="w-3 h-3" />
                          <span>Featured</span>
                        </div>
                      )}

                      {/* Purchased Badge */}
                      {item.is_purchased && (
                        <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>Owned</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        {getContentTypeIcon(item.content_type)}
                        <span className="text-xs font-medium text-gray-500 capitalize">
                          {item.content_type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs font-medium text-gray-500 capitalize">
                          {item.difficulty_level}
                        </span>
                      </div>

                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>

                      {/* Rating */}
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="flex items-center">
                          {renderStars(item.average_rating)}
                        </div>
                        <span className="text-sm text-gray-500">
                          ({item.total_reviews})
                        </span>
                      </div>

                      {/* Price and Actions */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-bold text-gray-900">
                            {formatPrice(item.price, item.currency)}
                          </div>
                          {item.original_price && item.original_price > item.price && (
                            <div className="text-xs text-gray-500 line-through">
                              {formatPrice(item.original_price, item.currency)}
                            </div>
                          )}
                        </div>
                        
                        {item.is_purchased ? (
                          <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            <span>Owned</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => purchaseItem(item)}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-1"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            <span>Buy</span>
                          </button>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Download className="w-3 h-3" />
                          <span>{item.download_count}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Eye className="w-3 h-3" />
                          <span>{item.view_count}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-3 h-3" />
                          <span>{item.favorite_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50 text-sm font-medium text-gray-700">
                  <div className="col-span-6">Item</div>
                  <div className="col-span-2">Price</div>
                  <div className="col-span-2">Rating</div>
                  <div className="col-span-1">Downloads</div>
                  <div className="col-span-1">Actions</div>
                </div>
                {filteredItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                    <div className="col-span-6 flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        {item.thumbnail_url ? (
                          <img
                            src={item.thumbnail_url}
                            alt={item.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="text-white text-xl">
                            {getContentTypeIcon(item.content_type)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                          {item.featured && (
                            <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                          )}
                          {item.is_purchased && (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">{item.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          {getContentTypeIcon(item.content_type)}
                          <span className="text-xs text-gray-400 capitalize">
                            {item.content_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-400 capitalize">
                            {item.difficulty_level}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center">
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatPrice(item.price, item.currency)}
                        </div>
                        {item.original_price && item.original_price > item.price && (
                          <div className="text-xs text-gray-500 line-through">
                            {formatPrice(item.original_price, item.currency)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          {renderStars(item.average_rating)}
                        </div>
                        <span className="text-sm text-gray-500">
                          ({item.total_reviews})
                        </span>
                      </div>
                    </div>
                    <div className="col-span-1 flex items-center">
                      <span className="text-sm text-gray-600">{item.download_count}</span>
                    </div>
                    <div className="col-span-1 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => viewItem(item)}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleFavorite(item.id)}
                        className={`p-1 transition-colors ${
                          item.is_favorited
                            ? 'text-red-500 hover:text-red-600'
                            : 'text-gray-400 hover:text-red-500'
                        }`}
                        title={item.is_favorited ? "Remove from Favorites" : "Add to Favorites"}
                      >
                        <Heart className={`w-4 h-4 ${item.is_favorited ? 'fill-current' : ''}`} />
                      </button>
                      {!item.is_purchased && (
                        <button
                          onClick={() => purchaseItem(item)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Purchase"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Purchases View */}
      {currentView === 'purchases' && (
        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">My Purchases</h2>
            <p className="text-gray-600">Items you've purchased from the marketplace</p>
          </div>

          {purchases.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No purchases yet</h3>
              <p className="text-gray-600 mb-6">
                Browse the marketplace to find educational content
              </p>
              <button
                onClick={() => setCurrentView('browse')}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50 text-sm font-medium text-gray-700">
                <div className="col-span-5">Item</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Purchase Date</div>
                <div className="col-span-1">Actions</div>
              </div>
              {purchases.map((purchase) => (
                <div key={purchase.id} className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="col-span-5 flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      {purchase.item?.thumbnail_url ? (
                        <img
                          src={purchase.item.thumbnail_url}
                          alt={purchase.item.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-white">
                          {getContentTypeIcon(purchase.item?.content_type || 'quiz')}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 truncate">{purchase.item?.title}</h3>
                      <p className="text-sm text-gray-500">
                        by {purchase.item?.seller?.business_name || purchase.item?.seller?.profile?.full_name}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="font-medium text-gray-900">
                      {formatPrice(purchase.purchase_price, purchase.currency)}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <div className={`flex items-center space-x-2 ${
                      purchase.payment_status === 'completed' ? 'text-green-600' :
                      purchase.payment_status === 'pending' ? 'text-yellow-600' :
                      purchase.payment_status === 'failed' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {purchase.payment_status === 'completed' && <CheckCircle className="w-4 h-4" />}
                      {purchase.payment_status === 'pending' && <Clock className="w-4 h-4" />}
                      {purchase.payment_status === 'failed' && <AlertCircle className="w-4 h-4" />}
                      <span className="capitalize font-medium">{purchase.payment_status}</span>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-gray-600">
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    {purchase.payment_status === 'completed' && (
                      <button
                        onClick={() => purchase.item && viewItem(purchase.item)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View Item"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Favorites View */}
      {currentView === 'favorites' && (
        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">My Favorites</h2>
            <p className="text-gray-600">Items you've saved for later</p>
          </div>

          {favorites.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No favorites yet</h3>
              <p className="text-gray-600 mb-6">
                Add items to your favorites while browsing
              </p>
              <button
                onClick={() => setCurrentView('browse')}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favorites.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                  {/* Thumbnail */}
                  <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-white text-4xl">
                        {getContentTypeIcon(item.content_type)}
                      </div>
                    )}
                    
                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => viewItem(item)}
                          className="p-2 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleFavorite(item.id)}
                          className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <Heart className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    </div>

                    {/* Favorited Badge */}
                    <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                      <Heart className="w-3 h-3 fill-current" />
                      <span>Favorited</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      {getContentTypeIcon(item.content_type)}
                      <span className="text-xs font-medium text-gray-500 capitalize">
                        {item.content_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs font-medium text-gray-500 capitalize">
                        {item.difficulty_level}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>

                    {/* Rating */}
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="flex items-center">
                        {renderStars(item.average_rating)}
                      </div>
                      <span className="text-sm text-gray-500">
                        ({item.total_reviews})
                      </span>
                    </div>

                    {/* Price and Actions */}
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-gray-900">
                        {formatPrice(item.price, item.currency)}
                      </div>
                      
                      {item.is_purchased ? (
                        <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          <span>Owned</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => purchaseItem(item)}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-1"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>Buy</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sell View */}
      {currentView === 'sell' && sellerProfile && (
        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Seller Dashboard</h2>
            <p className="text-gray-600">Manage your marketplace listings and sales</p>
          </div>

          {/* Seller Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPrice(sellerProfile.total_revenue)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{sellerProfile.total_sales}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Average Rating</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {sellerProfile.average_rating.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Reviews</p>
                  <p className="text-2xl font-bold text-gray-900">{sellerProfile.total_reviews}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon Message */}
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Seller Tools Coming Soon</h3>
            <p className="text-gray-600 mb-6">
              We're building powerful tools for sellers to create and manage their listings. Stay tuned!
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
              <h4 className="font-medium text-blue-900 mb-2">What's Coming:</h4>
              <ul className="text-sm text-blue-800 space-y-1 text-left">
                <li>• Create and edit marketplace listings</li>
                <li>• Upload and manage content</li>
                <li>• Set pricing and discounts</li>
                <li>• View detailed analytics</li>
                <li>• Manage customer reviews</li>
                <li>• Track sales and revenue</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {showItemModal && <ItemDetailModal />}
    </div>
  );
};

export default MarketplaceManager;