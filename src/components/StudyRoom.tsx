import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  Share2, 
  Settings, 
  Send,
  Paperclip,
  MoreVertical,
  UserPlus,
  Copy,
  ExternalLink,
  Palette,
  Type,
  Square,
  Circle,
  Triangle,
  Minus,
  ArrowRight,
  Trash2,
  Download,
  Upload,
  Brain,
  FileText,
  ChevronDown,
  X,
  Edit3,
  Eraser,
  Eye,
  Play
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
  content_id: string;
  shared_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: any[];
  flashcards: any[];
  created_at: string;
}

interface StudyMaterial {
  id: string;
  title: string;
  content: string;
  file_type: string;
  created_at: string;
}

const StudyRoom: React.FC<StudyRoomProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'rooms' | 'room' | 'quiz-view' | 'material-view'>('rooms');
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showShareResource, setShowShareResource] = useState(false);
  const [shareResourceType, setShareResourceType] = useState<'quiz' | 'material'>('quiz');
  const [userQuizzes, setUserQuizzes] = useState<Quiz[]>([]);
  const [userMaterials, setUserMaterials] = useState<StudyMaterial[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [viewingQuiz, setViewingQuiz] = useState<Quiz | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<StudyMaterial | null>(null);
  
  // Whiteboard state - with pencil and eraser
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentTool, setCurrentTool] = useState<'pencil' | 'eraser'>('pencil');
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Form state for creating room
  const [roomForm, setRoomForm] = useState({
    name: '',
    description: '',
    subject: '',
    difficulty: 'beginner',
    session_type: 'study',
    max_participants: 10,
    is_public: true
  });

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };
    
    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  // Load rooms on component mount
  useEffect(() => {
    if (user) {
      loadRooms();
      loadUserResources();
    }
  }, [user]);

  // Load messages and participants when room is selected
  useEffect(() => {
    if (selectedRoom && user) {
      loadRoomData();
      
      // Set up real-time subscriptions with better error handling
      const messagesChannel = supabase
        .channel(`room-messages-${selectedRoom.id}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'room_messages',
            filter: `room_id=eq.${selectedRoom.id}`
          }, 
          (payload) => {
            console.log('New message received:', payload);
            // Immediately add the new message to state
            loadMessages(); // Reload all messages to get profile data
          }
        )
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'room_messages',
            filter: `room_id=eq.${selectedRoom.id}`
          }, 
          () => {
            loadMessages();
          }
        )
        .subscribe((status) => {
          console.log('Messages subscription status:', status);
        });

      const participantsChannel = supabase
        .channel(`room-participants-${selectedRoom.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'room_participants',
            filter: `room_id=eq.${selectedRoom.id}`
          }, 
          (payload) => {
            console.log('Participants change:', payload);
            loadParticipants();
          }
        )
        .subscribe((status) => {
          console.log('Participants subscription status:', status);
        });

      return () => {
        console.log('Cleaning up subscriptions');
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(participantsChannel);
      };
    }
  }, [selectedRoom, user]);

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

  const loadUserResources = async () => {
    if (!user) return;

    try {
      // Load user's quizzes
      const { data: quizzes, error: quizzesError } = await supabase
        .from('quizzes')
        .select('id, title, description, questions, flashcards, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (quizzesError) throw quizzesError;
      setUserQuizzes(quizzes || []);

      // Load user's materials
      const { data: materials, error: materialsError } = await supabase
        .from('study_materials')
        .select('id, title, content, file_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (materialsError) throw materialsError;
      setUserMaterials(materials || []);
    } catch (error: any) {
      console.error('Error loading user resources:', error);
    }
  };

  const loadRoomData = async () => {
    if (!selectedRoom) return;
    
    await Promise.all([
      loadParticipants(),
      loadMessages()
    ]);
  };

  const loadParticipants = async () => {
    if (!selectedRoom) return;

    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq('room_id', selectedRoom.id)
        .eq('is_active', true);

      if (error) throw error;
      setParticipants(data || []);
    } catch (error: any) {
      console.error('Error loading participants:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedRoom) return;

    try {
      const { data, error } = await supabase
        .from('room_messages')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq('room_id', selectedRoom.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      console.log('Loaded messages:', data?.length);
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error loading messages:', error);
    }
  };

  const createRoom = async () => {
    if (!user) return;

    try {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data, error } = await supabase
        .from('study_rooms')
        .insert({
          ...roomForm,
          created_by: user.id,
          room_code: roomCode
        })
        .select()
        .single();

      if (error) throw error;

      // Join the room as host
      await supabase
        .from('room_participants')
        .insert({
          room_id: data.id,
          user_id: user.id,
          role: 'host'
        });

      toast.success('Study room created successfully!');
      setShowCreateRoom(false);
      setRoomForm({
        name: '',
        description: '',
        subject: '',
        difficulty: 'beginner',
        session_type: 'study',
        max_participants: 10,
        is_public: true
      });
      
      loadRooms();
      setSelectedRoom(data);
      setCurrentView('room');
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast.error('Failed to create study room');
    }
  };

  const joinRoom = async (room: StudyRoom) => {
    if (!user) return;

    try {
      // Check if already a participant
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      if (!existingParticipant) {
        const { error } = await supabase
          .from('room_participants')
          .insert({
            room_id: room.id,
            user_id: user.id,
            role: 'participant'
          });

        if (error) throw error;
      }

      setSelectedRoom(room);
      setCurrentView('room');
      toast.success(`Joined ${room.name}!`);
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || !user) return;

    try {
      console.log('Sending message:', newMessage);
      const { error } = await supabase
        .from('room_messages')
        .insert({
          room_id: selectedRoom.id,
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

  const shareResource = async () => {
    if (!selectedResourceId || !selectedRoom || !user) return;

    try {
      // Get the resource details
      const resource = shareResourceType === 'quiz' 
        ? userQuizzes.find(q => q.id === selectedResourceId)
        : userMaterials.find(m => m.id === selectedResourceId);

      if (!resource) {
        toast.error('Resource not found');
        return;
      }

      // Insert shared content record
      const { error: contentError } = await supabase
        .from('room_shared_content')
        .insert({
          room_id: selectedRoom.id,
          user_id: user.id,
          content_type: shareResourceType,
          content_id: selectedResourceId
        });

      if (contentError) throw contentError;

      // Send a message with the shared resource link
      const { error: messageError } = await supabase
        .from('room_messages')
        .insert({
          room_id: selectedRoom.id,
          user_id: user.id,
          message: `${resource.title}|${selectedResourceId}`, // Store title and ID for link generation
          message_type: shareResourceType === 'quiz' ? 'quiz_share' : 'file'
        });

      if (messageError) throw messageError;

      toast.success(`${shareResourceType === 'quiz' ? 'Quiz' : 'Material'} shared successfully!`);
      setShowShareResource(false);
      setSelectedResourceId('');
    } catch (error: any) {
      console.error('Error sharing resource:', error);
      toast.error('Failed to share resource');
    }
  };

  const handleResourceClick = async (messageType: string, message: string) => {
    // Parse the message to get title and ID
    const [resourceTitle, resourceId] = message.split('|');
    
    if (messageType === 'quiz_share') {
      // Find the quiz by ID and show it in the study room
      const quiz = userQuizzes.find(q => q.id === resourceId);
      if (quiz) {
        setViewingQuiz(quiz);
        setCurrentView('quiz-view');
        toast.success(`Opening shared quiz: ${resourceTitle}`);
      } else {
        // Try to fetch the quiz from database if not in user's list
        try {
          const { data, error } = await supabase
            .from('quizzes')
            .select('*')
            .eq('id', resourceId)
            .single();
          
          if (error) throw error;
          if (data) {
            setViewingQuiz(data);
            setCurrentView('quiz-view');
            toast.success(`Opening shared quiz: ${resourceTitle}`);
          }
        } catch (error) {
          toast.error('Quiz not found or access denied');
        }
      }
    } else if (messageType === 'file') {
      // Find the material by ID and show it in the study room
      const material = userMaterials.find(m => m.id === resourceId);
      if (material) {
        setViewingMaterial(material);
        setCurrentView('material-view');
        toast.success(`Opening shared material: ${resourceTitle}`);
      } else {
        // Try to fetch the material from database if not in user's list
        try {
          const { data, error } = await supabase
            .from('study_materials')
            .select('*')
            .eq('id', resourceId)
            .single();
          
          if (error) throw error;
          if (data) {
            setViewingMaterial(data);
            setCurrentView('material-view');
            toast.success(`Opening shared material: ${resourceTitle}`);
          }
        } catch (error) {
          toast.error('Material not found or access denied');
        }
      }
    }
  };

  const leaveRoom = () => {
    setSelectedRoom(null);
    setCurrentView('rooms');
    setMessages([]);
    setParticipants([]);
    setViewingQuiz(null);
    setViewingMaterial(null);
  };

  const copyRoomCode = () => {
    if (selectedRoom) {
      navigator.clipboard.writeText(selectedRoom.room_code);
      toast.success('Room code copied to clipboard!');
    }
  };

  // Whiteboard functions with pencil and eraser
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
    
    ctx.lineTo(x, y);
    
    if (currentTool === 'pencil') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 2;
    } else if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 10;
    }
    
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

  // Quiz View Component
  const QuizView = ({ quiz }: { quiz: Quiz }) => (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setCurrentView('room')}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>Back to Room</span>
          </button>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                if (onNavigate) {
                  localStorage.setItem('shared_quiz_data', JSON.stringify(quiz));
                  onNavigate('quiz-generator');
                }
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Take Quiz</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{quiz.title}</h1>
          <p className="text-gray-600 mb-8">{quiz.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Questions</h3>
              <p className="text-2xl font-bold text-blue-600">{quiz.questions.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2">Flashcards</h3>
              <p className="text-2xl font-bold text-green-600">{quiz.flashcards.length}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-medium text-purple-900 mb-2">Created</h3>
              <p className="text-sm font-medium text-purple-600">
                {new Date(quiz.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Questions Preview</h2>
            {quiz.questions.slice(0, 3).map((question, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">
                  Question {index + 1}: {question.question}
                </h3>
                {question.options && (
                  <ul className="space-y-1 text-sm text-gray-600">
                    {question.options.map((option: string, optIndex: number) => (
                      <li key={optIndex} className="flex items-center space-x-2">
                        <span className="w-4 h-4 border border-gray-300 rounded-full flex-shrink-0"></span>
                        <span>{option}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {quiz.questions.length > 3 && (
              <p className="text-gray-500 text-center">
                And {quiz.questions.length - 3} more questions...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Material View Component
  const MaterialView = ({ material }: { material: StudyMaterial }) => (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setCurrentView('room')}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>Back to Room</span>
          </button>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                if (onNavigate) {
                  localStorage.setItem('shared_material_data', JSON.stringify(material));
                  onNavigate('materials');
                }
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>View in Materials</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              material.file_type === 'image' ? 'bg-blue-100' :
              material.file_type === 'pdf' ? 'bg-red-100' : 'bg-green-100'
            }`}>
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{material.title}</h1>
              <p className="text-gray-600 capitalize">{material.file_type} • {new Date(material.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Content</h2>
            <div className="prose prose-gray max-w-none">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {material.content || 'No content available'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading study rooms...</p>
        </div>
      </div>
    );
  }

  // Show quiz view
  if (currentView === 'quiz-view' && viewingQuiz) {
    return <QuizView quiz={viewingQuiz} />;
  }

  // Show material view
  if (currentView === 'material-view' && viewingMaterial) {
    return <MaterialView material={viewingMaterial} />;
  }

  if (currentView === 'rooms') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Study Rooms</h1>
              <p className="text-gray-600">Join collaborative study sessions with other students</p>
            </div>
            <button
              onClick={() => setShowCreateRoom(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Room</span>
            </button>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="p-8">
          {rooms.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No active study rooms</h3>
              <p className="text-gray-600 mb-6">Be the first to create a study room and start collaborating!</p>
              <button
                onClick={() => setShowCreateRoom(true)}
                className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors"
              >
                Create Your First Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-2">{room.name}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{room.description}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      room.difficulty === 'beginner' ? 'bg-green-100 text-green-600' :
                      room.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {room.difficulty}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Subject:</span>
                      <span className="font-medium text-gray-900">{room.subject}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Type:</span>
                      <span className="font-medium text-gray-900 capitalize">{room.session_type}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Room Code:</span>
                      <span className="font-mono text-purple-600 font-medium">{room.room_code}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => joinRoom(room)}
                    className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors font-medium"
                  >
                    Join Room
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Room Modal */}
        {showCreateRoom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Study Room</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room Name</label>
                  <input
                    type="text"
                    value={roomForm.name}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter room name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={roomForm.description}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent h-20 resize-none"
                    placeholder="Describe what you'll be studying"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    value={roomForm.subject}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Mathematics, Biology, History"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                    <select
                      value={roomForm.difficulty}
                      onChange={(e) => setRoomForm(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Session Type</label>
                    <select
                      value={roomForm.session_type}
                      onChange={(e) => setRoomForm(prev => ({ ...prev, session_type: e.target.value }))}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="study">Study Session</option>
                      <option value="quiz">Quiz Practice</option>
                      <option value="discussion">Discussion</option>
                      <option value="presentation">Presentation</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Participants</label>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    value={roomForm.max_participants}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={roomForm.is_public}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="is_public" className="ml-3 text-sm text-gray-700">
                    Make room public (anyone can join)
                  </label>
                </div>
              </div>

              <div className="flex space-x-4 mt-8">
                <button
                  onClick={() => setShowCreateRoom(false)}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createRoom}
                  disabled={!roomForm.name || !roomForm.subject}
                  className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Room
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Whiteboard */}
      <div className="flex-1 bg-white border-r border-gray-200 flex flex-col">
        {/* Whiteboard Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={leaveRoom}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span>Back to Rooms</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{selectedRoom?.name}</h1>
                <p className="text-sm text-gray-500">Room Code: {selectedRoom?.room_code}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={copyRoomCode}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy room code"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowShareResource(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Resource</span>
              </button>
            </div>
          </div>
        </div>

        {/* Whiteboard Tools */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Tool Selection */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentTool('pencil')}
                  className={`p-2 rounded-lg transition-colors ${
                    currentTool === 'pencil' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Pencil"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentTool('eraser')}
                  className={`p-2 rounded-lg transition-colors ${
                    currentTool === 'eraser' 
                      ? 'bg-red-500 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Eraser"
                >
                  <Eraser className="w-4 h-4" />
                </button>
              </div>

              {/* Color Picker - Only show for pencil */}
              {currentTool === 'pencil' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => setCurrentColor(e.target.value)}
                    className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">Color</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={clearCanvas}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Whiteboard Canvas */}
        <div className="flex-1 p-4">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className={`w-full h-full border border-gray-200 rounded-lg bg-white ${
              currentTool === 'pencil' ? 'cursor-crosshair' : 'cursor-pointer'
            }`}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
      </div>

      {/* Right Side - Chat and Participants */}
      <div className="w-96 bg-white flex flex-col">
        {/* Participants */}
        <div className="border-b border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">
            Participants ({participants.length})
          </h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {participant.profiles?.full_name?.charAt(0) || participant.profiles?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {participant.profiles?.full_name || participant.profiles?.email || 'Unknown User'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{participant.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 flex flex-col">
          <div className="border-b border-gray-200 p-4">
            <h3 className="font-medium text-gray-900">Chat</h3>
          </div>
          
          {/* Messages Container - Fixed height with scroll */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ maxHeight: 'calc(100vh - 400px)' }}
          >
            {messages.map((message) => (
              <div key={message.id} className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-600 text-sm font-medium">
                    {message.profiles?.full_name?.charAt(0) || message.profiles?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {message.profiles?.full_name || message.profiles?.email || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  
                  {/* Check if message is a shared resource */}
                  {(message.message_type === 'quiz_share' || message.message_type === 'file') ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {message.message_type === 'quiz_share' ? (
                            <Brain className="w-4 h-4 text-blue-600" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-600" />
                          )}
                          <span className="text-sm font-medium text-blue-900">
                            {message.message.split('|')[0]} {/* Show only the title part */}
                          </span>
                        </div>
                        <button
                          onClick={() => handleResourceClick(message.message_type, message.message)}
                          className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700">{message.message}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Share Resource Modal */}
      {showShareResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Share Resource</h2>
              <button
                onClick={() => setShowShareResource(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Resource Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Resource Type</label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShareResourceType('quiz')}
                  className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-lg border transition-colors ${
                    shareResourceType === 'quiz' 
                      ? 'border-purple-500 bg-purple-50 text-purple-700' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Brain className="w-4 h-4" />
                  <span>Quiz</span>
                </button>
                <button
                  onClick={() => setShareResourceType('material')}
                  className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-lg border transition-colors ${
                    shareResourceType === 'material' 
                      ? 'border-purple-500 bg-purple-50 text-purple-700' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Material</span>
                </button>
              </div>
            </div>

            {/* Resource Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select {shareResourceType === 'quiz' ? 'Quiz' : 'Material'}
              </label>
              
              {shareResourceType === 'quiz' ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {userQuizzes.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No quizzes available. Create a quiz first to share it.
                    </p>
                  ) : (
                    userQuizzes.map((quiz) => (
                      <label key={quiz.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="selectedResource"
                          value={quiz.id}
                          checked={selectedResourceId === quiz.id}
                          onChange={(e) => setSelectedResourceId(e.target.value)}
                          className="mr-3 text-purple-600"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{quiz.title}</p>
                          <p className="text-sm text-gray-500">{quiz.questions.length} questions</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {userMaterials.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No materials available. Upload materials first to share them.
                    </p>
                  ) : (
                    userMaterials.map((material) => (
                      <label key={material.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="selectedResource"
                          value={material.id}
                          checked={selectedResourceId === material.id}
                          onChange={(e) => setSelectedResourceId(e.target.value)}
                          className="mr-3 text-purple-600"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{material.title}</p>
                          <p className="text-sm text-gray-500 capitalize">{material.file_type}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowShareResource(false)}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={shareResource}
                disabled={!selectedResourceId}
                className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Share {shareResourceType === 'quiz' ? 'Quiz' : 'Material'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyRoom;