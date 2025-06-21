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
  File,
  RotateCw,
  Award,
  X
} from 'lucide-react';
import { useQuizGenerator } from '../hooks/useQuizGenerator';
import { isPDFFile } from '../lib/pdfExtractor';
import toast from 'react-hot-toast';

const QuizGenerator: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'review' | 'flashcards' | 'quiz' | 'results'>('upload');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showSettings, setShowSettings] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
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

  // File upload handling
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => {
      let fileType: 'text' | 'image' | 'pdf' = 'text';
      
      if (isPDFFile(file)) {
        fileType = 'pdf';
      } else if (file.type.startsWith('image/')) {
        fileType = 'image';
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: fileType,
        content: '',
        size: file.size,
        processingStatus: 'pending' as const
      };
    });

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
    if (uploadedFiles.length === 0 && !textInput.trim()) {
      toast.error('Please upload files or enter text to generate a quiz');
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

  const startQuiz = () => {
    setCurrentStep('quiz');
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuizStartTime(new Date());
  };

  const startFlashcards = () => {
    setCurrentStep('flashcards');
    setFlippedCards(new Set());
  };

  const flipCard = (cardId: string) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleAnswerSelect = (questionId: string, answer: any) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const nextQuestion = () => {
    if (generatedQuiz && currentQuestionIndex < generatedQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const submitQuiz = () => {
    if (!generatedQuiz) return;

    const timeSpent = quizStartTime ? Math.floor((new Date().getTime() - quizStartTime.getTime()) / 1000) : 0;
    setCurrentStep('results');
  };

  const calculateScore = () => {
    if (!generatedQuiz) return { score: 0, total: 0, percentage: 0 };

    let correct = 0;
    const total = generatedQuiz.questions.length;

    generatedQuiz.questions.forEach(question => {
      const userAnswer = userAnswers[question.id];
      if (userAnswer !== undefined) {
        if (question.type === 'multiple-choice') {
          if (userAnswer === question.correctAnswer) correct++;
        } else if (question.type === 'true-false') {
          if (userAnswer === question.correctAnswer) correct++;
        } else if (question.type === 'fill-blank' || question.type === 'short-answer') {
          // Simple string comparison for now
          if (userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()) {
            correct++;
          }
        }
      }
    });

    return {
      score: correct,
      total,
      percentage: Math.round((correct / total) * 100)
    };
  };

  const resetGenerator = () => {
    setCurrentStep('upload');
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuizStartTime(null);
    setFlippedCards(new Set());
    reset();
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return Image;
      case 'pdf':
        return File;
      default:
        return FileText;
    }
  };

  const getFileIconColor = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return 'bg-blue-100 text-blue-600';
      case 'pdf':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-green-100 text-green-600';
    }
  };

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

  if (currentStep === 'results' && generatedQuiz) {
    const { score, total, percentage } = calculateScore();
    const wrongAnswers = generatedQuiz.questions.filter(q => {
      const userAnswer = userAnswers[q.id];
      if (q.type === 'multiple-choice' || q.type === 'true-false') {
        return userAnswer !== q.correctAnswer;
      } else {
        return userAnswer?.toLowerCase().trim() !== q.correctAnswer.toLowerCase().trim();
      }
    });

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Results Header */}
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
          <p className="text-xl text-gray-600">Here's how you performed</p>
        </div>

        {/* Score Card */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
          <div className="text-6xl font-bold text-gray-900 mb-2">{percentage}%</div>
          <div className="text-xl text-gray-600 mb-4">
            {score} out of {total} questions correct
          </div>
          <div className="flex justify-center space-x-8 text-sm text-gray-500">
            <div>
              <div className="font-medium text-green-600">{score} Correct</div>
            </div>
            <div>
              <div className="font-medium text-red-600">{total - score} Incorrect</div>
            </div>
          </div>
        </div>

        {/* Wrong Answers with Explanations */}
        {wrongAnswers.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Review Incorrect Answers</h3>
              <p className="text-gray-600">Learn from these questions to improve your understanding</p>
            </div>
            <div className="p-6 space-y-6">
              {wrongAnswers.map((question, index) => (
                <div key={question.id} className="border border-red-100 rounded-lg p-6 bg-red-50">
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {index + 1}. {question.question}
                    </h4>
                    {question.options && (
                      <div className="space-y-2 mb-4">
                        {question.options.map((option, optIndex) => {
                          const isCorrect = optIndex === question.correctAnswer;
                          const isUserAnswer = userAnswers[question.id] === optIndex;
                          return (
                            <div 
                              key={optIndex} 
                              className={`flex items-center space-x-3 p-3 rounded-lg ${
                                isCorrect ? 'bg-green-100 border border-green-300' : 
                                isUserAnswer ? 'bg-red-100 border border-red-300' : 'bg-white border border-gray-200'
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                                isCorrect ? 'bg-green-500 text-white' : 
                                isUserAnswer ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-600'
                              }`}>
                                {String.fromCharCode(65 + optIndex)}
                              </div>
                              <span className="text-gray-700">{option}</span>
                              {isCorrect && <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />}
                              {isUserAnswer && !isCorrect && <XCircle className="w-5 h-5 text-red-500 ml-auto" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">AI Explanation:</h5>
                    <p className="text-blue-800 text-sm leading-relaxed">{question.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => setCurrentStep('review')}
            className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Review</span>
          </button>
          <button
            onClick={resetGenerator}
            className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Create New Quiz</span>
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 'quiz' && generatedQuiz) {
    const currentQuestion = generatedQuiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / generatedQuiz.questions.length) * 100;

    return (
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Quiz Header */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Question {currentQuestionIndex + 1} of {generatedQuiz.questions.length}
            </h2>
            <button
              onClick={() => setCurrentStep('review')}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl p-8 border border-gray-200">
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-xs font-medium">
                {currentQuestion.type.replace('-', ' ').toUpperCase()}
              </span>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                {currentQuestion.difficulty.toUpperCase()}
              </span>
            </div>
            <h3 className="text-2xl font-medium text-gray-900 leading-relaxed">
              {currentQuestion.question}
            </h3>
          </div>

          {/* Answer Options */}
          <div className="space-y-4">
            {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(currentQuestion.id, index)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                      userAnswers[currentQuestion.id] === index
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        userAnswers[currentQuestion.id] === index
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="text-gray-900">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'true-false' && (
              <div className="grid grid-cols-2 gap-4">
                {['True', 'False'].map((option, index) => (
                  <button
                    key={option}
                    onClick={() => handleAnswerSelect(currentQuestion.id, index === 0)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      userAnswers[currentQuestion.id] === (index === 0)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                        userAnswers[currentQuestion.id] === (index === 0)
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {index === 0 ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                      </div>
                      <span className="font-medium text-gray-900">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {(currentQuestion.type === 'fill-blank' || currentQuestion.type === 'short-answer') && (
              <div>
                <textarea
                  value={userAnswers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                  rows={3}
                />
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={previousQuestion}
            disabled={currentQuestionIndex === 0}
            className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {currentQuestionIndex === generatedQuiz.questions.length - 1 ? (
            <button
              onClick={submitQuiz}
              className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Submit Quiz</span>
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (currentStep === 'flashcards' && generatedQuiz) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Study Flashcards</h2>
            <p className="text-gray-600">Click on cards to flip and review key concepts</p>
          </div>
          <button
            onClick={() => setCurrentStep('review')}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Review</span>
          </button>
        </div>

        {/* Flashcards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {generatedQuiz.flashcards.map(card => {
            const isFlipped = flippedCards.has(card.id);
            return (
              <div key={card.id} className="h-64 perspective-1000">
                <div
                  onClick={() => flipCard(card.id)}
                  className={`relative w-full h-full cursor-pointer transition-transform duration-700 transform-style-preserve-3d ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* Front of card */}
                  <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 flex flex-col justify-center items-center text-white shadow-lg">
                    <div className="text-center">
                      <BookOpen className="w-8 h-8 mx-auto mb-4 opacity-80" />
                      <p className="text-lg font-medium leading-relaxed">{card.front}</p>
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <RotateCw className="w-5 h-5 opacity-60" />
                    </div>
                  </div>

                  {/* Back of card */}
                  <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-white border-2 border-gray-200 rounded-xl p-6 flex flex-col justify-center items-center shadow-lg">
                    <div className="text-center">
                      <Sparkles className="w-8 h-8 mx-auto mb-4 text-purple-500" />
                      <p className="text-gray-900 leading-relaxed">{card.back}</p>
                    </div>
                    <div className="absolute top-4 left-4">
                      <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                        {card.topic}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={startQuiz}
            className="flex items-center space-x-2 px-8 py-4 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors mx-auto"
          >
            <Play className="w-5 h-5" />
            <span>Start Quiz</span>
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 'review' && generatedQuiz) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{generatedQuiz.title}</h2>
            <p className="text-gray-600">{generatedQuiz.description}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={resetGenerator}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>New Quiz</span>
            </button>
          </div>
        </div>

        {/* Quiz Info */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Flashcards Card */}
          {generatedQuiz.flashcards.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-8 border border-blue-200">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Study Flashcards</h3>
                  <p className="text-gray-600">Review key concepts before taking the quiz</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{generatedQuiz.flashcards.length} cards available</span>
                <button
                  onClick={startFlashcards}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Study Cards</span>
                </button>
              </div>
            </div>
          )}

          {/* Quiz Card */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-xl p-8 border border-purple-200">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Take Quiz</h3>
                <p className="text-gray-600">Test your knowledge with interactive questions</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{generatedQuiz.questions.length} questions • ~{generatedQuiz.estimatedTime} min</span>
              <button
                onClick={startQuiz}
                className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Start Quiz</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quiz Overview */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Quiz Overview</h3>
            <p className="text-gray-600">Your quiz contains {generatedQuiz.questions.length} questions across different topics</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedQuiz.questions.slice(0, 6).map((question, index) => (
                <div key={question.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded text-xs font-medium">
                      Q{index + 1}
                    </span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium">
                      {question.type.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{question.question}</p>
                </div>
              ))}
            </div>
            {generatedQuiz.questions.length > 6 && (
              <div className="text-center mt-4">
                <p className="text-gray-500 text-sm">
                  And {generatedQuiz.questions.length - 6} more questions...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="space-y-8 pb-32">
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
                      { id: 'fill-blank', label: 'Fill in the Blank' },
                      { id: 'short-answer', label: 'Short Answer' }
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
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value);
                      setQuizSettings(prev => ({ ...prev, language: e.target.value }));
                    }}
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
                    <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center">
                      <File className="w-8 h-8 text-red-600" />
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
                    {uploadedFiles.map(file => {
                      const IconComponent = getFileIcon(file.type);
                      const iconColorClass = getFileIconColor(file.type);
                      
                      return (
                        <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4 min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColorClass}`}>
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 truncate">{file.name}</p>
                              <p className="text-sm text-gray-500">
                                {(file.size / 1024).toFixed(1)} KB • {file.type.toUpperCase()}
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
                      );
                    })}
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
                  <span className="text-gray-700">AI explanations</span>
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
            disabled={uploadedFiles.length === 0 && !textInput.trim() || isGenerating}
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
        </div>
      </div>
    </div>
  );
};

export default QuizGenerator;