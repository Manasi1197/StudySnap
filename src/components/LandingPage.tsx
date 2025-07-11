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
  Zap
} from 'lucide-react';

interface LandingPageProps {
  onAuthAction: (mode: 'signin' | 'signup') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onAuthAction }) => {
  const features = [
    {
      icon: Camera,
      title: 'Smart Quiz Generator',
      description: 'Turn your notes and images into interactive quizzes with AI magic',
      color: 'bg-yellow-400',
      textColor: 'text-gray-900'
    },
    {
      icon: Users,
      title: 'AI Study Rooms',
      description: 'Collaborate with peers in AI-powered group study sessions',
      color: 'bg-orange-400',
      textColor: 'text-white'
    },
    {
      icon: DollarSign,
      title: 'Monetize Materials',
      description: 'Share your study materials and earn money from your knowledge',
      color: 'bg-green-400',
      textColor: 'text-gray-900'
    },
    {
      icon: Trophy,
      title: 'Gamified Learning',
      description: 'Level up your studying with achievements and progress tracking',
      color: 'bg-pink-400',
      textColor: 'text-white'
    }
  ];

  const stats = [
    { number: '50K+', label: 'Active Students' },
    { number: '1M+', label: 'Quizzes Generated' },
    { number: '95%', label: 'Grade Improvement' },
    { number: '24/7', label: 'AI Support' }
  ];

  const studyGroups = [
    {
      name: 'Math Wizards',
      students: 34,
      color: 'bg-green-400',
      image: 'https://images.pexels.com/photos/5212700/pexels-photo-5212700.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
    },
    {
      name: 'Chemistry Club',
      students: 22,
      color: 'bg-pink-400',
      image: 'https://images.pexels.com/photos/5212361/pexels-photo-5212361.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
    }
  ];

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-yellow-200 rounded-full opacity-20 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-pink-200 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-100 rounded-full opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="relative z-10">
              <div className="inline-flex items-center px-4 py-2 bg-yellow-100 text-gray-900 rounded-full text-sm font-medium mb-8 animate-bounce">
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
                Join our study community and embark on a visual journey where creativity knows no bounds. Together, we shape the future of learning.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => onAuthAction('signup')}
                  className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center group"
                >
                  Get Started
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

            {/* Right Content - Study Groups */}
            <div className="relative lg:pl-8">
              {/* Main Study Group Card */}
              <div className="bg-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden transform hover:scale-105 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900"></div>
                <div className="relative z-10">
                  <img 
                    src="https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop"
                    alt="Students studying together"
                    className="w-full h-64 object-cover rounded-2xl mb-6 transform hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Floating Tags */}
                  <div className="absolute top-4 left-4 space-y-2">
                    <span className="inline-block bg-pink-400 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                      # GraphicDesign
                    </span>
                    <span className="inline-block bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-sm font-medium animate-pulse" style={{ animationDelay: '0.5s' }}>
                      # PrintDesign
                    </span>
                    <span className="inline-block bg-green-400 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse" style={{ animationDelay: '1s' }}>
                      # DigitalIllustration
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Study Group Cards - Only Green and Pink */}
              <div className="absolute -bottom-8 -right-4 space-y-3 z-20">
                {studyGroups.map((group, index) => (
                  <div 
                    key={index} 
                    className={`${group.color} rounded-2xl p-4 shadow-xl transform transition-all duration-500 hover:scale-110 hover:rotate-0 w-72 animate-float`}
                    style={{
                      transform: `translateY(${index * -8}px) rotate(${index === 0 ? '-1deg' : '1deg'})`,
                      animationDelay: `${index * 0.5}s`,
                      animationDuration: `${3 + index * 0.5}s`
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex -space-x-2 flex-shrink-0">
                        <img src={group.image} alt="Student" className="w-8 h-8 rounded-full border-2 border-white animate-pulse" />
                        <img src={group.image} alt="Student" className="w-8 h-8 rounded-full border-2 border-white animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <img src={group.image} alt="Student" className="w-8 h-8 rounded-full border-2 border-white animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-sm truncate">{group.name}</h4>
                        <p className="text-white/80 text-xs">Number of students: {group.students}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white flex-shrink-0 animate-bounce" style={{ animationDelay: `${index * 0.3}s` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-green-400 rounded-full flex items-center justify-center shadow-lg z-10 animate-spin-slow">
                <Zap className="w-8 h-8 text-white" />
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
              <div key={index} className="text-center transform hover:scale-105 transition-transform duration-300">
                <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 animate-pulse" style={{ animationDelay: `${index * 0.2}s` }}>
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
              Discover the tools that make studying efficient, engaging, and profitable
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-gray-200 transform hover:-translate-y-4 hover:rotate-1"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 shadow-lg animate-pulse`}>
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

      {/* CTA Section */}
      <section className="py-24 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-64 h-64 bg-orange-400 rounded-full opacity-10 blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-pink-400 rounded-full opacity-10 blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
            Ready to Transform Your
            <span className="block text-yellow-400 animate-pulse">Study Game? ✱</span>
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands of students who've already revolutionized their learning experience
          </p>
          <button 
            onClick={() => onAuthAction('signup')}
            className="bg-white text-gray-900 px-10 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 animate-bounce"
          >
            Start Your Journey
          </button>
        </div>
      </section>

      {/* Powered by Bolt Logo */}
      <a
        href="https://bolt.new/"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 w-16 h-16 z-50 shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 rounded-full overflow-hidden"
        title="Powered by Bolt"
      >
        <img
          src="https://miro.medium.com/v2/resize:fit:640/format:webp/1*LlNfz7KJNDNv9ssKim-6qQ.png"
          alt="Powered by Bolt"
          className="w-full h-full object-cover"
        />
      </a>

      {/* Custom CSS for additional animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(-1deg);
          }
          50% {
            transform: translateY(-10px) rotate(1deg);
          }
        }
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        
        /* Staggered animation delays for floating cards */
        .animate-float:nth-child(1) {
          animation-delay: 0s;
        }
        
        .animate-float:nth-child(2) {
          animation-delay: 0.5s;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;