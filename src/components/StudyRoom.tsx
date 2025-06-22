import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  Share2, 
  Settings, 
  LogOut, 
  Send, 
  Paperclip, 
  MoreVertical,
  Copy,
  ExternalLink,
  Brain,
  BookOpen,
  FileText,
  Palette,
  Eraser,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  Eye,
  Play,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Trophy,
  Volume2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface StudyRoomProps {
  onNavigate?: (page: string) => void;
}

interface StudyRoom {
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
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
}

interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  is_active: boolean;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface RoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  message_type: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface SharedContent {
  id: string;
  room_id: string;
  user_id: string;
  content_type: string;
  content_id?: string;
  shared_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  quiz_data?: any;
  material_data?: any;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: any[];
  flashcards: any[];
  estimatedTime: number;
}

const StudyRoom: React.FC<StudyRoomProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'rooms' | 'room' | 'quiz-view' | 'material-view' | 'quiz-taking'>('rooms');
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [sharedContent, setSharedContent] = useState<SharedContent[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [viewingQuiz, setViewingQuiz] = useState<Quiz | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<any>(null);
  const [takingQuiz, setTakingQuiz] = useState<Quiz | null>(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser'>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showResults, setShowResults] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageSubscriptionRef = useRef<any>(null);
  const contentSubscriptionRef = useRef<any>(null);
  const participantSubscriptionRef = useRef<any>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load rooms on component mount
  useEffect(() => {
    if (user) {
      loadRooms();
    }
  }, [user]);

  // Set up real-time subscriptions when entering a room
  useEffect(() => {
    if (currentRoom && user) {
      setupRealtimeSubscriptions();
      loadRoomData();
    }

    // Cleanup subscriptions when leaving room or component unmounts
    return () => {
      cleanupSubscriptions();
    };
  }, [currentRoom, user]);

  const setupRealtimeSubscriptions = () => {
    if (!currentRoom || !user) return;

    // Clean up existing subscriptions first
    cleanupSubscriptions();

    console.log('Setting up real-time subscriptions for room:', currentRoom.id);

    // Subscribe to new messages
    messageSubscriptionRef.current = supabase
      .channel(`room_messages:${currentRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${currentRoom.id}`
        },
        async (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as RoomMessage;
          
          // Fetch user profile for the message
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', newMessage.user_id)
            .single();

          const messageWithProfile = {
            ...newMessage,
            profiles: profile
          };

          setMessages(prev => {
            // Check if message already exists to avoid duplicates
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) return prev;
            return [...prev, messageWithProfile];
          });
        }
      )
      .subscribe((status) => {
        console.log('Message subscription status:', status);
      });

    // Subscribe to shared content
    contentSubscriptionRef.current = supabase
      .channel(`room_shared_content:${currentRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_shared_content',
          filter: `room_id=eq.${currentRoom.id}`
        },
        async (payload) => {
          console.log('New shared content received:', payload);
          const newContent = payload.new as SharedContent;
          
          // Fetch user profile for the shared content
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', newContent.user_id)
            .single();

          const contentWithProfile = {
            ...newContent,
            profiles: profile
          };

          setSharedContent(prev => {
            // Check if content already exists to avoid duplicates
            const exists = prev.some(content => content.id === newContent.id);
            if (exists) return prev;
            return [...prev, contentWithProfile];
          });
        }
      )
      .subscribe((status) => {
        console.log('Content subscription status:', status);
      });

    // Subscribe to participant changes
    participantSubscriptionRef.current = supabase
      .channel(`room_participants:${currentRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${currentRoom.id}`
        },
        () => {
          console.log('Participant change detected, reloading participants');
          loadParticipants();
        }
      )
      .subscribe((status) => {
        console.log('Participant subscription status:', status);
      });
  };

  const cleanupSubscriptions = () => {
    if (messageSubscriptionRef.current) {
      console.log('Cleaning up message subscription');
      supabase.removeChannel(messageSubscriptionRef.current);
      messageSubscriptionRef.current = null;
    }
    if (contentSubscriptionRef.current) {
      console.log('Cleaning up content subscription');
      supabase.removeChannel(contentSubscriptionRef.current);
      contentSubscriptionRef.current = null;
    }
    if (participantSubscriptionRef.current) {
      console.log('Cleaning up participant subscription');
      supabase.removeChannel(participantSubscriptionRef.current);
      participantSubscriptionRef.current = null;
    }
  };

  const loadRooms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('study_rooms')
        .select('*')
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

  const loadRoomData = async () => {
    if (!currentRoom) return;

    try {
      await Promise.all([
        loadParticipants(),
        loadMessages(),
        loadSharedContent()
      ]);
    } catch (error) {
      console.error('Error loading room data:', error);
    }
  };

  const loadParticipants = async () => {
    if (!currentRoom) return;

    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('room_id', currentRoom.id)
        .eq('is_active', true);

      if (error) throw error;
      setParticipants(data || []);
    } catch (error: any) {
      console.error('Error loading participants:', error);
    }
  };

  const loadMessages = async () => {
    if (!currentRoom) return;

    try {
      const { data, error } = await supabase
        .from('room_messages')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('room_id', currentRoom.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error loading messages:', error);
    }
  };

  const loadSharedContent = async () => {
    if (!currentRoom) return;

    try {
      const { data, error } = await supabase
        .from('room_shared_content')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('room_id', currentRoom.id)
        .order('shared_at', { ascending: false });

      if (error) throw error;
      setSharedContent(data || []);
    } catch (error: any) {
      console.error('Error loading shared content:', error);
    }
  };

  const createRoom = async (roomData: any) => {
    if (!user) return;

    try {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data: room, error: roomError } = await supabase
        .from('study_rooms')
        .insert({
          ...roomData,
          created_by: user.id,
          room_code: roomCode
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as participant with host role
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          role: 'host'
        });

      if (participantError) throw participantError;

      toast.success('Study room created successfully!');
      setShowCreateRoom(false);
      await loadRooms();
      
      // Join the created room
      setCurrentRoom(room);
      setCurrentView('room');
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast.error('Failed to create study room');
    }
  };

  const joinRoom = async (roomId?: string, code?: string) => {
    if (!user) return;

    try {
      let room: StudyRoom;

      if (roomId) {
        // Join by room ID (from room list)
        const { data, error } = await supabase
          .from('study_rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (error) throw error;
        room = data;
      } else if (code) {
        // Join by room code
        const { data, error } = await supabase
          .from('study_rooms')
          .select('*')
          .eq('room_code', code.toUpperCase())
          .eq('status', 'active')
          .single();

        if (error) throw error;
        room = data;
      } else {
        throw new Error('No room ID or code provided');
      }

      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      if (existingParticipant) {
        // Update to active if inactive
        if (!existingParticipant.is_active) {
          const { error: updateError } = await supabase
            .from('room_participants')
            .update({ is_active: true })
            .eq('id', existingParticipant.id);

          if (updateError) throw updateError;
        }
      } else {
        // Add as new participant
        const { error: participantError } = await supabase
          .from('room_participants')
          .insert({
            room_id: room.id,
            user_id: user.id,
            role: 'participant'
          });

        if (participantError) throw participantError;
      }

      setCurrentRoom(room);
      setCurrentView('room');
      setShowJoinRoom(false);
      setJoinCode('');
      toast.success(`Joined ${room.name}!`);
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    }
  };

  const leaveRoom = async () => {
    if (!currentRoom || !user) return;

    try {
      const { error } = await supabase
        .from('room_participants')
        .update({ is_active: false })
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Clean up subscriptions
      cleanupSubscriptions();
      
      setCurrentRoom(null);
      setCurrentView('rooms');
      setMessages([]);
      setParticipants([]);
      setSharedContent([]);
      toast.success('Left the room');
    } catch (error: any) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  const sendMessage = async () => {
    if (!currentRoom || !user || !newMessage.trim()) return;

    try {
      const messageData = {
        room_id: currentRoom.id,
        user_id: user.id,
        message: newMessage.trim(),
        message_type: 'text'
      };

      console.log('Sending message:', messageData);

      const { data, error } = await supabase
        .from('room_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      console.log('Message sent successfully:', data);
      setNewMessage('');
      
      // The real-time subscription will handle adding the message to the UI
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const shareResource = async (type: 'quiz' | 'material', resourceData: any) => {
    if (!currentRoom || !user) return;

    try {
      const contentData = {
        room_id: currentRoom.id,
        user_id: user.id,
        content_type: type,
        content_id: resourceData.id || null
      };

      console.log('Sharing resource:', contentData);

      const { data, error } = await supabase
        .from('room_shared_content')
        .insert(contentData)
        .select()
        .single();

      if (error) {
        console.error('Error sharing resource:', error);
        throw error;
      }

      console.log('Resource shared successfully:', data);

      // Send a system message about the shared resource
      const systemMessage = {
        room_id: currentRoom.id,
        user_id: user.id,
        message: `Shared a ${type}: ${resourceData.title}`,
        message_type: 'system'
      };

      await supabase
        .from('room_messages')
        .insert(systemMessage);

      toast.success(`${type === 'quiz' ? 'Quiz' : 'Material'} shared successfully!`);
      
      // The real-time subscription will handle adding the content to the UI
    } catch (error: any) {
      console.error('Error sharing resource:', error);
      toast.error('Failed to share resource');
    }
  };

  const viewSharedQuiz = (content: SharedContent) => {
    // Get quiz data from localStorage or create mock data
    const quizData = JSON.parse(localStorage.getItem('shared_quiz_data') || '{}');
    
    if (quizData.id) {
      setViewingQuiz(quizData);
      setCurrentView('quiz-view');
    } else {
      // Create mock quiz data for demonstration
      const mockQuiz: Quiz = {
        id: content.content_id || 'mock-quiz',
        title: 'Shared Quiz',
        description: 'A quiz shared in the study room',
        questions: [
          {
            id: 'q1',
            type: 'multiple-choice',
            question: 'What is the capital of France?',
            options: ['London', 'Berlin', 'Paris', 'Madrid'],
            correctAnswer: 2,
            explanation: 'Paris is the capital and largest city of France.',
            difficulty: 'easy',
            topic: 'Geography'
          }
        ],
        flashcards: [
          {
            id: 'f1',
            front: 'Capital of France',
            back: 'Paris',
            topic: 'Geography'
          }
        ],
        estimatedTime: 5
      };
      
      setViewingQuiz(mockQuiz);
      setCurrentView('quiz-view');
    }
  };

  const viewSharedMaterial = (content: SharedContent) => {
    // Get material data from localStorage or create mock data
    const materialData = JSON.parse(localStorage.getItem('shared_material_data') || '{}');
    
    if (materialData.id) {
      setViewingMaterial(materialData);
      setCurrentView('material-view');
    } else {
      // Create mock material data for demonstration
      const mockMaterial = {
        id: content.content_id || 'mock-material',
        title: 'Shared Study Material',
        content: 'This is a study material shared in the room. It contains important information for learning.',
        file_type: 'text',
        created_at: new Date().toISOString()
      };
      
      setViewingMaterial(mockMaterial);
      setCurrentView('material-view');
    }
  };

  const startQuizTaking = (quiz: Quiz) => {
    setTakingQuiz(quiz);
    setCurrentView('quiz-taking');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowResults(false);
    setIsSubmitted(false);
  };

  // Quiz Taking Component
  const QuizTaking = () => {
    if (!takingQuiz) return null;

    const currentQuestion = takingQuiz.questions[currentQuestionIndex];
    const totalQuestions = takingQuiz.questions.length;
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

    const handleAnswerChange = (answer: any) => {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: answer
      }));
    };

    const nextQuestion = () => {
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
      setIsSubmitted(true);
      setShowResults(true);
    };

    const calculateScore = () => {
      let correct = 0;
      takingQuiz.questions.forEach(question => {
        const userAnswer = answers[question.id];
        if (userAnswer !== undefined && userAnswer === question.correctAnswer) {
          correct++;
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
            <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                percentage >= 80 ? 'bg-green-100' : percentage >= 60 ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <Trophy className={`w-10 h-10 ${
                  percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Quiz Complete!</h2>
              <p className="text-xl text-gray-600 mb-6">
                You scored {score} out of {totalQuestions} questions correctly
              </p>
              <div className="text-4xl font-bold text-gray-900 mb-8">
                {percentage}%
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={restartQuiz}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Retake Quiz
                </button>
                <button
                  onClick={() => setCurrentView('quiz-view')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Back to Overview
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question */}
          <div className="bg-white rounded-xl p-8 border border-gray-200 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{currentQuestion.question}</h2>
            
            {/* Answer Options */}
            {currentQuestion.type === 'multiple-choice' && (
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
                    <span>{option}</span>
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
                  <span>True</span>
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
                  <span>False</span>
                </label>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={prevQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentQuestionIndex === totalQuestions - 1 ? (
              <button
                onClick={submitQuiz}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Submit Quiz
              </button>
            ) : (
              <button
                onClick={nextQuestion}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Quiz View Component
  const QuizView = () => {
    if (!viewingQuiz) return null;

    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setCurrentView('room')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Room</span>
            </button>
          </div>

          <div className="bg-white rounded-xl p-8 border border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{viewingQuiz.title}</h1>
            <p className="text-gray-600 mb-8">{viewingQuiz.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-6 text-center">
                <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{viewingQuiz.questions.length}</div>
                <div className="text-sm text-gray-600">Questions</div>
              </div>
              <div className="bg-green-50 rounded-lg p-6 text-center">
                <Clock className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{viewingQuiz.estimatedTime}</div>
                <div className="text-sm text-gray-600">Minutes</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-6 text-center">
                <BookOpen className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{viewingQuiz.flashcards.length}</div>
                <div className="text-sm text-gray-600">Flashcards</div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => startQuizTaking(viewingQuiz)}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Take Quiz</span>
              </button>
              <button className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                <BookOpen className="w-4 h-4" />
                <span>Study Flashcards</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Material View Component
  const MaterialView = () => {
    if (!viewingMaterial) return null;

    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setCurrentView('room')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Room</span>
            </button>
          </div>

          <div className="bg-white rounded-xl p-8 border border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{viewingMaterial.title}</h1>
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {viewingMaterial.content}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Whiteboard Component
  const Whiteboard = () => {
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDrawing(true);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(x, y);
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

      if (currentTool === 'pen') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 2;
      } else {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 10;
      }

      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      setIsDrawing(false);
    };

    const clearCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-4xl h-[80vh] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Whiteboard</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentTool('pen')}
                  className={`p-2 rounded-lg ${currentTool === 'pen' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  <Palette className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentTool('eraser')}
                  className={`p-2 rounded-lg ${currentTool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  <Eraser className="w-4 h-4" />
                </button>
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => setCurrentColor(e.target.value)}
                  className="w-8 h-8 rounded border border-gray-300"
                  disabled={currentTool === 'eraser'}
                />
                <button
                  onClick={clearCanvas}
                  className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setShowWhiteboard(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden">
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

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      createRoom(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 w-full max-w-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Create Study Room</h2>
            <button
              onClick={() => setShowCreateRoom(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

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
                <option value="study">Study Session</option>
                <option value="quiz">Quiz Session</option>
                <option value="discussion">Discussion</option>
                <option value="presentation">Presentation</option>
              </select>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateRoom(false)}
                className="px-6 py-3 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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
  const JoinRoomModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Join Study Room</h2>
          <button
            onClick={() => setShowJoinRoom(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Room Code</label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter 6-character room code"
              maxLength={6}
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              onClick={() => setShowJoinRoom(false)}
              className="px-6 py-3 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => joinRoom(undefined, joinCode)}
              disabled={joinCode.length !== 6}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render different views
  if (currentView === 'quiz-view') {
    return <QuizView />;
  }

  if (currentView === 'material-view') {
    return <MaterialView />;
  }

  if (currentView === 'quiz-taking') {
    return <QuizTaking />;
  }

  if (currentView === 'room' && currentRoom) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Room Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('rooms')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{currentRoom.name}</h1>
                <p className="text-sm text-gray-500">
                  {currentRoom.subject} • {participants.length} participants • Code: {currentRoom.room_code}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowWhiteboard(true)}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                title="Open Whiteboard"
              >
                <Palette className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentRoom.room_code);
                  toast.success('Room code copied!');
                }}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                title="Copy Room Code"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button
                onClick={leaveRoom}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {message.profiles?.full_name?.charAt(0) || message.profiles?.email?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {message.profiles?.full_name || message.profiles?.email || 'Unknown User'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className={`text-gray-700 ${message.message_type === 'system' ? 'italic text-blue-600' : ''}`}>
                      {message.message}
                    </p>
                  </div>
                </div>
              ))}

              {/* Shared Content */}
              {sharedContent.map((content) => (
                <div key={content.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        {content.content_type === 'quiz' ? (
                          <Brain className="w-4 h-4 text-white" />
                        ) : (
                          <FileText className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {content.profiles?.full_name || 'Unknown User'} shared a {content.content_type}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(content.shared_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (content.content_type === 'quiz') {
                          viewSharedQuiz(content);
                        } else {
                          viewSharedMaterial(content);
                        }
                      }}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="w-full p-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-2 mt-3">
                <button
                  onClick={() => {
                    // Mock quiz data for sharing
                    const mockQuiz = {
                      id: 'shared-quiz-' + Date.now(),
                      title: 'Sample Quiz',
                      description: 'A quiz shared from the study room'
                    };
                    localStorage.setItem('shared_quiz_data', JSON.stringify(mockQuiz));
                    shareResource('quiz', mockQuiz);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm"
                >
                  <Brain className="w-4 h-4" />
                  <span>Share Quiz</span>
                </button>
                <button
                  onClick={() => {
                    // Mock material data for sharing
                    const mockMaterial = {
                      id: 'shared-material-' + Date.now(),
                      title: 'Study Notes',
                      content: 'Important study material shared in the room'
                    };
                    localStorage.setItem('shared_material_data', JSON.stringify(mockMaterial));
                    shareResource('material', mockMaterial);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span>Share Material</span>
                </button>
              </div>
            </div>
          </div>

          {/* Participants Sidebar */}
          <div className="w-64 bg-white border-l border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 mb-4">
              Participants ({participants.length})
            </h3>
            <div className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {participant.profiles?.full_name?.charAt(0) || participant.profiles?.email?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {participant.profiles?.full_name || participant.profiles?.email || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{participant.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Whiteboard */}
        {showWhiteboard && <Whiteboard />}
      </div>
    );
  }

  // Rooms List View
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Study Rooms</h1>
            <p className="text-gray-600">Join or create collaborative study sessions</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowJoinRoom(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Users className="w-4 h-4" />
              <span>Join Room</span>
            </button>
            <button
              onClick={() => setShowCreateRoom(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              <Users className="w-4 h-4" />
              <span>Create Room</span>
            </button>
          </div>
        </div>

        {/* Rooms Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading study rooms...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Study Rooms Available</h3>
            <p className="text-gray-600 mb-6">Create the first study room to get started!</p>
            <button
              onClick={() => setShowCreateRoom(true)}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              Create Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-2">{room.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">{room.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="capitalize">{room.subject}</span>
                      <span className="capitalize">{room.difficulty}</span>
                      <span className="capitalize">{room.session_type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Code: <span className="font-mono font-medium">{room.room_code}</span>
                  </div>
                  <button
                    onClick={() => joinRoom(room.id)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modals */}
        {showCreateRoom && <CreateRoomModal />}
        {showJoinRoom && <JoinRoomModal />}
      </div>
    </div>
  );
};

export default StudyRoom;