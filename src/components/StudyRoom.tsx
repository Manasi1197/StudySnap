import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, 
  MessageSquare, 
  Share2, 
  Settings, 
  Copy, 
  ExternalLink, 
  Send, 
  Paperclip, 
  MoreVertical,
  UserPlus,
  Crown,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Square,
  Circle,
  Triangle,
  Minus,
  Type,
  Eraser,
  Pencil,
  Palette,
  Download,
  Upload,
  Trash2,
  Eye,
  Play,
  BookOpen,
  Brain,
  FileText,
  Image as ImageIcon,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  RotateCcw as Reset,
  Trophy
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface StudyRoomProps {
  onNavigate?: (page: string) => void;
}

interface Room {
  id: string;
  name: string;
  description: string;
  subject: string;
  difficulty: string;
  max_participants: number;
  is_public: boolean;
  created_by: string;
  session_type: string;
  tags: string[];
  room_code: string;
  status: string;
  scheduled_for: string | null;
  created_at: string;
  creator_profile?: {
    full_name: string;
    email: string;
  };
}

interface Participant {
  id: string;
  room_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  is_active: boolean;
  profile?: {
    full_name: string;
    email: string;
  };
}

interface Message {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  message_type: string;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

interface SharedContent {
  id: string;
  room_id: string;
  user_id: string;
  content_type: string;
  content_id: string | null;
  shared_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
  quiz_data?: any;
  material_data?: any;
}

interface DrawingPoint {
  x: number;
  y: number;
  tool: string;
  color: string;
  size: number;
}

interface DrawingStroke {
  points: DrawingPoint[];
  tool: string;
  color: string;
  size: number;
}

const StudyRoom: React.FC<StudyRoomProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'browse' | 'room' | 'create' | 'quiz-view' | 'material-view' | 'quiz-taking'>('browse');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sharedContent, setSharedContent] = useState<SharedContent[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'whiteboard' | 'resources'>('chat');
  const [viewingQuiz, setViewingQuiz] = useState<any>(null);
  const [viewingMaterial, setViewingMaterial] = useState<any>(null);
  const [takingQuiz, setTakingQuiz] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pencil' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text'>('pencil');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [drawingHistory, setDrawingHistory] = useState<DrawingStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<DrawingPoint[]>([]);

  // Real-time subscriptions
  useEffect(() => {
    if (!currentRoom) return;

    console.log('Setting up real-time subscriptions for room:', currentRoom.id);

    // Subscribe to messages
    const messagesSubscription = supabase
      .channel(`room_messages_${currentRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${currentRoom.id}`
        },
        (payload) => {
          console.log('Real-time message update:', payload);
          if (payload.eventType === 'INSERT') {
            loadMessages(); // Reload messages to get profile data
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to shared content
    const contentSubscription = supabase
      .channel(`room_shared_content_${currentRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_shared_content',
          filter: `room_id=eq.${currentRoom.id}`
        },
        (payload) => {
          console.log('Real-time shared content update:', payload);
          if (payload.eventType === 'INSERT') {
            loadSharedContent(); // Reload shared content to get profile data
          } else if (payload.eventType === 'DELETE') {
            setSharedContent(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to participants
    const participantsSubscription = supabase
      .channel(`room_participants_${currentRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${currentRoom.id}`
        },
        (payload) => {
          console.log('Real-time participants update:', payload);
          loadParticipants(); // Reload participants to get profile data
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscriptions');
      messagesSubscription.unsubscribe();
      contentSubscription.unsubscribe();
      participantsSubscription.unsubscribe();
    };
  }, [currentRoom?.id]);

  // Load rooms
  const loadRooms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('study_rooms')
        .select(`
          *,
          creator_profile:profiles!study_rooms_created_by_fkey(full_name, email)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (error: any) {
      console.error('Error loading rooms:', error);
      toast.error('Failed to load study rooms');
    } finally {
      setLoading(false);
    }
  };

  // Load messages with profile data
  const loadMessages = async () => {
    if (!currentRoom) return;

    try {
      const { data, error } = await supabase
        .from('room_messages')
        .select(`
          *,
          profile:profiles!room_messages_user_id_fkey(full_name, email)
        `)
        .eq('room_id', currentRoom.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      console.log('Loaded messages:', data);
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error loading messages:', error);
    }
  };

  // Load shared content with profile data
  const loadSharedContent = async () => {
    if (!currentRoom) return;

    try {
      const { data, error } = await supabase
        .from('room_shared_content')
        .select(`
          *,
          profile:profiles!room_shared_content_user_id_fkey(full_name, email)
        `)
        .eq('room_id', currentRoom.id)
        .order('shared_at', { ascending: false });

      if (error) throw error;
      console.log('Loaded shared content:', data);
      setSharedContent(data || []);
    } catch (error: any) {
      console.error('Error loading shared content:', error);
    }
  };

  // Load participants with profile data
  const loadParticipants = async () => {
    if (!currentRoom) return;

    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select(`
          *,
          profile:profiles!room_participants_user_id_fkey(full_name, email)
        `)
        .eq('room_id', currentRoom.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setParticipants(data || []);
    } catch (error: any) {
      console.error('Error loading participants:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !currentRoom || !user) return;

    try {
      console.log('Sending message:', newMessage);
      const { error } = await supabase
        .from('room_messages')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          message: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;
      
      setNewMessage('');
      console.log('Message sent successfully');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Share resource
  const shareResource = async (type: 'quiz' | 'material', data: any) => {
    if (!currentRoom || !user) return;

    try {
      console.log('Sharing resource:', type, data);
      
      // Insert shared content
      const { error: contentError } = await supabase
        .from('room_shared_content')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          content_type: type === 'quiz' ? 'quiz' : 'study_material',
          content_id: data.id || null
        });

      if (contentError) throw contentError;

      // Send a message about the shared resource
      const resourceMessage = type === 'quiz' 
        ? `📝 Shared quiz: "${data.title}"`
        : `📄 Shared material: "${data.title}"`;

      const { error: messageError } = await supabase
        .from('room_messages')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          message: resourceMessage,
          message_type: type === 'quiz' ? 'quiz_share' : 'file'
        });

      if (messageError) throw messageError;

      // Store the actual data in localStorage for access
      const storageKey = `shared_${type}_${data.id || Date.now()}`;
      localStorage.setItem(storageKey, JSON.stringify(data));

      toast.success(`${type === 'quiz' ? 'Quiz' : 'Material'} shared successfully!`);
      console.log('Resource shared successfully');
    } catch (error: any) {
      console.error('Error sharing resource:', error);
      toast.error(`Failed to share ${type}`);
    }
  };

  // Join room
  const joinRoom = async (room: Room) => {
    if (!user) return;

    try {
      // Check if already a participant
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!existingParticipant) {
        // Add as participant
        const { error } = await supabase
          .from('room_participants')
          .insert({
            room_id: room.id,
            user_id: user.id,
            role: 'participant'
          });

        if (error) throw error;
      }

      setCurrentRoom(room);
      setCurrentView('room');
      
      // Load room data
      await Promise.all([
        loadMessages(),
        loadParticipants(),
        loadSharedContent()
      ]);
      
      toast.success(`Joined ${room.name}`);
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    }
  };

  // Leave room
  const leaveRoom = async () => {
    if (!currentRoom || !user) return;

    try {
      const { error } = await supabase
        .from('room_participants')
        .update({ is_active: false })
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setCurrentRoom(null);
      setCurrentView('browse');
      setMessages([]);
      setParticipants([]);
      setSharedContent([]);
      
      toast.success('Left the room');
    } catch (error: any) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load rooms on mount
  useEffect(() => {
    loadRooms();
  }, []);

  // Quiz Taking Component
  const QuizTaking: React.FC<{ quiz: any; onBack: () => void }> = ({ quiz, onBack }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [showResults, setShowResults] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    if (!quiz || !quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Invalid Quiz Data</h2>
          <button onClick={onBack} className="px-4 py-2 bg-gray-500 text-white rounded-lg">
            Back to Room
          </button>
        </div>
      );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const totalQuestions = quiz.questions.length;
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

    const handleAnswerChange = (answer: any) => {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: answer
      }));
    };

    const nextQuestion = () => {
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
      const unansweredQuestions = quiz.questions.filter((q: any) => 
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
      quiz.questions.forEach((question: any) => {
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

    if (showResults) {
      const score = calculateScore();
      const percentage = Math.round((score / totalQuestions) * 100);
      
      return (
        <div className="p-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg text-center">
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
              <div className="text-6xl font-bold text-gray-900 mb-6">
                {percentage}%
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={restartQuiz}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Reset className="w-4 h-4" />
                  <span>Retake Quiz</span>
                </button>
                <button
                  onClick={onBack}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Room</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
              <p className="text-gray-600">Question {currentQuestionIndex + 1} of {totalQuestions}</p>
            </div>
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Room</span>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question */}
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="mb-8">
              <div className="flex items-center space-x-2 mb-4">
                <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-medium">
                  {currentQuestion.type?.replace('-', ' ').toUpperCase() || 'QUESTION'}
                </span>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                  {currentQuestion.difficulty?.toUpperCase() || 'MEDIUM'}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{currentQuestion.question}</h2>
            </div>

            {/* Answer Options */}
            <div className="mb-8">
              {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option: string, index: number) => (
                    <label key={index} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name={currentQuestion.id}
                        value={index}
                        checked={answers[currentQuestion.id] === index}
                        onChange={() => handleAnswerChange(index)}
                        className="mr-4 text-blue-600"
                      />
                      <span className="text-gray-900">{option}</span>
                    </label>
                  ))}
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
      </div>
    );
  };

  // Quiz View Component
  const QuizView: React.FC<{ quiz: any; onBack: () => void }> = ({ quiz, onBack }) => {
    const handleTakeQuiz = () => {
      setTakingQuiz(quiz);
      setCurrentView('quiz-taking');
    };

    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
              <p className="text-gray-600 mt-2">{quiz.description}</p>
            </div>
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Room</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Quiz Overview</h2>
                
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <Brain className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-blue-600">Questions</p>
                        <p className="font-bold text-blue-900">{quiz.questions?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm text-green-600">Est. Time</p>
                        <p className="font-bold text-green-900">{quiz.estimatedTime || 10} min</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900">Question Preview</h3>
                  {quiz.questions?.slice(0, 3).map((question: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                          Q{index + 1}
                        </span>
                        <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs">
                          {question.type?.replace('-', ' ') || 'Question'}
                        </span>
                      </div>
                      <p className="text-gray-900">{question.question}</p>
                    </div>
                  ))}
                  {quiz.questions?.length > 3 && (
                    <p className="text-gray-500 text-sm">
                      +{quiz.questions.length - 3} more questions...
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Ready to Start?</h3>
                <button
                  onClick={handleTakeQuiz}
                  className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center space-x-2"
                >
                  <Play className="w-5 h-5" />
                  <span>Take Quiz</span>
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Instructions</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Answer all questions to complete the quiz
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    You can navigate between questions
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Submit when you're ready to see results
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Material View Component
  const MaterialView: React.FC<{ material: any; onBack: () => void }> = ({ material, onBack }) => {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{material.title}</h1>
              <p className="text-gray-600 mt-2">Study Material</p>
            </div>
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Room</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="prose prose-gray max-w-none">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {material.content || material.extracted_text || 'No content available'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Create Room Modal
  const CreateRoomModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      subject: '',
      difficulty: 'beginner',
      session_type: 'study',
      max_participants: 10,
      is_public: true
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;

      try {
        const roomCode = Math.random().toString(36).substr(2, 8).toUpperCase();
        
        const { data, error } = await supabase
          .from('study_rooms')
          .insert({
            ...formData,
            created_by: user.id,
            room_code: roomCode,
            tags: []
          })
          .select()
          .single();

        if (error) throw error;

        // Join the room as creator
        await supabase
          .from('room_participants')
          .insert({
            room_id: data.id,
            user_id: user.id,
            role: 'host'
          });

        setShowCreateModal(false);
        await joinRoom(data);
        toast.success('Room created successfully!');
      } catch (error: any) {
        console.error('Error creating room:', error);
        toast.error('Failed to create room');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Study Room</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Room Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session Type</label>
                <select
                  value={formData.session_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, session_type: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="study">Study</option>
                  <option value="quiz">Quiz</option>
                  <option value="discussion">Discussion</option>
                  <option value="presentation">Presentation</option>
                </select>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_public" className="ml-3 text-sm text-gray-700">
                Make room public
              </label>
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Create Room
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Join Room Modal
  const JoinRoomModal = () => {
    const handleJoinByCode = async () => {
      if (!joinCode.trim()) return;

      try {
        const { data: room, error } = await supabase
          .from('study_rooms')
          .select('*')
          .eq('room_code', joinCode.toUpperCase())
          .eq('status', 'active')
          .single();

        if (error || !room) {
          toast.error('Room not found');
          return;
        }

        await joinRoom(room);
        setShowJoinModal(false);
        setJoinCode('');
      } catch (error: any) {
        console.error('Error joining room by code:', error);
        toast.error('Failed to join room');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Join Room</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Room Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinByCode}
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Join Room
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Share Modal
  const ShareModal = () => {
    const [shareType, setShareType] = useState<'quiz' | 'material'>('quiz');
    const [userQuizzes, setUserQuizzes] = useState<any[]>([]);
    const [userMaterials, setUserMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (showShareModal) {
        loadUserContent();
      }
    }, [showShareModal]);

    const loadUserContent = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Load user's quizzes
        const { data: quizzes } = await supabase
          .from('quizzes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Load user's materials
        const { data: materials } = await supabase
          .from('study_materials')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        setUserQuizzes(quizzes || []);
        setUserMaterials(materials || []);
      } catch (error) {
        console.error('Error loading user content:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleShare = async (item: any) => {
      await shareResource(shareType, item);
      setShowShareModal(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-hidden">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Share Content</h2>
          
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setShareType('quiz')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                shareType === 'quiz' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Quizzes
            </button>
            <button
              onClick={() => setShareType('material')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                shareType === 'material' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Materials
            </button>
          </div>

          <div className="overflow-y-auto max-h-96">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shareType === 'quiz' ? (
                  userQuizzes.length > 0 ? (
                    userQuizzes.map((quiz) => (
                      <div key={quiz.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <h3 className="font-medium text-gray-900">{quiz.title}</h3>
                          <p className="text-sm text-gray-600">{quiz.description}</p>
                        </div>
                        <button
                          onClick={() => handleShare(quiz)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Share
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 text-center py-8">No quizzes found</p>
                  )
                ) : (
                  userMaterials.length > 0 ? (
                    userMaterials.map((material) => (
                      <div key={material.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <h3 className="font-medium text-gray-900">{material.title}</h3>
                          <p className="text-sm text-gray-600">{material.file_type}</p>
                        </div>
                        <button
                          onClick={() => handleShare(material)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Share
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 text-center py-8">No materials found</p>
                  )
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowShareModal(false)}
              className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Whiteboard Component
  const Whiteboard = () => {
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setIsDrawing(true);
      setCurrentStroke([{ x, y, tool: currentTool, color: currentColor, size: brushSize }]);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const newPoint = { x, y, tool: currentTool, color: currentColor, size: brushSize };
      setCurrentStroke(prev => [...prev, newPoint]);

      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : currentColor;

      if (currentStroke.length > 0) {
        const lastPoint = currentStroke[currentStroke.length - 1];
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    };

    const stopDrawing = () => {
      if (isDrawing && currentStroke.length > 0) {
        setDrawingHistory(prev => [...prev, { 
          points: currentStroke, 
          tool: currentTool, 
          color: currentColor, 
          size: brushSize 
        }]);
        setCurrentStroke([]);
      }
      setIsDrawing(false);
    };

    const clearCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setDrawingHistory([]);
      setCurrentStroke([]);
    };

    const redrawCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawingHistory.forEach(stroke => {
        if (stroke.points.length < 2) return;

        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;

        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      });
    };

    useEffect(() => {
      redrawCanvas();
    }, [drawingHistory]);

    return (
      <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentTool('pencil')}
                className={`p-2 rounded-lg transition-colors ${
                  currentTool === 'pencil' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentTool('eraser')}
                className={`p-2 rounded-lg transition-colors ${
                  currentTool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Eraser className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                className="w-8 h-8 rounded border border-gray-300"
              />
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-gray-600">{brushSize}px</span>
            </div>
          </div>

          <button
            onClick={clearCanvas}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-white">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
      </div>
    );
  };

  // Render different views
  if (currentView === 'quiz-taking' && takingQuiz) {
    return <QuizTaking quiz={takingQuiz} onBack={() => setCurrentView('room')} />;
  }

  if (currentView === 'quiz-view' && viewingQuiz) {
    return <QuizView quiz={viewingQuiz} onBack={() => setCurrentView('room')} />;
  }

  if (currentView === 'material-view' && viewingMaterial) {
    return <MaterialView material={viewingMaterial} onBack={() => setCurrentView('room')} />;
  }

  if (currentView === 'create') {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center space-x-4 mb-8">
            <button
              onClick={() => setCurrentView('browse')}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Browse</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Create Study Room</h1>
          </div>
          {/* Create room form would go here */}
        </div>
      </div>
    );
  }

  if (currentView === 'room' && currentRoom) {
    return (
      <div className="h-screen flex flex-col">
        {/* Room Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={leaveRoom}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Leave Room</span>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{currentRoom.name}</h1>
                <p className="text-gray-600">{currentRoom.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Code: <span className="font-mono font-bold">{currentRoom.room_code}</span>
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentRoom.room_code);
                  toast.success('Room code copied!');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Tab Navigation */}
            <div className="bg-white border-b border-gray-200">
              <div className="flex space-x-8 px-6">
                {[
                  { id: 'chat', label: 'Chat', icon: MessageSquare },
                  { id: 'whiteboard', label: 'Whiteboard', icon: Square },
                  { id: 'resources', label: 'Resources', icon: Share2 },
                  { id: 'participants', label: 'Participants', icon: Users }
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'chat' && (
                <div className="h-full flex flex-col">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className="flex space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {message.profile?.full_name?.charAt(0) || message.profile?.email?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900">
                              {message.profile?.full_name || message.profile?.email || 'Unknown User'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-gray-700">
                            {message.message_type === 'quiz_share' && message.message.includes('📝') ? (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-blue-800">{message.message}</p>
                                <button
                                  onClick={() => {
                                    // Try to find the quiz data in shared content
                                    const quizShare = sharedContent.find(c => 
                                      c.content_type === 'quiz' && 
                                      c.user_id === message.user_id &&
                                      Math.abs(new Date(c.shared_at).getTime() - new Date(message.created_at).getTime()) < 5000
                                    );
                                    
                                    if (quizShare) {
                                      // Try to get quiz data from localStorage
                                      const storageKey = `shared_quiz_${quizShare.content_id}`;
                                      const storedQuiz = localStorage.getItem(storageKey);
                                      
                                      if (storedQuiz) {
                                        const quizData = JSON.parse(storedQuiz);
                                        setViewingQuiz(quizData);
                                        setCurrentView('quiz-view');
                                      } else {
                                        toast.error('Quiz data not found');
                                      }
                                    } else {
                                      toast.error('Quiz not found');
                                    }
                                  }}
                                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                  View Quiz →
                                </button>
                              </div>
                            ) : message.message_type === 'file' && message.message.includes('📄') ? (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-green-800">{message.message}</p>
                                <button
                                  onClick={() => {
                                    // Try to find the material data in shared content
                                    const materialShare = sharedContent.find(c => 
                                      c.content_type === 'study_material' && 
                                      c.user_id === message.user_id &&
                                      Math.abs(new Date(c.shared_at).getTime() - new Date(message.created_at).getTime()) < 5000
                                    );
                                    
                                    if (materialShare) {
                                      // Try to get material data from localStorage
                                      const storageKey = `shared_material_${materialShare.content_id}`;
                                      const storedMaterial = localStorage.getItem(storageKey);
                                      
                                      if (storedMaterial) {
                                        const materialData = JSON.parse(storedMaterial);
                                        setViewingMaterial(materialData);
                                        setCurrentView('material-view');
                                      } else {
                                        toast.error('Material data not found');
                                      }
                                    } else {
                                      toast.error('Material not found');
                                    }
                                  }}
                                  className="mt-2 text-green-600 hover:text-green-700 text-sm font-medium"
                                >
                                  View Material →
                                </button>
                              </div>
                            ) : (
                              <p>{message.message}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-gray-200 p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 flex items-center space-x-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          placeholder="Type a message..."
                          className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => setShowShareModal(true)}
                          className="p-3 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Paperclip className="w-5 h-5" />
                        </button>
                      </div>
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'whiteboard' && <Whiteboard />}

              {activeTab === 'resources' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Shared Resources</h2>
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share Content</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {sharedContent.map((content) => (
                      <div key={content.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              content.content_type === 'quiz' ? 'bg-blue-100' : 'bg-green-100'
                            }`}>
                              {content.content_type === 'quiz' ? (
                                <Brain className="w-5 h-5 text-blue-600" />
                              ) : (
                                <FileText className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {content.content_type === 'quiz' ? 'Quiz' : 'Study Material'}
                              </p>
                              <p className="text-sm text-gray-500">
                                Shared by {content.profile?.full_name || content.profile?.email || 'Unknown User'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (content.content_type === 'quiz') {
                                const storageKey = `shared_quiz_${content.content_id}`;
                                const storedQuiz = localStorage.getItem(storageKey);
                                if (storedQuiz) {
                                  const quizData = JSON.parse(storedQuiz);
                                  setViewingQuiz(quizData);
                                  setCurrentView('quiz-view');
                                } else {
                                  toast.error('Quiz data not found');
                                }
                              } else {
                                const storageKey = `shared_material_${content.content_id}`;
                                const storedMaterial = localStorage.getItem(storageKey);
                                if (storedMaterial) {
                                  const materialData = JSON.parse(storedMaterial);
                                  setViewingMaterial(materialData);
                                  setCurrentView('material-view');
                                } else {
                                  toast.error('Material data not found');
                                }
                              }
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {sharedContent.length === 0 && (
                      <div className="text-center py-12">
                        <Share2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No resources shared yet</p>
                        <p className="text-gray-500 text-sm">Share quizzes and materials to get started</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'participants' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Participants ({participants.length})</h2>
                  </div>

                  <div className="space-y-3">
                    {participants.map((participant) => (
                      <div key={participant.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                            {participant.profile?.full_name?.charAt(0) || participant.profile?.email?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {participant.profile?.full_name || participant.profile?.email || 'Unknown User'}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                participant.role === 'host' 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {participant.role}
                              </span>
                              {participant.role === 'host' && (
                                <Crown className="w-4 h-4 text-yellow-500" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          Joined {new Date(participant.joined_at).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modals */}
        {showShareModal && <ShareModal />}
      </div>
    );
  }

  // Browse Rooms View
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Study Rooms</h1>
            <p className="text-gray-600">Join collaborative study sessions with other learners</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Join with Code</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Create Room</span>
            </button>
          </div>
        </div>

        {/* Rooms Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading study rooms...</p>
          </div>
        ) : rooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{room.name}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{room.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    room.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {room.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Subject:</span>
                    <span className="font-medium text-gray-900">{room.subject}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Difficulty:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      room.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                      room.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {room.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Type:</span>
                    <span className="font-medium text-gray-900">{room.session_type}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-500">
                    by {room.creator_profile?.full_name || room.creator_profile?.email || 'Unknown'}
                  </div>
                  <button
                    onClick={() => joinRoom(room)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                  >
                    Join Room
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No study rooms available</h3>
            <p className="text-gray-600 mb-6">Be the first to create a study room and start collaborating!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create First Room
            </button>
          </div>
        )}

        {/* Modals */}
        {showCreateModal && <CreateRoomModal />}
        {showJoinModal && <JoinRoomModal />}
      </div>
    </div>
  );
};

export default StudyRoom;