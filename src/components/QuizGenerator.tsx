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
  ChevronUp
} from 'lucide-react';
import { useQuizGenerator } from '../hooks/useQuizGenerator';
import toast from 'react-hot-toast';

const QuizGenerator: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showSettings, setShowSettings] = useState(false);
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
      type: file.type.startsWith('image/') ? 'image' as const : 'text' as const,
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

  const requestAIExplanation = async (questionId: string) => {
    // This would integrate with Tavus for video explanations
    console.log('Requesting AI video explanation for question:', questionId);
    toast.success('AI explanation feature coming soon!');
  };

  const translateContent = async (targetLanguage: string) => {
    console.log('Translating content to:', targetLanguage);
    setSelectedLanguage(targetLanguage);
    setQuizSettings(prev => ({ ...prev, language: targetLanguage }));
    toast.success(`Language changed to ${targetLanguage}`);
  };

  const resetGenerator = () => {
    setCurrentStep('upload');
    reset();
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
            <button className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
              <Play className="w-4 h-4" />
              <span>Start Quiz</span>
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

        {/* Questions Preview */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Questions Preview</h3>
          </div>
          <div className="p-6 space-y-6">
            {generatedQuiz.questions.slice(0, 3).map((question, index) => (
              <div key={question.id} className="border border-gray-100 rounded-lg p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-xs font-medium">
                        {question.type.replace('-', ' ').toUpperCase()}
                      </span>
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                        {question.difficulty.toUpperCase()}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-4 text-lg">
                      {index + 1}. {question.question}
                    </h4>
                    {question.options && (
                      <div className="space-y-3">
                        {question.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center space-x-3">
                            <div className="w-6 h-6 border border-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-sm text-gray-500">{String.fromCharCode(65 + optIndex)}</span>
                            </div>
                            <span className="text-gray-700">{option}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => requestAIExplanation(question.id)}
                    className="flex items-center space-x-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                  >
                    <Video className="w-4 h-4" />
                    <span className="text-sm">AI Explain</span>
                  </button>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-green-800">
                    <strong>Explanation:</strong> {question.explanation}
                  </p>
                </div>
              </div>
            ))}
            {generatedQuiz.questions.length > 3 && (
              <div className="text-center">
                <p className="text-gray-500 text-sm">
                  And {generatedQuiz.questions.length - 3} more questions...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Flashcards Preview */}
        {generatedQuiz.flashcards.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Flashcards Preview</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {generatedQuiz.flashcards.slice(0, 12).map(card => (
                  <div key={card.id} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                    <div className="text-center">
                      <p className="font-medium text-gray-900 mb-2 text-sm">{card.front}</p>
                      <p className="text-xs text-gray-600">{card.back}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
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
                            file.type === 'image' ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            {file.type === 'image' ? (
                              <Image className="w-5 h-5 text-blue-600" />
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
    </div>
  );
};

export default QuizGenerator;