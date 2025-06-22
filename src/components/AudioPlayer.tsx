import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, RotateCcw, Download, BookOpen, SkipBack, SkipForward } from 'lucide-react';
import toast from 'react-hot-toast';

interface AudioPlayerProps {
  title: string;
  description: string;
  audioUrl: string;
  onBack: () => void;
  onNavigate?: (targetView: 'audio' | 'flashcards' | 'take-quiz') => void;
  quizData?: any;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  title, 
  description, 
  audioUrl, 
  onBack, 
  onNavigate,
  quizData 
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const skipTime = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const changePlaybackRate = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownloadAudio = async () => {
    try {
      toast.loading('Preparing download...');
      
      // For blob URLs, we can directly download
      if (audioUrl.startsWith('blob:')) {
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_revision.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For regular URLs, fetch and download
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch audio');
        }
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_revision.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(blobUrl);
      }
      
      toast.dismiss();
      toast.success('Audio download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.dismiss();
      toast.error('Failed to download audio. Please try again.');
    }
  };

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
              <p className="text-gray-600 text-sm">AI-Generated Audio Revision</p>
            </div>
          </div>
        </div>
        {/* Mobile title */}
        <div className="sm:hidden mt-2">
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 text-sm">AI-Generated Audio Revision</p>
        </div>
      </div>

      {/* Audio Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Audio Player */}
          <div className="lg:col-span-2">
            {/* Main Audio Player Card */}
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 sm:p-8 text-white shadow-2xl">
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-16 sm:w-24 h-16 sm:h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Volume2 className="w-8 sm:w-12 h-8 sm:h-12 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Audio Revision Guide</h2>
                <p className="text-purple-100 text-sm sm:text-base">Listen to your personalized study summary</p>
              </div>

              {/* Audio Element */}
              <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
                className="hidden"
              />

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-purple-100 mb-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-white bg-opacity-20 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center space-x-4 sm:space-x-6 mb-6">
                <button
                  onClick={() => skipTime(-10)}
                  className="p-2 sm:p-3 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors"
                >
                  <SkipBack className="w-5 sm:w-6 h-5 sm:h-6" />
                </button>
                
                <button
                  onClick={togglePlayPause}
                  className="p-3 sm:p-4 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors"
                >
                  {isPlaying ? <Pause className="w-6 sm:w-8 h-6 sm:h-8" /> : <Play className="w-6 sm:w-8 h-6 sm:h-8" />}
                </button>
                
                <button
                  onClick={() => skipTime(10)}
                  className="p-2 sm:p-3 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors"
                >
                  <SkipForward className="w-5 sm:w-6 h-5 sm:h-6" />
                </button>
              </div>

              {/* Volume and Speed Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <button onClick={toggleMute} className="text-white hover:text-purple-200">
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-white bg-opacity-20 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-purple-100">Speed:</span>
                  {[0.75, 1, 1.25, 1.5].map(rate => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      className={`px-2 py-1 rounded text-xs ${
                        playbackRate === rate 
                          ? 'bg-white text-purple-600' 
                          : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Audio Description */}
            <div className="mt-6 bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">About This Audio</h2>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed mb-6">
                {description}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <button 
                  onClick={handleDownloadAudio}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Audio</span>
                </button>
                <button 
                  onClick={() => {
                    const audio = audioRef.current;
                    if (audio) {
                      audio.currentTime = 0;
                      setCurrentTime(0);
                    }
                  }}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restart</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Audio Info */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">Audio Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration:</span>
                  <span className="font-medium text-gray-900">{formatTime(duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Generated:</span>
                  <span className="font-medium text-gray-900">Just now</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Quality:</span>
                  <span className="font-medium text-gray-900">High Quality</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Voice:</span>
                  <span className="font-medium text-gray-900">AI Generated</span>
                </div>
              </div>
            </div>

            {/* Study Tips */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
              <h3 className="font-bold text-green-900 mb-4">Listening Tips</h3>
              <ul className="space-y-2 text-green-800 text-sm">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Listen actively and take notes
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Pause and replay difficult concepts
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Adjust playback speed as needed
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Review flashcards after listening
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

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
};

export default AudioPlayer;