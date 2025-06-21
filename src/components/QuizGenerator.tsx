import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  Image, 
  Brain, 
  Wand2, 
  CheckCircle, 
  XCircle, 
  Play,
  RotateCcw,
  Download,
  Share2,
  Settings,
  Languages,
  Video,
  ArrowLeft,
  ArrowRight,
  Clock,
  Target,
  Zap,
  BookOpen,
  Camera,
  Type,
  Sparkles,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Plus
} from 'lucide-react';
import { useQuizGenerator } from '../hooks/useQuizGenerator';
import { generateVideoWithTavus } from '../lib/tavus';
import VideoPlayer from './VideoPlayer';
import FlashcardsViewer from './FlashcardsViewer';
import QuizTaker from './QuizTaker';
import toast from 'react-hot-toast';

const QuizGenerator: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [activeSubView, setActiveSubView] = useState<'none' | 'video' | 'flashcards' | 'take-quiz'>('none');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showSettings, setShowSettings] = useState(false);
  const [showNewQuizConfirmation, setShowNewQuizConfirmation] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [quizSettings, setQuizSettings] = useState({
    questionCount: 10,
    difficulty: 'mixed',
    includeFlashcards: true,
    questionTypes: ['multiple-choice', 'true-false', 'fill-blank'],
    language: 'en'
  });

  const {
    uploadedFiles,
    textInput,
    setTextInput,
    generatedQuiz,
    isGenerating,
    processFile,
    generateQuiz,
    addFiles,
    removeFile,
    reset
  } = useQuizGenerator();

  // Calculate total content length for minimum word validation
  const getTotalContentLength = () => {
    const allContent = [
      textInput,
      ...uploadedFiles.map(f => f.content)
    ].filter(Boolean).join(' ');
    
    return allContent.trim().split(/\s+/).length;
  };

  const MIN_WORDS_REQUIRED = 50; // Minimum 50 words required
  const totalWords = getTotalContentLength();
  const hasMinimumContent = totalWords >= MIN_WORDS_REQUIRED;

  // File upload handling
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' as const : 
            file.type === 'application/pdf' ? 'pdf' as const : 'text' as const,
      content: '',
      size: file.size,
      processingStatus: 'pending' as const
    }));

    addFiles(newFiles);
    
    // Process each file
    newFiles.forEach((fileData, index) => {
      processFile(acceptedFiles[index], fileData.id);
    });
  }, [addFiles, processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp'],
      'text/*': ['.txt', '.md'],
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  // Generate quiz from content
  const handleGenerateQuiz = async () => {
    if (!hasMinimumContent) {
      toast.error(`Please provide at least ${MIN_WORDS_REQUIRED} words of content to generate a meaningful quiz. Current: ${totalWords} words.`);
      return;
    }

    setCurrentStep('processing');
    
    try {
      await generateQuiz(quizSettings);
      setCurrentStep('review');
    } catch (error) {
      console.error('Quiz generation error:', error);
      setCurrentStep('upload');
    }
  };

  // Navigate to video page
  const handleNavigateToVideo = async () => {
    if (!generatedQuiz) return;

    if (generatedVideoUrl) {
      // Navigate to video page with existing video
      setActiveSubView('video');
      return;
    }

    // Generate video and then navigate
    setIsGeneratingVideo(true);
    try {
      const videoUrl = await generateVideoWithTavus(
        generatedQuiz.title,
        generatedQuiz.description
      );
      setGeneratedVideoUrl(videoUrl);
      setActiveSubView('video');
      toast.success('AI video generated successfully!');
    } catch (error) {
      console.error('Video generation error:', error);
      toast.error('Failed to generate video. Please try again.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Navigate to flashcards page
  const handleNavigateToFlashcards = () => {
    if (!generatedQuiz) return;
    setActiveSubView('flashcards');
  };

  // Navigate to quiz taking page
  const handleStartQuiz = () => {
    if (!generatedQuiz) return;
    setActiveSubView('take-quiz');
  };

  // Handle back from sub-views
  const handleBackToOverview = () => {
    setActiveSubView('none');
  };

  // Handle navigation between sub-views
  const handleSubViewNavigation = (targetView: 'video' | 'flashcards' | 'take-quiz') => {
    setActiveSubView(targetView);
  };

  const translateContent = async (targetLanguage: string) => {
    console.log('Translating content to:', targetLanguage);
    setSelectedLanguage(targetLanguage);
    setQuizSettings(prev => ({ ...prev, language: targetLanguage }));
    toast.success(`Language changed to ${targetLanguage}`);
  };

  const handleNewQuizConfirmation = () => {
    setShowNewQuizConfirmation(false);
    resetGenerator();
  };

  const resetGenerator = () => {
    setCurrentStep('upload');
    setActiveSubView('none');
    setGeneratedVideoUrl(null);
    reset();
  };

  // New Quiz Confirmation Modal
  const NewQuizConfirmationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
        <button
          onClick={() => setShowNewQuizConfirmation(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Start New Quiz?</h2>
          <p className="text-gray-600">
            This will clear your current progress and start fresh. Are you sure you want to continue?
          </p>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => setShowNewQuizConfirmation(false)}
            className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleNewQuizConfirmation}
            className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            Start New Quiz
          </button>
        </div>
      </div>
    </div>
  );

  // Render sub-views
  if (currentStep === 'review' && generatedQuiz && activeSubView !== 'none') {
    switch (activeSubView) {
      case 'video':
        return (
          <VideoPlayer
            title={generatedQuiz.title}
            description={generatedQuiz.description}
            videoUrl={generatedVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}
            onBack={handleBackToOverview}
            onNavigate={handleSubViewNavigation}
            quizData={generatedQuiz}
          />
        );
      case 'flashcards':
        return (
          <FlashcardsViewer
            title={generatedQuiz.title}
            flashcards={generatedQuiz.flashcards}
            onBack={handleBackToOverview}
            onNavigate={handleSubViewNavigation}
            quizData={generatedQuiz}
          />
        );
      case 'take-quiz':
        return (
          <QuizTaker
            quiz={generatedQuiz}
            onBack={handleBackToOverview}
            onNavigate={handleSubViewNavigation}
          />
        );
    }
  }

  if (currentStep === 'processing') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-6 mx-auto">
            <Brain className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">AI is analyzing your content...</h2>
          <p className="text-gray-600 mb-6">This may take a few moments while we process your materials</p>
          <div className="flex justify-center">
            <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'review' && generatedQuiz) {
    return (
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{generatedQuiz.title}</h2>
            <p className="text-gray-600">{generatedQuiz.description}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowNewQuizConfirmation(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>New Quiz</span>
            </button>
          </div>
        </div>

        {/* Enhanced Action Cards with Fixed Alignment */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Video Card */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-8 border border-red-100 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">AI Video</h3>
                <p className="text-gray-600">Watch AI-generated explanation</p>
              </div>
            </div>
            
            <div className="mb-6 flex-grow">
              <p className="text-gray-700 text-sm leading-relaxed">
                Topic overview video
              </p>
            </div>

            <div className="mt-auto">
              <button
                onClick={handleNavigateToVideo}
                disabled={isGeneratingVideo}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingVideo ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    <span>Generate</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Study Flashcards Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Study Flashcards</h3>
                <p className="text-gray-600">Review key concepts first</p>
              </div>
            </div>
            
            <div className="mb-6 flex-grow">
              <p className="text-gray-700 text-sm leading-relaxed">
                {generatedQuiz.flashcards.length} cards available
              </p>
            </div>

            <div className="mt-auto">
              <button 
                onClick={handleNavigateToFlashcards}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <BookOpen className="w-5 h-5" />
                <span>Study Cards</span>
              </button>
            </div>
          </div>

          {/* Take Quiz Card */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Take Quiz</h3>
                <p className="text-gray-600">Test your knowledge</p>
              </div>
            </div>
            
            <div className="mb-6 flex-grow">
              <p className="text-gray-700 text-sm leading-relaxed">
                {generatedQuiz.questions.length} questions • ~{generatedQuiz.estimatedTime} min
              </p>
            </div>

            <div className="mt-auto">
              <button 
                onClick={handleStartQuiz}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <Play className="w-5 h-5" />
                <span>Start Quiz</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quiz Overview */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Quiz Overview</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-500">Questions</p>
                    <p className="font-bold text-gray-900">{generatedQuiz.questions.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">Est. Time</p>
                    <p className="font-bold text-gray-900">{generatedQuiz.estimatedTime} min</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">Flashcards</p>
                    <p className="font-bold text-gray-900">{generatedQuiz.flashcards.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <Zap className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-500">Difficulty</p>
                    <p className="font-bold text-gray-900">Mixed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quiz Guidelines */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-bold text-blue-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Quiz Guidelines
              </h4>
              <ul className="space-y-2 text-blue-800 text-sm">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  All questions must be answered before proceeding to the next question
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  There are no negative markings - take your time to think through each answer
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Review the flashcards first to familiarize yourself with key concepts
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Watch the AI video for a comprehensive overview of the topic
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Questions include multiple choice, true/false, and fill-in-the-blank formats
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showNewQuizConfirmation && <NewQuizConfirmationModal />}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="p-8 space-y-8 pb-32">
        {/* Header with Settings Button */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">AI Quiz Generator</h2>
            <p className="text-gray-600">Transform your notes into interactive quizzes and flashcards</p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
              {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Content Length Indicator */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Content Length</h3>
            <span className={`text-sm font-medium ${hasMinimumContent ? 'text-green-600' : 'text-orange-600'}`}>
              {totalWords} / {MIN_WORDS_REQUIRED} words minimum
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                hasMinimumContent ? 'bg-green-500' : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min((totalWords / MIN_WORDS_REQUIRED) * 100, 100)}%` }}
            ></div>
          </div>
          {!hasMinimumContent && (
            <p className="text-sm text-orange-600 mt-2 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              Please provide at least {MIN_WORDS_REQUIRED - totalWords} more words to generate a meaningful quiz
            </p>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white rounded-xl p-8 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Number of Questions
                  </label>
                  <select
                    value={quizSettings.questionCount}
                    onChange={(e) => setQuizSettings(prev => ({ ...prev, questionCount: parseInt(e.target.value) }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                    <option value={20}>20 Questions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Difficulty Level
                  </label>
                  <select
                    value={quizSettings.difficulty}
                    onChange={(e) => setQuizSettings(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Question Types
                  </label>
                  <div className="space-y-3">
                    {[
                      { id: 'multiple-choice', label: 'Multiple Choice' },
                      { id: 'true-false', label: 'True/False' },
                      { id: 'fill-blank', label: 'Fill in the Blank' }
                    ].map(type => (
                      <label key={type.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={quizSettings.questionTypes.includes(type.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setQuizSettings(prev => ({
                                ...prev,
                                questionTypes: [...prev.questionTypes, type.id]
                              }));
                            } else {
                              setQuizSettings(prev => ({
                                ...prev,
                                questionTypes: prev.questionTypes.filter(t => t !== type.id)
                              }));
                            }
                          }}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm text-gray-700">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Language
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => translateContent(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={quizSettings.includeFlashcards}
                      onChange={(e) => setQuizSettings(prev => ({ ...prev, includeFlashcards: e.target.checked }))}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">Include Flashcards</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Upload Files Section - Expanded */}
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-white rounded-xl p-8 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Upload Files
              </h3>
              
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 lg:p-12 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive 
                    ? 'border-purple-400 bg-purple-50' 
                    : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-6">
                  <div className="flex justify-center space-x-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Image className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xl font-medium text-gray-900 mb-2">
                      {isDragActive ? 'Drop files here' : 'Drag & drop your notes'}
                    </p>
                    <p className="text-gray-500">
                      Support for images, PDFs, and text files (max 10MB)
                    </p>
                  </div>
                  <button className="bg-purple-500 text-white px-8 py-3 rounded-lg hover:bg-purple-600 transition-colors font-medium">
                    Browse Files
                  </button>
                </div>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="mt-8 space-y-4">
                  <h4 className="font-medium text-gray-900">Uploaded Files</h4>
                  <div className="space-y-3">
                    {uploadedFiles.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            file.type === 'image' ? 'bg-blue-100' : 
                            file.type === 'pdf' ? 'bg-red-100' : 'bg-green-100'
                          }`}>
                            {file.type === 'image' ? (
                              <Image className="w-5 h-5 text-blue-600" />
                            ) : file.type === 'pdf' ? (
                              <FileText className="w-5 h-5 text-red-600" />
                            ) : (
                              <FileText className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-sm text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 flex-shrink-0">
                          {file.processingStatus === 'processing' && (
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                          )}
                          {file.processingStatus === 'completed' && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                          {file.processingStatus === 'error' && (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <button
                            onClick={() => removeFile(file.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Text Input */}
            <div className="bg-white rounded-xl p-8 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                <Type className="w-5 h-5 mr-2" />
                Or Paste Text
              </h3>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste your notes, lecture content, or study material here..."
                className="w-full h-48 p-6 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
              <div className="mt-2 text-sm text-gray-500">
                {textInput.trim().split(/\s+/).filter(word => word.length > 0).length} words
              </div>
            </div>
          </div>

          {/* Content Preview & Actions - Expanded */}
          <div className="lg:col-span-2 space-y-8">
            {/* Content Preview */}
            <div className="bg-white rounded-xl p-8 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Content Preview</h3>
              <div className="bg-gray-50 rounded-lg p-6 h-64 lg:h-80 overflow-y-auto">
                {uploadedFiles.length > 0 || textInput ? (
                  <div className="space-y-4">
                    {textInput && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Manual Input:</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{textInput.substring(0, 300)}{textInput.length > 300 ? '...' : ''}</p>
                      </div>
                    )}
                    {uploadedFiles.map(file => (
                      file.content && (
                        <div key={file.id}>
                          <p className="text-xs font-medium text-gray-500 mb-2">From {file.name}:</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{file.content.substring(0, 200)}{file.content.length > 200 ? '...' : ''}</p>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center">Upload files or paste text to see preview</p>
                )}
              </div>
            </div>

            {/* What You'll Get */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-8 border border-purple-100">
              <h3 className="font-bold text-gray-900 mb-6">What You'll Get</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-700">{quizSettings.questionCount} AI-generated questions</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-700">Interactive flashcards</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-700">AI video explanations</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Languages className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-700">Multi-language support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Generate Button at Bottom */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 p-6 z-10">
        <div className="max-w-full">
          <button
            onClick={handleGenerateQuiz}
            disabled={!hasMinimumContent || isGenerating}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Quiz...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>Generate Quiz with AI</span>
              </>
            )}
          </button>
          {!hasMinimumContent && (
            <p className="text-center text-sm text-orange-600 mt-2">
              Need {MIN_WORDS_REQUIRED - totalWords} more words to generate quiz
            </p>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showNewQuizConfirmation && <NewQuizConfirmationModal />}
    </div>
  );
};

export default QuizGenerator;