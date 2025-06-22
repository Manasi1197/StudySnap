import React from 'react';
import { 
  Brain, 
  Users, 
  Trophy, 
  DollarSign, 
  ArrowRight, 
  Star,
  Camera,
  MessageSquare,
  Target,
  TrendingUp,
  Sparkles,
  BookOpen,
  Zap,
  Volume2,
  FileText,
  Award
} from 'lucide-react';

interface LandingPageProps {
  onAuthAction: (mode: 'signin' | 'signup') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onAuthAction }) => {
  const features = [
    {
      icon: Brain,
      title: 'AI Quiz Generator',
      description: 'Transform your notes, images, and PDFs into interactive quizzes with advanced AI technology',
      color: 'bg-yellow-400',
      textColor: 'text-gray-900'
    },
    {
      icon: Volume2,
      title: 'AI Audio Guides',
      description: 'Generate personalized audio revision guides from your study materials using AI voice synthesis',
      color: 'bg-purple-400',
      textColor: 'text-white'
    },
    {
      icon: Users,
      title: 'Study Rooms',
      description: 'Collaborate with peers in real-time study sessions and share materials instantly',
      color: 'bg-orange-400',
      textColor: 'text-white'
    },
    {
      icon: DollarSign,
      title: 'Marketplace',
      description: 'Monetize your study materials by selling quizzes and flashcards to other students',
      color: 'bg-green-400',
      textColor: 'text-gray-900'
    }
  ];

  const stats = [
    { number: '10K+', label: 'Active Students' },
    { number: '50K+', label: 'Quizzes Generated' },
    { number: '98%', label: 'Success Rate' },
    { number: '24/7', label: 'AI Support' }
  ];

  const studyFeatures = [
    {
      name: 'Smart Flashcards',
      description: 'AI-generated flashcards from your content',
      color: 'bg-blue-400',
      icon: '🧠'
    },
    {
      name: 'Progress Tracking',
      description: 'Monitor your learning journey with detailed analytics',
      color: 'bg-green-400',
      icon: '📊'
    },
    {
      name: 'Achievement System',
      description: 'Earn badges and level up as you study',
      color: 'bg-pink-400',
      icon: '🏆'
    }
  ];

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-yellow-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-pink-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-100 rounded-full opacity-10 blur-3xl"></div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="relative z-10">
              <div className="inline-flex items-center px-4 py-2 bg-yellow-100 text-gray-900 rounded-full text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4 mr-2 text-yellow-600" />
                AI-Powered Study Revolution
              </div>
              
              <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
                Study
                <span className="block">
                  <span className="text-orange-400">Smart</span> ✦ ✱
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-lg">
                Transform any content into interactive quizzes, flashcards, and audio guides with AI. Study smarter, not harder with StudySnap.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => onAuthAction('signup')}
                  className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center group"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => onAuthAction('signin')}
                  className="bg-white text-gray-900 px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-gray-200"
                >
                  Sign In
                </button>
              </div>
            </div>

            {/* Right Content - Study Features Demo */}
            <div className="relative">
              {/* Main Demo Card */}
              <div className="bg-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900"></div>
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-orange-400 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white font-semibold">StudySnap AI</span>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-6 mb-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Brain className="w-6 h-6 text-purple-600" />
                      <span className="font-semibold text-gray-900">Quiz Generated!</span>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-700">What is photosynthesis?</p>
                        <div className="mt-2 space-y-1">
                          <div className="text-xs text-green-600">✓ A) Process plants use to make food</div>
                          <div className="text-xs text-gray-500">B) Animal respiration</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>10 questions generated</span>
                        <span>5 flashcards created</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating Feature Tags */}
                  <div className="absolute top-4 right-4 space-y-2">
                    <span className="inline-block bg-purple-400 text-white px-3 py-1 rounded-full text-sm font-medium">
                      AI Audio
                    </span>
                    <span className="inline-block bg-blue-400 text-white px-3 py-1 rounded-full text-sm font-medium block">
                      Smart Flashcards
                    </span>
                    <span className="inline-block bg-green-400 text-white px-3 py-1 rounded-full text-sm font-medium block">
                      Progress Tracking
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Feature Cards */}
              <div className="absolute -bottom-6 -right-6 space-y-4">
                {studyFeatures.map((feature, index) => (
                  <div key={index} className={`${feature.color} rounded-2xl p-4 shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300`}>
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{feature.icon}</span>
                      <div>
                        <h4 className="font-bold text-white text-sm">{feature.name}</h4>
                        <p className="text-white/80 text-xs">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-green-400 rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Everything You Need to
              <span className="block text-orange-400">Excel ✦</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover the AI-powered tools that make studying efficient, engaging, and effective
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-gray-200 transform hover:-translate-y-2"
                >
                  <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <Icon className={`w-8 h-8 ${feature.textColor}`} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              How StudySnap
              <span className="block text-purple-400">Works ✱</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get started in minutes with our simple 3-step process
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Camera className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Upload Content</h3>
              <p className="text-gray-600 leading-relaxed">
                Upload your notes, images, PDFs, or paste text directly. Our AI supports multiple formats and languages.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">2. AI Generates</h3>
              <p className="text-gray-600 leading-relaxed">
                Our advanced AI analyzes your content and automatically creates quizzes, flashcards, and audio guides.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Study & Excel</h3>
              <p className="text-gray-600 leading-relaxed">
                Study with interactive materials, track your progress, and achieve better results with personalized learning.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-64 h-64 bg-orange-400 rounded-full opacity-10 blur-2xl"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-pink-400 rounded-full opacity-10 blur-2xl"></div>
        </div>
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
            Ready to Transform Your
            <span className="block text-yellow-400">Study Experience? ✱</span>
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands of students who've already revolutionized their learning with AI-powered study tools
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => onAuthAction('signup')}
              className="bg-white text-gray-900 px-10 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Start Learning for Free
            </button>
            <button 
              onClick={() => onAuthAction('signin')}
              className="bg-transparent border-2 border-white text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-white hover:text-gray-900 transition-all duration-300"
            >
              Sign In
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-6">
            No credit card required • Free forever plan available • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;