import React, { useState } from 'react';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Download, BookOpen } from 'lucide-react';

interface VideoPlayerProps {
  title: string;
  description: string;
  videoUrl: string;
  onBack: () => void;
  onNavigate?: (targetView: 'video' | 'flashcards' | 'take-quiz') => void;
  quizData?: any;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  title, 
  description, 
  videoUrl, 
  onBack, 
  onNavigate,
  quizData 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handleNavigateToFlashcards = () => {
    if (onNavigate) {
      onNavigate('flashcards');
    }
  };

  const handleNavigateToQuiz = () => {
    if (onNavigate) {
      onNavigate('take-quiz');
    }
  };

  const handleDownloadVideo = () => {
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-gray-600">AI-Generated Educational Video</p>
            </div>
          </div>
        </div>
      </div>

      {/* Video Content */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
              <div className="relative aspect-video">
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full"
                  poster="/api/placeholder/800/450"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>

            {/* Video Controls */}
            <div className="mt-6 bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Video Description</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                {description}
              </p>
              
              <div className="flex items-center space-x-4">
                <button 
                  onClick={handleDownloadVideo}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Video</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Video Info */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">About This Video</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration:</span>
                  <span className="font-medium text-gray-900">~5 minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Generated:</span>
                  <span className="font-medium text-gray-900">Just now</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Quality:</span>
                  <span className="font-medium text-gray-900">HD 1080p</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Language:</span>
                  <span className="font-medium text-gray-900">English</span>
                </div>
              </div>
            </div>

            {/* Study Tips */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <h3 className="font-bold text-blue-900 mb-4">Study Tips</h3>
              <ul className="space-y-2 text-blue-800 text-sm">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Take notes while watching the video
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Pause and replay difficult concepts
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Review flashcards after watching
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Test your knowledge with the quiz
                </li>
              </ul>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">Next Steps</h3>
              <div className="space-y-3">
                <button 
                  onClick={handleNavigateToFlashcards}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium text-gray-900">Study Flashcards</span>
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

export default VideoPlayer;