import React, { useState, useCallback, useEffect } from 'react';
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
  Volume2,
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
  Plus,
  TestTube,
  Key,
  History,
  Eye,
  Trash2,
  Calendar,
  Trophy,
  MoreVertical,
  Search,
  Filter
} from 'lucide-react';
import { useQuizGenerator } from '../hooks/useQuizGenerator';
import { generateAudioWithElevenLabs, testElevenLabsApiKey, updateElevenLabsApiKey } from '../lib/elevenlabs';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import ApiKeyManager from './ApiKeyManager';
import toast from 'react-hot-toast';

interface SavedQuiz {
  id: string;
  title: string;
  description: string;
  questions: any[];
  flashcards: any[];
  created_at: string;
  estimated_time: number;
  settings: any;
}

interface QuizGeneratorProps {
  onNavigate?: (page: string, data?: any) => void;
  initialGeneratedQuiz?: any;
}

const QuizGenerator: React.FC<QuizGeneratorProps> = ({ onNavigate, initialGeneratedQuiz }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'review'>(
    initialGeneratedQuiz ? 'review' : 'upload'
  );
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showSettings, setShowSettings] = useState(false);
  const [showQuizHistory, setShowQuizHistory] = useState(false);
  const [showNewQuizConfirmation, setShowNewQuizConfirmation] = useState(false);
  const [showApiKeyManager, setShowApiKeyManager] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string>('');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [audioGenerationProgress, setAudioGenerationProgress] = useState<string>('');
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuizForView, setSelectedQuizForView] = useState<SavedQuiz | null>(null);
  const [showQuizViewer, setShowQuizViewer] = useState(false);
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
    reset: resetQuizGeneratorHook
  } = useQuizGenerator(initialGeneratedQuiz);

  // Load saved quizzes when component mounts
  useEffect(() => {
    if (user) {
      loadSavedQuizzes();
    }
  }, [user]);

  const loadSavedQuizzes = async () => {
    if (!user) return;

    try {
      setLoadingQuizzes(true);
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSavedQuizzes(data || []);
    } catch (error: any) {
      console.error('Error loading saved quizzes:', error);
      toast.error('Failed to load saved quizzes');
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setSavedQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));
      toast.success('Quiz deleted successfully');
    } catch (error: any) {
      console.error('Error deleting quiz:', error);
      toast.error('Failed to delete quiz');
    }
  };

  const loadQuizForReference = (quiz: SavedQuiz) => {
    setSelectedQuizForView(quiz);
    setShowQuizViewer(true);
  };

  const loadQuizForRetake = (quiz: SavedQuiz) => {
    // Navigate to quiz taking with the saved quiz data
    if (onNavigate) {
      onNavigate('take-quiz', {
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          questions: quiz.questions,
          flashcards: quiz.flashcards,
          estimatedTime: quiz.estimated_time
        }
      });
    }
  };

  const filteredQuizzes = savedQuizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quiz.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check for pre-filled content from Materials section
  useEffect(() => {
    const savedContent = localStorage.getItem('quiz_generator_content');
    const savedTitle = localStorage.getItem('quiz_generator_title');
    
    if (savedContent && !textInput && uploadedFiles.length === 0) {
      setTextInput(savedContent);
      if (savedTitle) {
        toast.success(savedTitle);
      }
      // Clear the stored content
      localStorage.removeItem('quiz_generator_content');
      localStorage.removeItem('quiz_generator_title');
    }
  }, [textInput, uploadedFiles.length, setTextInput]);

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

  // Check if OpenAI API key is configured
  const hasOpenAIKey = !!import.meta.env.VITE_OPENAI_API_KEY;

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

  // Test ElevenLabs API Key
  const handleTestApiKey = async () => {
    setIsTestingApiKey(true);
    try {
      const isValid = await testElevenLabsApiKey();
      if (isValid) {
        toast.success('✅ ElevenLabs API key is working correctly!');
      } else {
        toast.error('❌ ElevenLabs API key is invalid or expired');
        setApiKeyError('Invalid or expired API key');
        setShowApiKeyManager(true);
      }
    } catch (error) {
      console.error('API key test error:', error);
      toast.error('Failed to test API key');
    } finally {
      setIsTestingApiKey(false);
    }
  };

  // Generate quiz from content
  const handleGenerateQuiz = async () => {
    if (!hasOpenAIKey) {
      toast.error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your environment variables.');
      return;
    }

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

  // Handle API key errors
  const handleApiKeyError = (error: any) => {
    setApiKeyError(error.message);
    setShowApiKeyManager(true);
    setIsGeneratingAudio(false);
    setAudioGenerationProgress('');
  };

  // Handle API key update
  const handleApiKeyUpdated = (newApiKey: string) => {
    updateElevenLabsApiKey(newApiKey);
    setApiKeyError('');
    setShowApiKeyManager(false);
    toast.success('API key updated successfully!');
  };

  // Navigate to audio page with enhanced progress tracking
  const handleNavigateToAudio = async () => {
    if (!generatedQuiz) return;

    if (generatedAudioUrl) {
      // Navigate to audio page with existing audio
      if (onNavigate) {
        onNavigate('audio-player', {
          quiz: generatedQuiz,
          audioUrl: generatedAudioUrl,
          title: generatedQuiz.title,
          description: generatedQuiz.description
        });
      }
      return;
    }

    // Generate audio and then navigate
    setIsGeneratingAudio(true);
    setAudioGenerationProgress('Initializing audio generation...');
    
    try {
      // Show progress updates
      const progressUpdates = [
        'Connecting to ElevenLabs API...',
        'Validating API credentials...',
        'Fetching available voices...',
        'Processing quiz content...',
        'Creating educational script...',
        'Submitting audio generation request...',
        'Audio is being generated...',
        'Finalizing audio production...'
      ];

      let progressIndex = 0;
      const progressInterval = setInterval(() => {
        if (progressIndex < progressUpdates.length - 1) {
          progressIndex++;
          setAudioGenerationProgress(progressUpdates[progressIndex]);
        }
      }, 1500);

      console.log('🎵 Starting audio generation process...');
      
      const audioUrl = await generateAudioWithElevenLabs(
        generatedQuiz.title,
        generatedQuiz.description,
        generatedQuiz.questions,
        generatedQuiz.flashcards,
        handleApiKeyError
      );
      
      clearInterval(progressInterval);
      setGeneratedAudioUrl(audioUrl);
      setAudioGenerationProgress('Audio generation completed!');
      
      console.log('✅ Audio generation successful:', audioUrl);
      
      if (onNavigate) {
        onNavigate('audio-player', {
          quiz: generatedQuiz,
          audioUrl: audioUrl,
          title: generatedQuiz.title,
          description: generatedQuiz.description
        });
      }
      
      toast.success('🎵 AI audio generated successfully!');
    } catch (error: any) {
      console.error('❌ Audio generation error:', error);
      setAudioGenerationProgress('');
      
      // Don't show error toast if it's an API key issue (handled by modal)
      if (!error.isExpired && !error.isInvalid) {
        toast.error(`Failed to generate audio: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Navigate to flashcards page
  const handleNavigateToFlashcards = () => {
    if (!generatedQuiz || !onNavigate) return;
    
    onNavigate('flashcards', {
      quiz: generatedQuiz,
      title: generatedQuiz.title,
      flashcards: generatedQuiz.flashcards,
      audioUrl: generatedAudioUrl
    });
  };

  // Navigate to quiz taking page
  const handleStartQuiz = () => {
    if (!generatedQuiz || !onNavigate) return;
    
    onNavigate('take-quiz', {
      quiz: generatedQuiz,
      audioUrl: generatedAudioUrl
    });
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
    setGeneratedAudioUrl(null);
    setAudioGenerationProgress('');
    resetQuizGeneratorHook();
  };

  // Quiz History Modal
  const QuizHistoryModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <History className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Quiz History</h2>
              <p className="text-gray-600">View and retake your previous quizzes</p>
            </div>
          </div>
          <button
            onClick={() => setShowQuizHistory(false)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search quizzes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full"
              />
            </div>
            <button
              onClick={loadSavedQuizzes}
              disabled={loadingQuizzes}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {loadingQuizzes ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Quiz List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingQuizzes ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading your quizzes...</p>
              </div>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {savedQuizzes.length === 0 ? 'No quizzes yet' : 'No quizzes found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {savedQuizzes.length === 0 
                  ? 'Create your first quiz to see it here' 
                  : 'Try adjusting your search criteria'
                }
              </p>
              {savedQuizzes.length === 0 && (
                <button
                  onClick={() => setShowQuizHistory(false)}
                  className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Create Your First Quiz
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizzes.map((quiz) => (
                <div key={quiz.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{quiz.title}</h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{quiz.description}</p>
                    </div>
                    <div className="relative group/menu">
                      <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-2 w-48 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10">
                        <button
                          onClick={() => deleteQuiz(quiz.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-gray-900">{quiz.questions.length}</div>
                      <div className="text-gray-500">Questions</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900">{quiz.flashcards.length}</div>
                      <div className="text-gray-500">Cards</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900">{quiz.estimated_time}m</div>
                      <div className="text-gray-500">Time</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(quiz.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => loadQuizForReference(quiz)}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => loadQuizForRetake(quiz)}
                      className="flex-1 bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>Retake</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Quiz Viewer Modal
  const QuizViewerModal = () => {
    if (!selectedQuizForView) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col relative">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedQuizForView.title}</h2>
              <p className="text-gray-600">{selectedQuizForView.description}</p>
            </div>
            <button
              onClick={() => {
                setShowQuizViewer(false);
                setSelectedQuizForView(null);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quiz Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-8">
              {/* Quiz Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-gray-50 rounded-lg p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{selectedQuizForView.questions.length}</div>
                  <div className="text-sm text-gray-500">Questions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedQuizForView.flashcards.length}</div>
                  <div className="text-sm text-gray-500">Flashcards</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedQuizForView.estimated_time}m</div>
                  <div className="text-sm text-gray-500">Est. Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{formatDate(selectedQuizForView.created_at).split(',')[0]}</div>
                  <div className="text-sm text-gray-500">Created</div>
                </div>
              </div>

              {/* Questions */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Questions & Answers</h3>
                <div className="space-y-4">
                  {selectedQuizForView.questions.map((question, index) => (
                    <div key={question.id || index} className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start space-x-3 mb-4">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-purple-600">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-2">{question.question}</h4>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
                            <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                              {question.type?.replace('-', ' ').toUpperCase() || 'MULTIPLE CHOICE'}
                            </span>
                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              {question.difficulty?.toUpperCase() || 'MEDIUM'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Options for multiple choice */}
                      {question.options && (
                        <div className="mb-4 ml-11">
                          <div className="space-y-2">
                            {question.options.map((option: string, optionIndex: number) => (
                              <div 
                                key={optionIndex} 
                                className={`p-3 rounded-lg border ${
                                  optionIndex === question.correctAnswer 
                                    ? 'bg-green-50 border-green-200 text-green-800' 
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  {optionIndex === question.correctAnswer && (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  )}
                                  <span>{option}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* True/False answer */}
                      {question.type === 'true-false' && (
                        <div className="mb-4 ml-11">
                          <div className="flex space-x-4">
                            <div className={`p-3 rounded-lg border ${
                              question.correctAnswer === true 
                                ? 'bg-green-50 border-green-200 text-green-800' 
                                : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center space-x-2">
                                {question.correctAnswer === true && (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                )}
                                <span>True</span>
                              </div>
                            </div>
                            <div className={`p-3 rounded-lg border ${
                              question.correctAnswer === false 
                                ? 'bg-green-50 border-green-200 text-green-800' 
                                : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center space-x-2">
                                {question.correctAnswer === false && (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                )}
                                <span>False</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Fill in the blank answer */}
                      {question.type === 'fill-blank' && (
                        <div className="mb-4 ml-11">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-green-800 font-medium">{question.correctAnswer}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      {question.explanation && (
                        <div className="ml-11 bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h5 className="font-medium text-blue-900 mb-2">Explanation:</h5>
                          <p className="text-blue-800 text-sm leading-relaxed">{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Flashcards */}
              {selectedQuizForView.flashcards.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Flashcards</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedQuizForView.flashcards.map((card, index) => (
                      <div key={card.id || index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="mb-3">
                          <h5 className="font-medium text-gray-900 mb-2">Front:</h5>
                          <p className="text-gray-700">{card.front}</p>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Back:</h5>
                          <p className="text-gray-700">{card.back}</p>
                        </div>
                        {card.topic && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              {card.topic}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setShowQuizViewer(false);
                  setSelectedQuizForView(null);
                }}
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowQuizViewer(false);
                  setSelectedQuizForView(null);
                  loadQuizForRetake(selectedQuizForView);
                }}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium flex items-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>Take This Quiz</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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

  if (currentStep === 'processing') {
    return (
      <div className="p-8 flex items-center justify-center h-96">
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
              onClick={() => setShowQuizHistory(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <History className="w-4 h-4" />
              <span>Quiz History</span>
            </button>
            <button
              onClick={handleTestApiKey}
              disabled={isTestingApiKey}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              {isTestingApiKey ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4" />
              )}
              <span>Test ElevenLabs</span>
            </button>
            <button
              onClick={() => setShowNewQuizConfirmation(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl font-medium whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>New Quiz</span>
            </button>
          </div>
        </div>

        {/* Enhanced Action Cards with Fixed Alignment */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Audio Card */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-8 border border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                <Volume2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">AI Audio</h3>
                <p className="text-gray-600">Listen to AI-generated revision</p>
              </div>
            </div>
            
            <div className="mb-6 flex-grow">
              <p className="text-gray-700 text-sm leading-relaxed">
                {generatedAudioUrl ? 'Audio ready to listen' : 'Topic overview audio guide'}
              </p>
              {isGeneratingAudio && audioGenerationProgress && (
                <div className="mt-4">
                  <div className="flex items-center space-x-2 text-sm text-purple-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{audioGenerationProgress}</span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                    <div className="bg-purple-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto">
              <button
                onClick={handleNavigateToAudio}
                disabled={isGeneratingAudio}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingAudio ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : generatedAudioUrl ? (
                  <>
                    <Volume2 className="w-5 h-5" />
                    <span>Listen Audio</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5" />
                    <span>Generate Audio</span>
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
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
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
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
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
                  <Volume2 className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-500">Audio Guide</p>
                    <p className="font-bold text-gray-900">{generatedAudioUrl ? 'Ready' : 'Generate'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quiz Guidelines */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-bold text-blue-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Study Guidelines
              </h4>
              <ul className="space-y-2 text-blue-800 text-sm">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Start with the audio guide for a comprehensive overview of the topic
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Review the flashcards to familiarize yourself with key concepts
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Take your time with each question - there are no negative markings
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Questions include multiple choice, true/false, and fill-in-the-blank formats
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Use the audio guide for revision and reinforcement of learning
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showNewQuizConfirmation && <NewQuizConfirmationModal />}
        {showQuizHistory && <QuizHistoryModal />}
        {showQuizViewer && <QuizViewerModal />}
        <ApiKeyManager
          isOpen={showApiKeyManager}
          onClose={() => setShowApiKeyManager(false)}
          onApiKeyUpdated={handleApiKeyUpdated}
          currentError={apiKeyError}
        />
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
            <p className="text-gray-600">Transform your notes into interactive quizzes, flashcards, and audio guides</p>
            {!hasOpenAIKey && (
              <div className="mt-2 flex items-center space-x-2 text-orange-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">OpenAI API key not configured. Please set VITE_OPENAI_API_KEY.</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowQuizHistory(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <History className="w-4 h-4" />
              <span>Quiz History</span>
            </button>
            <button
              onClick={handleTestApiKey}
              disabled={isTestingApiKey}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              {isTestingApiKey ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4" />
              )}
              <span>Test ElevenLabs</span>
            </button>
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

        {/* API Key Status */}
        {!hasOpenAIKey && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <Key className="w-6 h-6 text-orange-600" />
              <div>
                <h3 className="font-bold text-orange-900">OpenAI API Key Required</h3>
                <p className="text-orange-800 text-sm mt-1">
                  To generate quizzes with AI, please configure your OpenAI API key in the environment variables.
                </p>
                <p className="text-orange-700 text-xs mt-2">
                  Set VITE_OPENAI_API_KEY in your .env file and restart the application.
                </p>
              </div>
            </div>
          </div>
        )}

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
                  <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Volume2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-700">AI audio revision guide</span>
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
            disabled={!hasMinimumContent || isGenerating || !hasOpenAIKey}
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
          {!hasOpenAIKey && (
            <p className="text-center text-sm text-red-600 mt-2">
              OpenAI API key required to generate quiz
            </p>
          )}
        </div>
      </div>

      {/* Modals */}
      {showNewQuizConfirmation && <NewQuizConfirmationModal />}
      {showQuizHistory && <QuizHistoryModal />}
      {showQuizViewer && <QuizViewerModal />}
      <ApiKeyManager
        isOpen={showApiKeyManager}
        onClose={() => setShowApiKeyManager(false)}
        onApiKeyUpdated={handleApiKeyUpdated}
        currentError={apiKeyError}
      />
    </div>
  );
};

export default QuizGenerator;