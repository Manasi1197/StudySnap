import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, AlertCircle, Trophy, RotateCcw, X, Loader2 } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { useTranslation } from '../hooks/useTranslation';
import { getLanguageName } from '../lib/lingo';
import toast from 'react-hot-toast';

interface Question {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer: string | number | boolean;
  explanation: string;
  difficulty: string;
  topic: string;
  translatedQuestion?: string;
  translatedOptions?: string[];
  translatedExplanation?: string;
  translatedTopic?: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  flashcards: any[];
  estimatedTime: number;
}

interface QuizTakerProps {
  quiz: Quiz;
  onBack: () => void;
  onNavigate?: (targetView: 'audio' | 'flashcards' | 'take-quiz') => void;
}

const QuizTaker: React.FC<QuizTakerProps> = ({ quiz, onBack, onNavigate }) => {
  // Defensive check for quiz data
  useEffect(() => {
    if (!quiz || !quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      toast.error('Invalid quiz data. Returning to quiz overview.');
      onBack();
      return;
    }
  }, [quiz, onBack]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showResults, setShowResults] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [translatedQuestions, setTranslatedQuestions] = useState<Question[]>(quiz.questions);
  
  const { 
    isTranslating, 
    currentLanguage, 
    translateMultiple, 
    setLanguage 
  } = useTranslation('en');

  // Early return if quiz data is invalid
  if (!quiz || !quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return null;
  }

  const currentQuestion = translatedQuestions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleLanguageChange = async (newLanguage: string) => {
    if (newLanguage === currentLanguage) return;

    setLanguage(newLanguage);

    if (newLanguage === 'en') {
      // Reset to original content
      setTranslatedQuestions(quiz.questions);
      return;
    }

    try {
      // Collect all texts to translate
      const textsToTranslate: string[] = [];
      quiz.questions.forEach(question => {
        textsToTranslate.push(question.question, question.explanation, question.topic);
        if (question.options) {
          textsToTranslate.push(...question.options);
        }
      });

      // Translate all texts
      const translatedTexts = await translateMultiple(textsToTranslate, newLanguage, 'en');

      // Map translated texts back to questions
      let textIndex = 0;
      const newTranslatedQuestions = quiz.questions.map((question) => {
        const translatedQuestion = translatedTexts[textIndex++];
        const translatedExplanation = translatedTexts[textIndex++];
        const translatedTopic = translatedTexts[textIndex++];
        
        let translatedOptions: string[] | undefined;
        if (question.options) {
          translatedOptions = question.options.map(() => translatedTexts[textIndex++]);
        }

        return {
          ...question,
          translatedQuestion,
          translatedExplanation,
          translatedTopic,
          translatedOptions
        };
      });

      setTranslatedQuestions(newTranslatedQuestions);
    } catch (error) {
      console.error('Failed to translate quiz:', error);
      // Keep original questions on error
      setTranslatedQuestions(quiz.questions);
    }
  };

  // Handle browser back button and page refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!showResults && Object.keys(answers).length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (!showResults && Object.keys(answers).length > 0) {
        e.preventDefault();
        setShowExitConfirmation(true);
        // Push the current state back to prevent navigation
        window.history.pushState(null, '', window.location.href);
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Push initial state to handle back button
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showResults, answers]);

  const handleAnswerChange = (answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
  };

  const nextQuestion = () => {
    // Check if current question is answered before proceeding
    if (answers[currentQuestion.id] === undefined || answers[currentQuestion.id] === '') {
      toast.error('Please answer the current question before proceeding.');
      return;
    }

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const submitQuiz = () => {
    // Check if all questions are answered
    const unansweredQuestions = quiz.questions.filter(q => 
      answers[q.id] === undefined || answers[q.id] === ''
    );

    if (unansweredQuestions.length > 0) {
      toast.error(`Please answer all questions before submitting. ${unansweredQuestions.length} questions remaining.`);
      return;
    }

    setIsSubmitted(true);
    setShowResults(true);
  };

  const calculateScore = () => {
    let correct = 0;
    quiz.questions.forEach(question => {
      const userAnswer = answers[question.id];
      if (userAnswer !== undefined) {
        if (question.type === 'multiple-choice') {
          if (userAnswer === question.correctAnswer) correct++;
        } else if (question.type === 'true-false') {
          if (userAnswer === question.correctAnswer) correct++;
        } else if (question.type === 'fill-blank') {
          if (userAnswer.toLowerCase().trim() === question.correctAnswer.toString().toLowerCase().trim()) {
            correct++;
          }
        }
      }
    });
    return correct;
  };

  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowResults(false);
    setIsSubmitted(false);
  };

  const handleBackClick = () => {
    if (!showResults && Object.keys(answers).length > 0) {
      setShowExitConfirmation(true);
    } else {
      onBack();
    }
  };

  const confirmExit = () => {
    setShowExitConfirmation(false);
    onBack();
  };

  const cancelExit = () => {
    setShowExitConfirmation(false);
  };

  // Get display text based on current language
  const getDisplayText = (original: string, translated?: string) => {
    return currentLanguage === 'en' ? original : (translated || original);
  };

  // Exit Confirmation Modal
  const ExitConfirmationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
        <button
          onClick={cancelExit}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Leave Quiz?</h2>
          <p className="text-gray-600">
            You have unsaved progress. If you leave now, your answers will be lost. Are you sure you want to continue?
          </p>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={cancelExit}
            className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Stay & Continue
          </button>
          <button
            onClick={confirmExit}
            className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            Leave Quiz
          </button>
        </div>
      </div>
    </div>
  );

  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score / totalQuestions) * 100);
    
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Quiz Overview</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Quiz Results</h1>
                <p className="text-gray-600">{quiz.title}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Content */}
        <div className="max-w-4xl mx-auto px-8 py-12">
          {/* Score Card */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg mb-8">
            <div className="text-center">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                percentage >= 80 ? 'bg-green-100' : percentage >= 60 ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <Trophy className={`w-12 h-12 ${
                  percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {percentage >= 80 ? 'Excellent!' : percentage >= 60 ? 'Good Job!' : 'Keep Practicing!'}
              </h2>
              <p className="text-xl text-gray-600 mb-6">
                You scored {score} out of {totalQuestions} questions correctly
              </p>
              <div className="text-6xl font-bold text-gray-900 mb-4">
                {percentage}%
              </div>
              <div className="flex justify-center space-x-8 text-sm text-gray-500">
                <div>
                  <span className="font-medium">Questions:</span> {totalQuestions}
                </div>
                <div>
                  <span className="font-medium">Correct:</span> {score}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mb-8">
            <button
              onClick={restartQuiz}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Quiz</span>
            </button>
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Overview</span>
            </button>
          </div>

          {/* Question Review */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Question Review</h3>
            </div>
            <div className="p-6 space-y-6">
              {translatedQuestions.map((question, index) => {
                const userAnswer = answers[question.id];
                const isCorrect = userAnswer === question.correctAnswer;
                
                return (
                  <div key={question.id} className="border border-gray-100 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-gray-500">Question {index + 1}</span>
                          {isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 mb-4">
                          {getDisplayText(question.question, question.translatedQuestion)}
                        </h4>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Your Answer: </span>
                        <span className={`font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                          {userAnswer !== undefined ? userAnswer.toString() : 'Not answered'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Correct Answer: </span>
                        <span className="font-medium text-green-600">
                          {question.correctAnswer.toString()}
                        </span>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <strong>Explanation:</strong> {getDisplayText(question.explanation, question.translatedExplanation)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Exit Confirmation Modal */}
        {showExitConfirmation && <ExitConfirmationModal />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackClick}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Quiz Overview</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
              <p className="text-gray-600">Question {currentQuestionIndex + 1} of {totalQuestions}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Language:</span>
              <LanguageSelector
                selectedLanguage={currentLanguage}
                onLanguageChange={handleLanguageChange}
                className="min-w-[140px]"
              />
              {isTranslating && (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
            {currentLanguage !== 'en' && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                Translated to {getLanguageName(currentLanguage)}
              </span>
            )}
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-medium">
                {currentQuestion.type.replace('-', ' ').toUpperCase()}
              </span>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                {currentQuestion.difficulty.toUpperCase()}
              </span>
              <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-xs font-medium">
                {getDisplayText(currentQuestion.topic, currentQuestion.translatedTopic)}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {getDisplayText(currentQuestion.question, currentQuestion.translatedQuestion)}
            </h2>
          </div>

          {/* Answer Options */}
          <div className="mb-8">
            {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const displayOption = currentLanguage === 'en' 
                    ? option 
                    : (currentQuestion.translatedOptions?.[index] || option);
                  
                  return (
                    <label key={index} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name={currentQuestion.id}
                        value={index}
                        checked={answers[currentQuestion.id] === index}
                        onChange={() => handleAnswerChange(index)}
                        className="mr-4 text-blue-600"
                      />
                      <span className="text-gray-900">{displayOption}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'true-false' && (
              <div className="space-y-3">
                <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value="true"
                    checked={answers[currentQuestion.id] === true}
                    onChange={() => handleAnswerChange(true)}
                    className="mr-4 text-blue-600"
                  />
                  <span className="text-gray-900">True</span>
                </label>
                <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value="false"
                    checked={answers[currentQuestion.id] === false}
                    onChange={() => handleAnswerChange(false)}
                    className="mr-4 text-blue-600"
                  />
                  <span className="text-gray-900">False</span>
                </label>
              </div>
            )}

            {currentQuestion.type === 'fill-blank' && (
              <div>
                <input
                  type="text"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevQuestion}
              disabled={currentQuestionIndex === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="text-sm text-gray-500">
              {Object.keys(answers).length} of {totalQuestions} answered
            </div>

            {currentQuestionIndex === totalQuestions - 1 ? (
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
                className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirmation && <ExitConfirmationModal />}
    </div>
  );
};

export default QuizTaker;