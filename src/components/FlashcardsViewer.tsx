import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Shuffle, BookOpen, ChevronLeft, ChevronRight, Play, Volume2 } from 'lucide-react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
}

interface FlashcardsViewerProps {
  title: string;
  flashcards: Flashcard[];
  onBack: () => void;
  onNavigate?: (targetView: 'audio' | 'flashcards' | 'take-quiz') => void;
  quizData?: any;
}

const FlashcardsViewer: React.FC<FlashcardsViewerProps> = ({ 
  title, 
  flashcards, 
  onBack, 
  onNavigate,
  quizData 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffledCards, setShuffledCards] = useState(flashcards);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set());

  const currentCard = shuffledCards[currentIndex];

  const nextCard = () => {
    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped) {
      setStudiedCards(prev => new Set([...prev, currentIndex]));
    }
  };

  const shuffleCards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudiedCards(new Set());
  };

  const resetProgress = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudiedCards(new Set());
  };

  const handleNavigateToAudio = () => {
    if (onNavigate) {
      onNavigate('audio');
    }
  };

  const handleNavigateToQuiz = () => {
    if (onNavigate) {
      onNavigate('take-quiz');
    }
  };

  const progress = ((studiedCards.size) / flashcards.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Quiz Overview</span>
            </button>
            <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-gray-600 text-sm">Study Flashcards</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={shuffleCards}
              className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs sm:text-sm"
            >
              <Shuffle className="w-3 sm:w-4 h-3 sm:h-4" />
              <span>Shuffle</span>
            </button>
            <button
              onClick={resetProgress}
              className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm"
            >
              <RotateCcw className="w-3 sm:w-4 h-3 sm:h-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>
        {/* Mobile title */}
        <div className="sm:hidden mt-2">
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 text-sm">Study Flashcards</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs sm:text-sm font-medium text-gray-700">
            Card {currentIndex + 1} of {flashcards.length}
          </span>
          <span className="text-xs sm:text-sm font-medium text-gray-700">
            {studiedCards.size} studied ({Math.round(progress)}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Flashcard Content - Full Width Layout */}
      <div className="px-4 sm:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 sm:gap-8 max-w-full">
          {/* Main Flashcard - Takes up more space */}
          <div className="xl:col-span-4">
            <div className="perspective-1000">
              <div 
                className={`relative w-full h-[300px] sm:h-[500px] transform-style-preserve-3d transition-transform duration-700 cursor-pointer ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
                onClick={flipCard}
              >
                {/* Front of card */}
                <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-2xl p-6 sm:p-12 flex flex-col justify-center items-center text-white">
                  <div className="text-center max-w-4xl">
                    <div className="w-16 sm:w-20 h-16 sm:h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
                      <BookOpen className="w-8 sm:w-10 h-8 sm:h-10 text-white" />
                    </div>
                    <h2 className="text-xl sm:text-3xl font-bold mb-4 sm:mb-6">Question</h2>
                    <p className="text-lg sm:text-2xl leading-relaxed">{currentCard?.front}</p>
                  </div>
                  <div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2">
                    <p className="text-white text-opacity-80 text-sm sm:text-lg">Click to reveal answer</p>
                  </div>
                </div>

                {/* Back of card */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-2xl p-6 sm:p-12 flex flex-col justify-center items-center text-white">
                  <div className="text-center max-w-4xl">
                    <div className="w-16 sm:w-20 h-16 sm:h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
                      <BookOpen className="w-8 sm:w-10 h-8 sm:h-10 text-white" />
                    </div>
                    <h2 className="text-xl sm:text-3xl font-bold mb-4 sm:mb-6">Answer</h2>
                    <p className="text-lg sm:text-2xl leading-relaxed">{currentCard?.back}</p>
                  </div>
                  <div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2">
                    <p className="text-white text-opacity-80 text-sm sm:text-lg">Click to flip back</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between mt-6 sm:mt-8">
              <button
                onClick={prevCard}
                disabled={currentIndex === 0}
                className="flex items-center space-x-1 sm:space-x-2 px-4 sm:px-8 py-3 sm:py-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-lg font-medium"
              >
                <ChevronLeft className="w-4 sm:w-6 h-4 sm:h-6" />
                <span>Previous</span>
              </button>

              <div className="hidden sm:flex items-center space-x-6 bg-white rounded-xl px-8 py-4 border border-gray-200">
                <span className="text-lg text-gray-500">
                  Topic: <span className="font-medium text-gray-900">{currentCard?.topic}</span>
                </span>
              </div>

              <button
                onClick={nextCard}
                disabled={currentIndex === flashcards.length - 1}
                className="flex items-center space-x-1 sm:space-x-2 px-4 sm:px-8 py-3 sm:py-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-lg font-medium"
              >
                <span>Next</span>
                <ChevronRight className="w-4 sm:w-6 h-4 sm:h-6" />
              </button>
            </div>
            
            {/* Mobile topic display */}
            <div className="sm:hidden mt-4 bg-white rounded-xl px-4 py-3 border border-gray-200 text-center">
              <span className="text-sm text-gray-500">
                Topic: <span className="font-medium text-gray-900">{currentCard?.topic}</span>
              </span>
            </div>
          </div>

          {/* Sidebar - Compact */}
          <div className="xl:col-span-1 space-y-6">
            {/* Study Progress */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total:</span>
                  <span className="font-medium text-gray-900">{flashcards.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Studied:</span>
                  <span className="font-medium text-green-600">{studiedCards.size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Remaining:</span>
                  <span className="font-medium text-orange-600">{flashcards.length - studiedCards.size}</span>
                </div>
              </div>
            </div>

            {/* Study Tips */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
              <h3 className="font-bold text-purple-900 mb-4">Tips</h3>
              <ul className="space-y-2 text-purple-800 text-sm">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Read carefully before flipping
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Try to answer first
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Review difficult cards
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Use shuffle to randomize
                </li>
              </ul>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">Next Steps</h3>
              <div className="space-y-3">
                <button 
                  onClick={handleNavigateToAudio}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Volume2 className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium text-gray-900">Listen Audio</span>
                </button>
                <button 
                  onClick={handleNavigateToQuiz}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <Play className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium text-gray-900">Take Quiz</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardsViewer;