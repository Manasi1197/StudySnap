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
  X
} from 'lucide-react';
import { useQuizGenerator } from '../hooks/useQuizGenerator';
import toast from 'react-hot-toast';

// Confirmation Modal Component
const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600">{message}</p>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Flashcard Component with 3D flip animation
const FlashcardComponent: React.FC<{
  card: { front: string; back: string; topic: string };
  index: number;
}> = ({ card, index }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="perspective-1000 h-48 cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`relative w-full h-full transform-style-preserve-3d transition-transform duration-700 ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Front of card */}
        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 flex flex-col justify-center items-center text-white shadow-lg">
          <div className="text-center">
            <p className="font-semibold text-lg mb-2">{card.front}</p>
            <p className="text-purple-100 text-sm">Click to reveal answer</p>
          </div>
        </div>
        
        {/* Back of card */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl p-6 flex flex-col justify-center items-center text-white shadow-lg">
          <div className="text-center">
            <p className="font-medium text-base mb-3">{card.back}</p>
            <span className="inline-block bg-white/20 text-blue-100 px-3 py-1 rounded-full text-xs font-medium">
              {card.topic}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Quiz Taking Component
const QuizTaker: React.FC<{
  quiz: any;
  onComplete: (results: any) => void;
  onBack: () => void;
}> = ({ quiz, onComplete, onBack }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: any }>({});
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const hasAnswered = answers[currentQuestion.id] !== undefined;

  const handleAnswer = (answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
  };

  const handleNext = () => {
    if (!hasAnswered) {
      toast.error('Please answer the question before proceeding');
      return;
    }

    if (isLastQuestion) {
      // Calculate results
      const score = quiz.questions.reduce((total: number, question: any) => {
        const userAnswer = answers[question.id];
        const isCorrect = question.type === 'true-false' 
          ? userAnswer === question.correctAnswer
          : question.type === 'multiple-choice'
          ? userAnswer === question.correctAnswer
          : userAnswer?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
        
        return total + (isCorrect ? 1 : 0);
      }, 0);

      const quizResults = {
        score,
        totalQuestions: quiz.questions.length,
        percentage: Math.round((score / quiz.questions.length) * 100),
        answers,
        wrongAnswers: quiz.questions.filter((q: any) => {
          const userAnswer = answers[q.id];
          const isCorrect = q.type === 'true-false' 
            ? userAnswer === q.correctAnswer
            : q.type === 'multiple-choice'
            ? userAnswer === q.correctAnswer
            : userAnswer?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
          return !isCorrect;
        })
      };

      setResults(quizResults);
      setShowResults(true);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  if (showResults && results) {
    return (
      <div className="space-y-8">
        {/* Results Header */}
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
          <p className="text-xl text-gray-600">
            You scored {results.score} out of {results.totalQuestions} ({results.percentage}%)
          </p>
        </div>

        {/* Score Card */}
        <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold text-green-600">{results.score}</div>
              <div className="text-sm text-gray-500">Correct</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-600">{results.totalQuestions - results.score}</div>
              <div className="text-sm text-gray-500">Incorrect</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">{results.percentage}%</div>
              <div className="text-sm text-gray-500">Score</div>
            </div>
          </div>
        </div>

        {/* Wrong Answers with AI Explanations */}
        {results.wrongAnswers.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Review Incorrect Answers</h3>
              <p className="text-gray-600">AI explanations to help you learn</p>
            </div>
            <div className="p-6 space-y-6">
              {results.wrongAnswers.map((question: any, index: number) => (
                <div key={question.id} className="border border-red-100 rounded-lg p-6 bg-red-50">
                  <h4 className="font-medium text-gray-900 mb-3">
                    {question.question}
                  </h4>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-700">
                        Your answer: {
                          question.type === 'multiple-choice' 
                            ? question.options[answers[question.id]]
                            : answers[question.id]?.toString()
                        }
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-700">
                        Correct answer: {
                          question.type === 'multiple-choice' 
                            ? question.options[question.correctAnswer]
                            : question.correctAnswer.toString()
                        }
                      </span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-blue-900 mb-1">AI Explanation</h5>
                        <p className="text-sm text-blue-800">{question.explanation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={onBack}
            className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Overview
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Take Another Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress Bar */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Question {currentQuestionIndex + 1} of {quiz.questions.length}</h3>
          <span className="text-sm text-gray-500">
            {Math.round(((currentQuestionIndex + 1) / quiz.questions.length) * 100)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Answer Options */}
        <div className="space-y-4 mb-8">
          {currentQuestion.type === 'multiple-choice' && (
            <div className="space-y-3">
              {currentQuestion.options.map((option: string, index: number) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                    answers[currentQuestion.id] === index
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      answers[currentQuestion.id] === index
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    }`}>
                      {answers[currentQuestion.id] === index && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                    <span>{option}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === 'true-false' && (
            <div className="grid grid-cols-2 gap-4">
              {[true, false].map((value) => (
                <button
                  key={value.toString()}
                  onClick={() => handleAnswer(value)}
                  className={`p-6 rounded-lg border-2 transition-all duration-200 ${
                    answers[currentQuestion.id] === value
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-center">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mx-auto mb-2 ${
                      answers[currentQuestion.id] === value
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    }`}>
                      {answers[currentQuestion.id] === value && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className="font-bold text-lg">{value ? 'True' : 'False'}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === 'fill-blank' && (
            <div>
              <input
                type="text"
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none text-lg"
              />
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="flex items-center space-x-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={handleNext}
            disabled={!hasAnswered}
            className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{isLastQuestion ? 'Finish Quiz' : 'Next Question'}</span>
            {!isLastQuestion && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

const QuizGenerator: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'review' | 'flashcards' | 'quiz'>('upload');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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

  const generateTopicVideo = async () => {
    if (!generatedQuiz) return;
    
    toast.success('Generating AI video explanation for the topic...');
    // This would integrate with Tavus API for video generation
    console.log('Generating topic video for:', generatedQuiz.title);
  };

  const resetGenerator = () => {
    if (uploadedFiles.length > 0 || textInput.trim() || generatedQuiz) {
      setShowConfirmModal(true);
    } else {
      performReset();
    }
  };

  const performReset = () => {
    setCurrentStep('upload');
    reset();
    setShowConfirmModal(false);
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

  if (currentStep === 'flashcards' && generatedQuiz) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Study Flashcards</h2>
            <p className="text-gray-600">Review key concepts before taking the quiz</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentStep('review')}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setCurrentStep('quiz')}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Start Quiz</span>
            </button>
          </div>
        </div>

        {/* Flashcards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {generatedQuiz.flashcards.map((card, index) => (
            <FlashcardComponent key={card.id} card={card} index={index} />
          ))}
        </div>

        {/* Study Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 mb-3">Study Tips</h3>
          <ul className="text-blue-800 space-y-2 text-sm">
            <li>• Click each flashcard to reveal the answer</li>
            <li>• Review all cards before starting the quiz</li>
            <li>• Focus on concepts you find challenging</li>
            <li>• Take your time to understand each concept thoroughly</li>
          </ul>
        </div>
      </div>
    );
  }

  if (currentStep === 'quiz' && generatedQuiz) {
    return (
      <QuizTaker
        quiz={generatedQuiz}
        onComplete={(results) => {
          console.log('Quiz completed:', results);
          setCurrentStep('review');
        }}
        onBack={() => setCurrentStep('review')}
      />
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
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <Target className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-500">Questions</p>
                <p className="font-bold text-gray-900">{generatedQuiz.questions.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Est. Time</p>
                <p className="font-bold text-gray-900">{generatedQuiz.estimatedTime} min</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <BookOpen className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Flashcards</p>
                <p className="font-bold text-gray-900">{generatedQuiz.flashcards.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <Zap className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-500">Difficulty</p>
                <p className="font-bold text-gray-900">Mixed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Video Card */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-8 border border-red-100 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Video className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI Video</h3>
              <p className="text-gray-600 leading-relaxed">
                Watch AI-generated explanation
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-center text-sm text-gray-500">
                Topic overview video
              </div>
              
              <button
                onClick={generateTopicVideo}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <Video className="w-5 h-5" />
                <span>Generate</span>
              </button>
            </div>
          </div>

          {/* Study Flashcards Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Study Flashcards</h3>
              <p className="text-gray-600 leading-relaxed">
                Review key concepts first
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-center text-sm text-gray-500">
                {generatedQuiz.flashcards.length} cards available
              </div>
              
              <button
                onClick={() => setCurrentStep('flashcards')}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <BookOpen className="w-5 h-5" />
                <span>Study Cards</span>
              </button>
            </div>
          </div>

          {/* Take Quiz Card */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Play className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Take Quiz</h3>
              <p className="text-gray-600 leading-relaxed">
                Test your knowledge
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-center text-sm text-gray-500">
                {generatedQuiz.questions.length} questions • ~{generatedQuiz.estimatedTime} min
              </div>
              
              <button
                onClick={() => setCurrentStep('quiz')}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <Play className="w-5 h-5" />
                <span>Start Quiz</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quiz Guidelines */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Quiz Guidelines</h3>
          </div>
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Answer Requirements</h4>
                    <p className="text-sm text-gray-600">All questions must be answered before proceeding to the next question.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-xs font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Scoring System</h4>
                    <p className="text-sm text-gray-600">No negative marking - take your time to think through each answer.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-600 text-xs font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Navigation</h4>
                    <p className="text-sm text-gray-600">You can go back to previous questions to review or change your answers.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-orange-600 text-xs font-bold">4</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Time Expectation</h4>
                    <p className="text-sm text-gray-600">Estimated completion time is {generatedQuiz.estimatedTime} minutes, but there's no time limit.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-pink-600 text-xs font-bold">5</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">AI Explanations</h4>
                    <p className="text-sm text-gray-600">Get detailed explanations for incorrect answers to enhance your learning.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-teal-600 text-xs font-bold">6</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Study First</h4>
                    <p className="text-sm text-gray-600">Consider reviewing the flashcards before taking the quiz for better results.</p>
                  </div>
                </div>
              </div>
            </div>
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={performReset}
        title="Start New Quiz?"
        message="This will clear all uploaded files and generated content. Are you sure you want to continue?"
        confirmText="Yes, Start New"
        cancelText="Cancel"
      />
    </div>
  );
};

export default QuizGenerator;