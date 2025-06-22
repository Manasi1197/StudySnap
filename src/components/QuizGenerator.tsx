import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  Image, 
  Trash2, 
  Brain, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Plus,
  Zap,
  BookOpen,
  Volume2,
  Play,
  ArrowRight,
  Settings,
  Globe,
  Target,
  Clock,
  Users,
  Sparkles,
  Camera,
  FileImage,
  File
} from 'lucide-react';
import { useQuizGenerator, UploadedFile } from '../hooks/useQuizGenerator';
import { useAuth } from '../hooks/useAuth';
import { generateAudioWithElevenLabs } from '../lib/elevenlabs';
import { generateVideoWithTavus } from '../lib/tavus';
import QuizTaker from './QuizTaker';
import FlashcardsViewer from './FlashcardsViewer';
import AudioPlayer from './AudioPlayer';
import VideoPlayer from './VideoPlayer';
import ApiKeyManager from './ApiKeyManager';
import toast from 'react-hot-toast';

interface QuizGeneratorProps {
  onNavigate?: (page: string) => void;
}

const QuizGenerator: React.FC<QuizGeneratorProps> = ({ onNavigate }) => {
  const { user } = useAuth();
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

  const [currentView, setCurrentView] = useState<'generator' | 'overview' | 'take-quiz' | 'flashcards' | 'audio' | 'video'>('generator');
  const [quizSettings, setQuizSettings] = useState({
    questionCount: 10,
    difficulty: 'medium',
    questionTypes: ['multiple-choice', 'true-false'],
    includeFlashcards: true,
    language: 'en'
  });

  // Audio generation states
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showApiKeyManager, setShowApiKeyManager] = useState(false);

  // Video generation states
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Check for pre-filled content from materials manager
  useEffect(() => {
    const savedContent = localStorage.getItem('quiz_generator_content');
    const savedTitle = localStorage.getItem('quiz_generator_title');
    
    if (savedContent) {
      setTextInput(savedContent);
      localStorage.removeItem('quiz_generator_content');
      
      if (savedTitle) {
        localStorage.removeItem('quiz_generator_title');
        toast.success(`Content loaded from: ${savedTitle.replace('Quiz from: ', '')}`);
      }
    }
  }, [setTextInput]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 
            file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'text',
      content: '',
      size: file.size,
      processingStatus: 'pending'
    }));

    addFiles(newFiles);

    // Process each file
    acceptedFiles.forEach((file, index) => {
      processFile(file, newFiles[index].id);
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

  const handleGenerateQuiz = async () => {
    if (!textInput.trim() && uploadedFiles.length === 0) {
      toast.error('Please add some content to generate a quiz');
      return;
    }

    // Check if any files are still processing
    const processingFiles = uploadedFiles.filter(f => f.processingStatus === 'processing');
    if (processingFiles.length > 0) {
      toast.error('Please wait for all files to finish processing');
      return;
    }

    // Check word count
    const allContent = [textInput, ...uploadedFiles.map(f => f.content)].join(' ');
    const wordCount = allContent.trim().split(/\s+/).length;
    
    if (wordCount < 50) {
      toast.error('Please provide at least 50 words of content to generate a meaningful quiz');
      return;
    }

    await generateQuiz(quizSettings);
    if (!isGenerating) {
      setCurrentView('overview');
    }
  };

  const handleGenerateAudio = async () => {
    if (!generatedQuiz) return;

    setIsGeneratingAudio(true);
    setAudioError(null);

    try {
      const url = await generateAudioWithElevenLabs(
        generatedQuiz.title,
        generatedQuiz.description,
        generatedQuiz.questions,
        generatedQuiz.flashcards,
        (error) => {
          setAudioError(error.message);
          setShowApiKeyManager(true);
        }
      );
      setAudioUrl(url);
      toast.success('Audio generated successfully!');
    } catch (error: any) {
      console.error('Audio generation error:', error);
      setAudioError(error.message || 'Failed to generate audio');
      
      if (error.isExpired || error.isInvalid) {
        setShowApiKeyManager(true);
      } else {
        toast.error('Failed to generate audio. Please try again.');
      }
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!generatedQuiz) return;

    setIsGeneratingVideo(true);
    setVideoError(null);

    try {
      const url = await generateVideoWithTavus(
        generatedQuiz.title,
        generatedQuiz.description,
        (error) => {
          setVideoError(error.message);
          // Could add video API key manager here if needed
        }
      );
      setVideoUrl(url);
      toast.success('Video generated successfully!');
    } catch (error: any) {
      console.error('Video generation error:', error);
      setVideoError(error.message || 'Failed to generate video');
      toast.error('Failed to generate video. Please try again.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleApiKeyUpdated = (newApiKey: string) => {
    setAudioError(null);
    setShowApiKeyManager(false);
    toast.success('API key updated! You can now generate audio.');
  };

  const handleViewChange = (view: 'audio' | 'flashcards' | 'take-quiz' | 'video') => {
    if (view === 'audio' && audioUrl) {
      setCurrentView('audio');
    } else if (view === 'video' && videoUrl) {
      setCurrentView('video');
    } else if (view === 'flashcards') {
      setCurrentView('flashcards');
    } else if (view === 'take-quiz') {
      setCurrentView('take-quiz');
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <FileImage className="w-5 h-5 text-blue-500" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const wordCount = textInput.trim() ? textInput.trim().split(/\s+/).length : 0;
  const totalWords = wordCount + uploadedFiles.reduce((sum, file) => {
    return sum + (file.content ? file.content.trim().split(/\s+/).length : 0);
  }, 0);

  // Render different views
  if (currentView === 'take-quiz' && generatedQuiz) {
    return (
      <QuizTaker
        quiz={generatedQuiz}
        onBack={() => setCurrentView('overview')}
        onNavigate={handleViewChange}
      />
    );
  }

  if (currentView === 'flashcards' && generatedQuiz) {
    return (
      <FlashcardsViewer
        title={generatedQuiz.title}
        flashcards={generatedQuiz.flashcards}
        onBack={() => setCurrentView('overview')}
        onNavigate={handleViewChange}
        quizData={generatedQuiz}
      />
    );
  }

  if (currentView === 'audio' && audioUrl && generatedQuiz) {
    return (
      <AudioPlayer
        title={generatedQuiz.title}
        description={generatedQuiz.description}
        audioUrl={audioUrl}
        onBack={() => setCurrentView('overview')}
        onNavigate={handleViewChange}
        quizData={generatedQuiz}
      />
    );
  }

  if (currentView === 'video' && videoUrl && generatedQuiz) {
    return (
      <VideoPlayer
        title={generatedQuiz.title}
        description={generatedQuiz.description}
        videoUrl={videoUrl}
        onBack={() => setCurrentView('overview')}
        onNavigate={handleViewChange}
        quizData={generatedQuiz}
      />
    );
  }

  if (currentView === 'overview' && generatedQuiz) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{generatedQuiz.title}</h1>
              <p className="text-gray-600">{generatedQuiz.description}</p>
            </div>
            <button
              onClick={() => {
                setCurrentView('generator');
                reset();
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Quiz</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Brain className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{generatedQuiz.questions.length}</p>
                  <p className="text-sm text-gray-500">Questions</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{generatedQuiz.flashcards.length}</p>
                  <p className="text-sm text-gray-500">Flashcards</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{generatedQuiz.estimatedTime}</p>
                  <p className="text-sm text-gray-500">Minutes</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">Mixed</p>
                  <p className="text-sm text-gray-500">Difficulty</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Take Quiz Card */}
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-white opacity-70" />
              </div>
              <h3 className="text-lg font-bold mb-2">Take Quiz</h3>
              <p className="text-blue-100 text-sm mb-4">Test your knowledge with {generatedQuiz.questions.length} questions</p>
              <button
                onClick={() => setCurrentView('take-quiz')}
                className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white py-2 px-4 rounded-lg transition-colors font-medium"
              >
                Start Quiz
              </button>
            </div>

            {/* Flashcards Card */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-white opacity-70" />
              </div>
              <h3 className="text-lg font-bold mb-2">Study Flashcards</h3>
              <p className="text-green-100 text-sm mb-4">Review {generatedQuiz.flashcards.length} key concepts</p>
              <button
                onClick={() => setCurrentView('flashcards')}
                className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white py-2 px-4 rounded-lg transition-colors font-medium"
              >
                Study Cards
              </button>
            </div>

            {/* AI Audio Card */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Volume2 className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-white opacity-70" />
              </div>
              <h3 className="text-lg font-bold mb-2">AI Audio Guide</h3>
              <p className="text-purple-100 text-sm mb-4">Listen to personalized study content</p>
              
              {audioUrl ? (
                <button
                  onClick={() => setCurrentView('audio')}
                  className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white py-2 px-4 rounded-lg transition-colors font-medium"
                >
                  Listen Now
                </button>
              ) : (
                <button
                  onClick={handleGenerateAudio}
                  disabled={isGeneratingAudio}
                  className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white py-2 px-4 rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isGeneratingAudio ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <span>Generate Audio</span>
                  )}
                </button>
              )}
              
              {audioError && (
                <p className="text-xs text-red-200 mt-2">{audioError}</p>
              )}
            </div>

            {/* AI Video Card */}
            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-white opacity-70" />
              </div>
              <h3 className="text-lg font-bold mb-2">AI Video</h3>
              <p className="text-orange-100 text-sm mb-4">Watch AI-generated educational content</p>
              
              {videoUrl ? (
                <button
                  onClick={() => setCurrentView('video')}
                  className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white py-2 px-4 rounded-lg transition-colors font-medium"
                >
                  Watch Video
                </button>
              ) : (
                <button
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo}
                  className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white py-2 px-4 rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <span>Generate Video</span>
                  )}
                </button>
              )}
              
              {videoError && (
                <p className="text-xs text-red-200 mt-2">{videoError}</p>
              )}
            </div>
          </div>

          {/* Question Preview */}
          <div className="mt-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Question Preview</h2>
              <p className="text-gray-600">Sample questions from your generated quiz</p>
            </div>
            <div className="p-6 space-y-6">
              {generatedQuiz.questions.slice(0, 3).map((question, index) => (
                <div key={question.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-medium">
                      Question {index + 1}
                    </span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium capitalize">
                      {question.difficulty}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-3">{question.question}</h4>
                  {question.type === 'multiple-choice' && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            optionIndex === question.correctAnswer 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-gray-300'
                          }`}></div>
                          <span className={`text-sm ${
                            optionIndex === question.correctAnswer 
                              ? 'text-green-700 font-medium' 
                              : 'text-gray-600'
                          }`}>
                            {option}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {question.type === 'true-false' && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          question.correctAnswer === true 
                            ? 'bg-green-500 border-green-500' 
                            : 'border-gray-300'
                        }`}></div>
                        <span className={`text-sm ${
                          question.correctAnswer === true 
                            ? 'text-green-700 font-medium' 
                            : 'text-gray-600'
                        }`}>
                          True
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          question.correctAnswer === false 
                            ? 'bg-green-500 border-green-500' 
                            : 'border-gray-300'
                        }`}></div>
                        <span className={`text-sm ${
                          question.correctAnswer === false 
                            ? 'text-green-700 font-medium' 
                            : 'text-gray-600'
                        }`}>
                          False
                        </span>
                      </div>
                    </div>
                  )}
                  {question.type === 'fill-blank' && (
                    <div className="bg-gray-50 border border-gray-200 rounded p-2">
                      <span className="text-sm text-gray-600">Answer: </span>
                      <span className="text-sm font-medium text-green-700">{question.correctAnswer}</span>
                    </div>
                  )}
                </div>
              ))}
              
              {generatedQuiz.questions.length > 3 && (
                <div className="text-center pt-4 border-t border-gray-100">
                  <p className="text-gray-500 text-sm">
                    And {generatedQuiz.questions.length - 3} more questions...
                  </p>
                  <button
                    onClick={() => setCurrentView('take-quiz')}
                    className="mt-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Take the full quiz →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* API Key Manager Modal */}
        <ApiKeyManager
          isOpen={showApiKeyManager}
          onClose={() => setShowApiKeyManager(false)}
          onApiKeyUpdated={handleApiKeyUpdated}
          currentError={audioError || undefined}
        />
      </div>
    );
  }

  // Main generator view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Quiz Generator</h1>
            <p className="text-gray-600">Transform your study materials into interactive quizzes with AI</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              {totalWords > 0 && (
                <span className={`font-medium ${totalWords >= 50 ? 'text-green-600' : 'text-orange-600'}`}>
                  {totalWords} words {totalWords < 50 && '(minimum 50 needed)'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* File Upload */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Upload Study Materials</h2>
              
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  isDragActive 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {isDragActive ? 'Drop files here' : 'Upload your files'}
                </h3>
                <p className="text-gray-600 mb-4">
                  Drag and drop files or click to browse
                </p>
                <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <FileImage className="w-4 h-4" />
                    <span>Images</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>PDFs</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <File className="w-4 h-4" />
                    <span>Text Files</span>
                  </div>
                </div>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="font-medium text-gray-900">Uploaded Files</h3>
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file.type)}
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.size)} • {file.type.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {file.processingStatus === 'processing' && (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        )}
                        {file.processingStatus === 'completed' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {file.processingStatus === 'error' && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Text Input */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Or Enter Text Directly</h2>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste your study notes, lecture content, or any educational material here..."
                className="w-full h-64 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-between items-center mt-3">
                <p className="text-sm text-gray-500">
                  {wordCount} words
                </p>
                {textInput && (
                  <button
                    onClick={() => setTextInput('')}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Clear text
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Settings Section */}
          <div className="space-y-6">
            {/* Quiz Settings */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Quiz Settings</span>
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Questions
                  </label>
                  <select
                    value={quizSettings.questionCount}
                    onChange={(e) => setQuizSettings(prev => ({ ...prev, questionCount: parseInt(e.target.value) }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                    <option value={20}>20 Questions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={quizSettings.difficulty}
                    onChange={(e) => setQuizSettings(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Types
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'multiple-choice', label: 'Multiple Choice' },
                      { value: 'true-false', label: 'True/False' },
                      { value: 'fill-blank', label: 'Fill in the Blank' }
                    ].map((type) => (
                      <label key={type.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={quizSettings.questionTypes.includes(type.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setQuizSettings(prev => ({
                                ...prev,
                                questionTypes: [...prev.questionTypes, type.value]
                              }));
                            } else {
                              setQuizSettings(prev => ({
                                ...prev,
                                questionTypes: prev.questionTypes.filter(t => t !== type.value)
                              }));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={quizSettings.includeFlashcards}
                      onChange={(e) => setQuizSettings(prev => ({ ...prev, includeFlashcards: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Include Flashcards</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateQuiz}
              disabled={isGenerating || (totalWords === 0) || (totalWords < 50)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating Quiz...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Quiz with AI</span>
                </>
              )}
            </button>

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>Pro Tips</span>
              </h3>
              <ul className="space-y-2 text-blue-800 text-sm">
                <li className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Upload clear images of notes or textbook pages</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Include at least 50 words for better quiz quality</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Mix different question types for variety</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Enable flashcards for key concept review</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizGenerator;