import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  Share2, 
  Settings, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Send,
  Smile,
  Paperclip,
  X,
  Copy,
  ExternalLink,
  Crown,
  UserPlus,
  LogOut,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Clock,
  MapPin,
  Tag,
  Hash,
  Palette,
  Eraser,
  Square,
  Circle,
  Triangle,
  Type,
  Minus,
  RotateCcw,
  Download,
  Upload,
  Brain,
  FileText,
  BookOpen,
  Target,
  Zap,
  AlertCircle,
  CheckCircle,
  Loader2,
  Play
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

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
    avatar_url?: string;
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
    avatar_url?: string;
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

interface StudyRoomProps {
  onNavigate?: (page: string) => void;
}

const StudyRoom: React.FC<StudyRoomProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'browse' | 'room'>('browse');
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [sharedContent, setSharedContent] = useState<SharedContent[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'shapes'>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentShape, setCurrentShape] = useState<'rectangle' | 'circle' | 'triangle' | 'line'>('rectangle');
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [userQuizzes, setUserQuizzes] = useState<Quiz[]>([]);
  const [userMaterials, setUserMaterials] = useState<StudyMaterial[]>([]);
  const [selectedResource, setSelectedResource] = useState<string>('');
  const [sharingResource, setSharingResource] = useState(false);

  // Refs for chat scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Canvas ref for whiteboard
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form state for creating rooms
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    subject: '',
    difficulty: 'beginner',
    max_participants: 10,
    is_public: true,
    tags: [] as string[]
  });

  const subjects = [
    'Mathematics', 'Science', 'History', 'Literature', 'Computer Science',
    'Physics', 'Chemistry', 'Biology', 'Economics', 'Psychology',
    'Philosophy', 'Art', 'Music', 'Languages', 'Engineering'
  ];

  useEffect(() => {
    if (user) {
      loadRooms();
      loadUserResources();
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentRoom) {
      loadRoomData();
      // Poll for updates every 3 seconds
      interval = setInterval(() => {
        loadRoomData();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentRoom]);

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

      // Load user's study materials
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
    if (!currentRoom) return;

    try {
      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('room_id', currentRoom.id)
        .eq('is_active', true);

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('room_messages')
        .select(`
          *,
          profiles (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('room_id', currentRoom.id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

      // Load shared content
      const { data: sharedData, error: sharedError } = await supabase
        .from('room_shared_content')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq('room_id', currentRoom.id)
        .order('shared_at', { ascending: false });

      if (sharedError) throw sharedError;
      setSharedContent(sharedData || []);
    } catch (error: any) {
      console.error('Error loading room data:', error);
    }
  };

  const createRoom = async () => {
    if (!user) return;

    try {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data, error } = await supabase
        .from('study_rooms')
        .insert({
          ...newRoom,
          created_by: user.id,
          room_code: roomCode,
          session_type: 'study' // Default session type
        })
        .select()
        .single();

      if (error) throw error;

      // Join the room as host
      await joinRoom(data.id, 'host');
      
      setShowCreateModal(false);
      setNewRoom({
        name: '',
        description: '',
        subject: '',
        difficulty: 'beginner',
        max_participants: 10,
        is_public: true,
        tags: []
      });
      
      toast.success('Study room created successfully!');
      loadRooms();
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast.error('Failed to create study room');
    }
  };

  const joinRoom = async (roomId: string, role: string = 'participant') => {
    if (!user) return;

    try {
      // Check if user is already in the room
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      if (existingParticipant) {
        // User is already in the room, just activate them
        const { error: updateError } = await supabase
          .from('room_participants')
          .update({ is_active: true, role })
          .eq('room_id', roomId)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Add user to room
        const { error } = await supabase
          .from('room_participants')
          .insert({
            room_id: roomId,
            user_id: user.id,
            role
          });

        if (error) throw error;
      }

      // Get room details and switch to room view
      const { data: roomData, error: roomError } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;

      setCurrentRoom(roomData);
      setCurrentView('room');
      toast.success('Joined study room successfully!');
    } catch (error: any) {
      console.error('Error joining room:', error);
      if (error.message?.includes('duplicate key value')) {
        // User is already in the room, just switch to room view
        const { data: roomData } = await supabase
          .from('study_rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomData) {
          setCurrentRoom(roomData);
          setCurrentView('room');
          toast.success('Welcome back to the study room!');
        }
      } else {
        toast.error('Failed to join study room');
      }
    }
  };

  const joinRoomByCode = async () => {
    if (!joinCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }

    try {
      const { data: roomData, error } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('room_code', joinCode.toUpperCase())
        .eq('status', 'active')
        .single();

      if (error || !roomData) {
        toast.error('Room not found or inactive');
        return;
      }

      await joinRoom(roomData.id);
      setShowJoinModal(false);
      setJoinCode('');
    } catch (error: any) {
      console.error('Error joining room by code:', error);
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

      setCurrentRoom(null);
      setCurrentView('browse');
      setParticipants([]);
      setMessages([]);
      setSharedContent([]);
      toast.success('Left study room');
    } catch (error: any) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentRoom || !user) return;

    try {
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
      // Messages will be updated by the polling interval
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const shareQuiz = async () => {
    if (!selectedResource || !currentRoom || !user) return;

    try {
      setSharingResource(true);

      // Find the selected quiz
      const quiz = userQuizzes.find(q => q.id === selectedResource);
      if (!quiz) {
        toast.error('Quiz not found');
        return;
      }

      // Add to shared content
      const { error: shareError } = await supabase
        .from('room_shared_content')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          content_type: 'quiz',
          content_id: selectedResource
        });

      if (shareError) throw shareError;

      // Send system message
      const { error: messageError } = await supabase
        .from('room_messages')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          message: `📝 Shared quiz: "${quiz.title}" - Click to access`,
          message_type: 'quiz_share'
        });

      if (messageError) throw messageError;

      setShowShareModal(false);
      setSelectedResource('');
      toast.success('Quiz shared successfully!');
    } catch (error: any) {
      console.error('Error sharing quiz:', error);
      toast.error('Failed to share quiz');
    } finally {
      setSharingResource(false);
    }
  };

  const shareMaterial = async () => {
    if (!selectedResource || !currentRoom || !user) return;

    try {
      setSharingResource(true);

      // Find the selected material
      const material = userMaterials.find(m => m.id === selectedResource);
      if (!material) {
        toast.error('Material not found');
        return;
      }

      // Add to shared content
      const { error: shareError } = await supabase
        .from('room_shared_content')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          content_type: 'study_material',
          content_id: selectedResource
        });

      if (shareError) throw shareError;

      // Send system message
      const { error: messageError } = await supabase
        .from('room_messages')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          message: `📚 Shared material: "${material.title}" - Click to access`,
          message_type: 'system'
        });

      if (messageError) throw messageError;

      setShowShareModal(false);
      setSelectedResource('');
      toast.success('Material shared successfully!');
    } catch (error: any) {
      console.error('Error sharing material:', error);
      toast.error('Failed to share material');
    } finally {
      setSharingResource(false);
    }
  };

  const handleShare = async () => {
    if (!selectedResource) {
      toast.error('Please select a resource to share');
      return;
    }

    // Check if it's a quiz or material
    const isQuiz = userQuizzes.some(q => q.id === selectedResource);
    
    if (isQuiz) {
      await shareQuiz();
    } else {
      await shareMaterial();
    }
  };

  const handleResourceClick = async (contentType: string, contentId: string) => {
    if (!onNavigate) {
      toast.error('Navigation not available');
      return;
    }

    try {
      if (contentType === 'quiz') {
        // Get quiz data and navigate to quiz generator
        const { data: quizData, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', contentId)
          .single();

        if (error || !quizData) {
          toast.error('Quiz not found or access denied');
          return;
        }

        // Store quiz data for navigation
        localStorage.setItem('shared_quiz_data', JSON.stringify(quizData));
        onNavigate('quiz-generator');
        toast.success(`Opening shared quiz: "${quizData.title}"`);
      } else if (contentType === 'study_material') {
        // Navigate to materials section
        onNavigate('materials');
        toast.success('Opening Materials section');
      }
    } catch (error: any) {
      console.error('Error accessing shared resource:', error);
      toast.error('Failed to access shared resource');
    }
  };

  // Whiteboard functions
  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === 'eraser') return; // Eraser will be handled differently
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
    if (!isDrawing && currentTool !== 'eraser') return;
    
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
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Filter rooms based on search and filters
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || room.subject === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'all' || room.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResourceTitle = (contentType: string, contentId: string) => {
    if (contentType === 'quiz') {
      const quiz = userQuizzes.find(q => q.id === contentId);
      return quiz?.title || 'Unknown Quiz';
    } else if (contentType === 'study_material') {
      const material = userMaterials.find(m => m.id === contentId);
      return material?.title || 'Unknown Material';
    }
    return 'Unknown Resource';
  };

  if (currentView === 'room' && currentRoom) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
        {/* Room Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('browse')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{currentRoom.name}</h1>
                <p className="text-sm text-gray-600">
                  {currentRoom.subject} • {participants.length}/{currentRoom.max_participants} participants
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">Code: {currentRoom.room_code}</span>
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Resource</span>
              </button>
              <button
                onClick={() => setShowWhiteboard(!showWhiteboard)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <Palette className="w-4 h-4" />
                <span>{showWhiteboard ? 'Hide' : 'Show'} Whiteboard</span>
              </button>
              <button
                onClick={leaveRoom}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Left Side - Whiteboard */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Whiteboard */}
            {showWhiteboard && (
              <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <h3 className="font-medium text-gray-900">Collaborative Whiteboard</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentTool('pen')}
                        className={`p-2 rounded-lg transition-colors ${
                          currentTool === 'pen' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentTool('eraser')}
                        className={`p-2 rounded-lg transition-colors ${
                          currentTool === 'eraser' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Eraser className="w-4 h-4" />
                      </button>
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => setCurrentColor(e.target.value)}
                        className="w-8 h-8 rounded border border-gray-300"
                      />
                      <button
                        onClick={clearWhiteboard}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={400}
                  className="border border-gray-300 rounded-lg bg-white cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
            )}

            {/* Main Content Area - Placeholder when whiteboard is hidden */}
            {!showWhiteboard && (
              <div className="flex-1 flex items-center justify-center bg-white">
                <div className="text-center">
                  <Palette className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Collaborative Whiteboard</h3>
                  <p className="text-gray-600 mb-6">
                    Click "Show Whiteboard" to start drawing and collaborating with other participants
                  </p>
                  <button
                    onClick={() => setShowWhiteboard(true)}
                    className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors mx-auto"
                  >
                    <Palette className="w-4 h-4" />
                    <span>Show Whiteboard</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Chat and Participants */}
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col min-h-0">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <h3 className="font-medium text-gray-900">Chat</h3>
              </div>
              
              {/* Messages Container with Fixed Height and Scroll */}
              <div 
                ref={chatContainerRef}
                className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
              >
                {messages.map((message) => (
                  <div key={message.id} className="flex space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-gray-600">
                        {message.profiles?.full_name?.charAt(0) || message.profiles?.email?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {message.profiles?.full_name || message.profiles?.email || 'Unknown User'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${
                        message.message_type === 'system' || message.message_type === 'quiz_share'
                          ? 'text-blue-600 font-medium' 
                          : 'text-gray-700'
                      }`}>
                        {message.message}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Shared Resources Section */}
                {sharedContent.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Shared Resources</h4>
                    <div className="space-y-2">
                      {sharedContent.map((content) => (
                        <div key={content.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {content.content_type === 'quiz' ? (
                                <Brain className="w-4 h-4 text-blue-600" />
                              ) : (
                                <FileText className="w-4 h-4 text-blue-600" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-blue-900">
                                  {getResourceTitle(content.content_type, content.content_id)}
                                </p>
                                <p className="text-xs text-blue-700">
                                  Shared by {content.profiles?.full_name || content.profiles?.email || 'Unknown'}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleResourceClick(content.content_type, content.content_id)}
                              className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Open</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input - Fixed at Bottom */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Participants Section */}
            <div className="border-t border-gray-200 flex-shrink-0">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Participants ({participants.length})</h3>
              </div>
              <div className="p-4 space-y-3 max-h-48 overflow-y-auto">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {participant.profiles?.full_name?.charAt(0) || participant.profiles?.email?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {participant.profiles?.full_name || participant.profiles?.email || 'Unknown User'}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{participant.role}</p>
                    </div>
                    {participant.role === 'host' && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Share Resource Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Resource</h2>
                <p className="text-gray-600">Share your quizzes or study materials with the room</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Resource to Share
                  </label>
                  <select
                    value={selectedResource}
                    onChange={(e) => setSelectedResource(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose a resource...</option>
                    {userQuizzes.length > 0 && (
                      <optgroup label="Your Quizzes">
                        {userQuizzes.map((quiz) => (
                          <option key={quiz.id} value={quiz.id}>
                            📝 {quiz.title}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {userMaterials.length > 0 && (
                      <optgroup label="Your Study Materials">
                        {userMaterials.map((material) => (
                          <option key={material.id} value={material.id}>
                            📚 {material.title}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  {userQuizzes.length === 0 && userMaterials.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      You don't have any quizzes or materials to share. Create some first!
                    </p>
                  )}
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={!selectedResource || sharingResource || (userQuizzes.length === 0 && userMaterials.length === 0)}
                    className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {sharingResource ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sharing...</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>Share Resource</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Study Rooms</h1>
            <p className="text-gray-600">Join collaborative study sessions with other learners</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              <Hash className="w-4 h-4" />
              <span>Join with Code</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Create Room</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search study rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="p-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading study rooms...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No study rooms found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedSubject !== 'all' || selectedDifficulty !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Be the first to create a study room!'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Create Study Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-2">{room.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{room.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(room.difficulty)}`}>
                    {room.difficulty}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <BookOpen className="w-4 h-4 mr-2" />
                    <span>{room.subject}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    <span>0/{room.max_participants} participants</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Hash className="w-4 h-4 mr-2" />
                    <span>Code: {room.room_code}</span>
                  </div>
                </div>

                <button
                  onClick={() => joinRoom(room.id)}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Join Room
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Study Room</h2>
              <p className="text-gray-600">Set up a collaborative learning space</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter room name..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newRoom.description}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none"
                  placeholder="Describe what you'll be studying..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <select
                  value={newRoom.subject}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a subject...</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={newRoom.difficulty}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Participants
                </label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={newRoom.max_participants}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newRoom.is_public}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-700">Make room public</span>
                </label>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={createRoom}
                  disabled={!newRoom.name || !newRoom.subject}
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
            <button
              onClick={() => setShowJoinModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Hash className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Join with Code</h2>
              <p className="text-gray-600">Enter the room code to join a study session</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
                  placeholder="ABCD12"
                  maxLength={6}
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={joinRoomByCode}
                  disabled={!joinCode.trim()}
                  className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyRoom;