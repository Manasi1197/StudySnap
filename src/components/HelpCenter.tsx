import React, { useState } from 'react';
import { 
  Search, 
  Book, 
  MessageCircle, 
  Mail, 
  Phone, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight, 
  HelpCircle, 
  FileText, 
  Video, 
  Users, 
  Zap, 
  Shield, 
  CreditCard, 
  Settings, 
  Star, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  ArrowRight, 
  Download, 
  Play, 
  Bookmark, 
  ThumbsUp, 
  ThumbsDown, 
  Send, 
  X, 
  Plus, 
  Minus,
  Globe,
  Smartphone,
  Monitor,
  Headphones
} from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  notHelpful: number;
}

interface Article {
  id: string;
  title: string;
  description: string;
  category: string;
  readTime: number;
  views: number;
  lastUpdated: string;
  featured: boolean;
}

interface HelpCenterProps {
  onNavigate?: (page: string) => void;
}

const HelpCenter: React.FC<HelpCenterProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'medium'
  });
  const [activeTab, setActiveTab] = useState('overview');

  const categories = [
    { id: 'all', label: 'All Topics', icon: Book, color: 'bg-blue-500' },
    { id: 'getting-started', label: 'Getting Started', icon: Zap, color: 'bg-green-500' },
    { id: 'quizzes', label: 'Quizzes & Study', icon: FileText, color: 'bg-purple-500' },
    { id: 'account', label: 'Account & Billing', icon: CreditCard, color: 'bg-orange-500' },
    { id: 'technical', label: 'Technical Issues', icon: Settings, color: 'bg-red-500' },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield, color: 'bg-indigo-500' },
    { id: 'marketplace', label: 'Marketplace', icon: Users, color: 'bg-pink-500' }
  ];

  const faqs: FAQItem[] = [
    {
      id: '1',
      question: 'How do I create my first quiz?',
      answer: 'To create your first quiz, navigate to the Quiz Generator from your dashboard. You can upload study materials (images, PDFs, or text files) or paste text directly. Our AI will analyze your content and generate questions, flashcards, and even audio guides automatically.',
      category: 'getting-started',
      helpful: 45,
      notHelpful: 2
    },
    {
      id: '2',
      question: 'What file types can I upload?',
      answer: 'StudySnap supports various file types including images (PNG, JPG, JPEG, GIF, BMP), PDF documents, and text files (TXT, MD). Each file can be up to 10MB in size. Our AI can extract text from images and PDFs to create study materials.',
      category: 'quizzes',
      helpful: 38,
      notHelpful: 1
    },
    {
      id: '3',
      question: 'How does the AI audio generation work?',
      answer: 'Our AI audio feature uses advanced text-to-speech technology to create personalized study guides. It analyzes your quiz content and flashcards to generate a comprehensive audio revision guide that you can listen to anywhere.',
      category: 'quizzes',
      helpful: 52,
      notHelpful: 3
    },
    {
      id: '4',
      question: 'Can I share my study materials with others?',
      answer: 'Yes! You can share your quizzes and flashcards with other users. You can also create study rooms where multiple users can collaborate and share materials in real-time.',
      category: 'getting-started',
      helpful: 29,
      notHelpful: 1
    },
    {
      id: '5',
      question: 'How do I join a study room?',
      answer: 'To join a study room, you can either browse public rooms from the Study Rooms section or enter a specific room code if you have one. Once joined, you can participate in discussions, share materials, and collaborate with other learners.',
      category: 'getting-started',
      helpful: 33,
      notHelpful: 0
    },
    {
      id: '6',
      question: 'What are achievements and how do I earn them?',
      answer: 'Achievements are milestones that track your learning progress. You can earn them by completing quizzes, maintaining study streaks, uploading materials, and participating in study rooms. Each achievement awards points that contribute to your overall level.',
      category: 'account',
      helpful: 41,
      notHelpful: 2
    },
    {
      id: '7',
      question: 'How can I sell my study materials?',
      answer: 'To sell study materials, you need to create a seller profile in the Marketplace section. Once approved, you can list your quizzes, flashcards, and study guides for sale. Set your own prices and earn revenue from your educational content.',
      category: 'marketplace',
      helpful: 27,
      notHelpful: 4
    },
    {
      id: '8',
      question: 'Is my data secure and private?',
      answer: 'Yes, we take data security seriously. All your study materials and personal information are encrypted and stored securely. You can control your privacy settings and choose what information to share publicly.',
      category: 'privacy',
      helpful: 56,
      notHelpful: 1
    },
    {
      id: '9',
      question: 'Why is my quiz generation taking so long?',
      answer: 'Quiz generation typically takes 30-60 seconds depending on the content length and complexity. If it\'s taking longer, check your internet connection and ensure your content meets the minimum word requirements (50+ words).',
      category: 'technical',
      helpful: 22,
      notHelpful: 5
    },
    {
      id: '10',
      question: 'How do I change my subscription plan?',
      answer: 'You can upgrade or downgrade your subscription plan from the Account Management section in Settings. Changes take effect immediately for upgrades and at the next billing cycle for downgrades.',
      category: 'account',
      helpful: 18,
      notHelpful: 1
    }
  ];

  const articles: Article[] = [
    {
      id: '1',
      title: 'Complete Guide to Quiz Generation',
      description: 'Learn how to create effective quizzes using AI, from uploading materials to customizing question types.',
      category: 'getting-started',
      readTime: 8,
      views: 1250,
      lastUpdated: '2024-01-15',
      featured: true
    },
    {
      id: '2',
      title: 'Maximizing Your Study Sessions',
      description: 'Tips and strategies for effective studying using flashcards, audio guides, and spaced repetition.',
      category: 'quizzes',
      readTime: 6,
      views: 980,
      lastUpdated: '2024-01-12',
      featured: true
    },
    {
      id: '3',
      title: 'Setting Up Your Seller Profile',
      description: 'Step-by-step guide to becoming a seller and monetizing your study materials.',
      category: 'marketplace',
      readTime: 5,
      views: 750,
      lastUpdated: '2024-01-10',
      featured: false
    },
    {
      id: '4',
      title: 'Privacy Settings and Data Control',
      description: 'Understanding your privacy options and how to control your data sharing preferences.',
      category: 'privacy',
      readTime: 4,
      views: 650,
      lastUpdated: '2024-01-08',
      featured: false
    },
    {
      id: '5',
      title: 'Troubleshooting Common Issues',
      description: 'Solutions to frequently encountered technical problems and error messages.',
      category: 'technical',
      readTime: 7,
      views: 890,
      lastUpdated: '2024-01-14',
      featured: false
    },
    {
      id: '6',
      title: 'Understanding Your Dashboard',
      description: 'Navigate your dashboard effectively and make the most of all available features.',
      category: 'getting-started',
      readTime: 5,
      views: 1100,
      lastUpdated: '2024-01-13',
      featured: true
    }
  ];

  const quickActions = [
    {
      title: 'Video Tutorials',
      description: 'Watch step-by-step video guides',
      icon: Video,
      color: 'bg-red-500',
      action: () => {}
    },
    {
      title: 'Live Chat',
      description: 'Get instant help from our support team',
      icon: MessageCircle,
      color: 'bg-green-500',
      action: () => setShowContactForm(true)
    },
    {
      title: 'Community Forum',
      description: 'Connect with other users',
      icon: Users,
      color: 'bg-blue-500',
      action: () => {}
    },
    {
      title: 'System Status',
      description: 'Check service availability',
      icon: Monitor,
      color: 'bg-orange-500',
      action: () => {}
    }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate form submission
    setTimeout(() => {
      setShowContactForm(false);
      setContactForm({ name: '', email: '', subject: '', message: '', priority: 'medium' });
      toast.success('Your message has been sent! We\'ll get back to you within 24 hours.');
    }, 1000);
  };

  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold mb-4">How can we help you today?</h1>
          <p className="text-blue-100 mb-6">
            Find answers to your questions, browse our guides, or get in touch with our support team.
          </p>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for help articles, FAQs, or guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-300 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className="p-6 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 text-left group"
              >
                <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured Articles */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Featured Articles</h2>
          <button
            onClick={() => setActiveTab('articles')}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
          >
            <span>View all articles</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.filter(article => article.featured).map((article) => (
            <div key={article.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center space-x-2 mb-3">
                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-medium capitalize">
                  {article.category.replace('-', ' ')}
                </span>
                <span className="text-xs text-gray-500">{article.readTime} min read</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{article.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{article.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{article.views} views</span>
                <span>Updated {new Date(article.lastUpdated).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular FAQs */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Popular Questions</h2>
          <button
            onClick={() => setActiveTab('faq')}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
          >
            <span>View all FAQs</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          {faqs.slice(0, 5).map((faq) => (
            <div key={faq.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <button
                onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                {expandedFAQ === faq.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {expandedFAQ === faq.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">Was this helpful?</span>
                      <div className="flex items-center space-x-2">
                        <button className="flex items-center space-x-1 text-green-600 hover:text-green-700">
                          <ThumbsUp className="w-4 h-4" />
                          <span className="text-sm">{faq.helpful}</span>
                        </button>
                        <button className="flex items-center space-x-1 text-red-600 hover:text-red-700">
                          <ThumbsDown className="w-4 h-4" />
                          <span className="text-sm">{faq.notHelpful}</span>
                        </button>
                      </div>
                    </div>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs capitalize">
                      {faq.category.replace('-', ' ')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFAQTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h2>
        <p className="text-gray-600">Find quick answers to common questions about StudySnap.</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{category.label}</span>
            </button>
          );
        })}
      </div>

      {/* FAQ List */}
      <div className="space-y-4">
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No questions found</h3>
            <p className="text-gray-600">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          filteredFAQs.map((faq) => (
            <div key={faq.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <button
                onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                {expandedFAQ === faq.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {expandedFAQ === faq.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">Was this helpful?</span>
                      <div className="flex items-center space-x-2">
                        <button className="flex items-center space-x-1 text-green-600 hover:text-green-700">
                          <ThumbsUp className="w-4 h-4" />
                          <span className="text-sm">{faq.helpful}</span>
                        </button>
                        <button className="flex items-center space-x-1 text-red-600 hover:text-red-700">
                          <ThumbsDown className="w-4 h-4" />
                          <span className="text-sm">{faq.notHelpful}</span>
                        </button>
                      </div>
                    </div>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs capitalize">
                      {faq.category.replace('-', ' ')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderArticlesTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Help Articles & Guides</h2>
        <p className="text-gray-600">Comprehensive guides to help you make the most of StudySnap.</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{category.label}</span>
            </button>
          );
        })}
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArticles.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-600">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          filteredArticles.map((article) => (
            <div key={article.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer">
              <div className="flex items-center space-x-2 mb-3">
                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-medium capitalize">
                  {article.category.replace('-', ' ')}
                </span>
                {article.featured && (
                  <span className="bg-yellow-100 text-yellow-600 px-2 py-1 rounded-full text-xs font-medium">
                    Featured
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{article.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{article.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{article.readTime} min</span>
                  </span>
                  <span>{article.views} views</span>
                </div>
                <span>Updated {new Date(article.lastUpdated).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderContactTab = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Support</h2>
        <p className="text-gray-600">Can't find what you're looking for? Get in touch with our support team.</p>
      </div>

      {/* Contact Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
          <p className="text-sm text-gray-600 mb-4">Get instant help from our support team</p>
          <p className="text-xs text-gray-500 mb-4">Available 24/7</p>
          <button
            onClick={() => setShowContactForm(true)}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
          >
            Start Chat
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
          <p className="text-sm text-gray-600 mb-4">Send us a detailed message</p>
          <p className="text-xs text-gray-500 mb-4">Response within 24 hours</p>
          <button
            onClick={() => setShowContactForm(true)}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Send Email
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Community Forum</h3>
          <p className="text-sm text-gray-600 mb-4">Connect with other users</p>
          <p className="text-xs text-gray-500 mb-4">Get help from the community</p>
          <button className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors">
            Visit Forum
          </button>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Other Ways to Reach Us</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">Email</p>
              <p className="text-sm text-gray-600">support@studysnap.com</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Phone className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">Phone</p>
              <p className="text-sm text-gray-600">+1 (555) 123-4567</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">Support Hours</p>
              <p className="text-sm text-gray-600">24/7 for chat, Mon-Fri 9AM-6PM for phone</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Globe className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">Status Page</p>
              <p className="text-sm text-gray-600">status.studysnap.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Contact Form Modal
  const ContactFormModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setShowContactForm(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Support</h2>
          <p className="text-gray-600">Tell us how we can help you today</p>
        </div>

        <form onSubmit={handleContactSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={contactForm.name}
                onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={contactForm.priority}
              onChange={(e) => setContactForm(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low - General question</option>
              <option value="medium">Medium - Need assistance</option>
              <option value="high">High - Urgent issue</option>
              <option value="critical">Critical - Service down</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={contactForm.subject}
              onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of your issue"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={contactForm.message}
              onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
              rows={6}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Please provide as much detail as possible about your issue..."
              required
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setShowContactForm(false)}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Send Message</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Book },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'articles', label: 'Articles', icon: FileText },
    { id: 'contact', label: 'Contact', icon: MessageCircle }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
            <p className="text-gray-600">Find answers, guides, and get support for StudySnap</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
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

      {/* Content */}
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'faq' && renderFAQTab()}
          {activeTab === 'articles' && renderArticlesTab()}
          {activeTab === 'contact' && renderContactTab()}
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && <ContactFormModal />}
    </div>
  );
};

export default HelpCenter;