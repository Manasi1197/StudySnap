import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Shuffle, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

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
}

const FlashcardsViewer: React.FC<FlashcardsViewerProps> = ({ title, flashcards, onBack }) => {
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

  const progress = ((studiedCards.size) / flashcards.length) * 100;

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
              <span>Back to Quiz</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-gray-600">Study Flashcards</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={shuffleCards}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Shuffle className="w-4 h-4" />
              <span>Shuffle</span>
            </button>
            <button
              onClick={resetProgress}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Card {currentIndex + 1} of {flashcards.length}
          </span>
          <span className="text-sm font-medium text-gray-700">
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

      {/* Flashcard Content */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Flashcard */}
          <div className="lg:col-span-3">
            <div className="perspective-1000">
              <div 
                className={`relative w-full h-96 transform-style-preserve-3d transition-transform duration-700 cursor-pointer ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
                onClick={flipCard}
              >
                {/* Front of card */}
                <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-2xl p-8 flex flex-col justify-center items-center text-white">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Question</h2>
                    <p className="text-xl leading-relaxed">{currentCard?.front}</p>
                  </div>
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                    <p className="text-white text-opacity-80 text-sm">Click to reveal answer</p>
                  </div>
                </div>

                {/* Back of card */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-2xl p-8 flex flex-col justify-center items-center text-white">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Answer</h2>
                    <p className="text-xl leading-relaxed">{currentCard?.back}</p>
                  </div>
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                    <p className="text-white text-opacity-80 text-sm">Click to flip back</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={prevCard}
                disabled={currentIndex === 0}
                className="flex items-center space-x-2 px-6 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  Topic: <span className="font-medium text-gray-900">{currentCard?.topic}</span>
                </span>
              </div>

              <button
                onClick={nextCard}
                disabled={currentIndex === flashcards.length - 1}
                className="flex items-center space-x-2 px-6 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Study Progress */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">Study Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Cards:</span>
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
              <h3 className="font-bold text-purple-900 mb-4">Study Tips</h3>
              <ul className="space-y-2 text-purple-800 text-sm">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Read the question carefully before flipping
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Try to answer before revealing the back
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Review difficult cards multiple times
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Use shuffle to randomize your practice
                </li>
              </ul>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={onBack}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium text-gray-900">Take Quiz</span>
                </button>
                <button 
                  onClick={onBack}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium text-gray-900">Watch Video</span>
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