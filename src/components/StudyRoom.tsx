import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  Share2, 
  Settings, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Phone, 
  Monitor, 
  Plus,
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  Crown,
  UserCheck,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Download,
  Palette,
  Eraser,
  Circle,
  Square,
  Minus,
  X,
  ChevronDown,
  ChevronUp,
  BookOpen,
  FileText,
  Brain,
  ExternalLink,
  Eye,
  ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface StudyRoomProps {
  onNavigate: (page: string) => void;
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
  room_code: string;
  status: string;
  created_at: string;
  participant_count?: number;
  creator_name?: string;
}

interface RoomParticipant {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  is_active: boolean;
  user_name?: string;
}

interface RoomMessage {
  id: string;
  user_id: string;
  message: string;
  message_type: string;
  created_at: string;
  user_name?: string;
}

interface SharedContent {
  id: string;
  content_type: string;
  content_id: string;
  shared_at: string;
  user_id: string;
  user_name?: string;
  title?: string;
  description?: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [showShareQuiz, setShowShareQuiz] = useState(false);
  const [showShareResource, setShowShareResource] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60); // 25 minutes in seconds
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'break'>('work');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'line' | 'rectangle' | 'circle'>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  // New room form state
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    subject: '',
    difficulty: 'beginner',
    max_participants: 10,
    is_public: true
  });

  const [joinRoomCode, setJoinRoomCode] = useState('');

  useEffect(() => {
    if (currentView === 'browse') {
      fetchRooms();
    }
  }, [currentView]);

  useEffect(() => {
    if (currentRoom) {
      fetchRoomData();
      const interval = setInterval(fetchRoomData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [currentRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPomodoroActive && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime(prev => prev - 1);
      }, 1000);
    } else if (pomodoroTime === 0) {
      // Timer finished
      setIsPomodoroActive(false);
      if (pomodoroMode === 'work') {
        toast.success('Work session completed! Time for a break.');
        setPomodoroMode('break');
        setPomodoroTime(5 * 60); // 5 minute break
      } else {
        toast.success('Break time over! Ready for another work session?');
        setPomodoroMode('work');
        setPomodoroTime(25 * 60); // 25 minute work session
      }
    }
    return () => clearInterval(interval);
  }, [isPomodoroActive, pomodoroTime, pomodoroMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('study_rooms')
        .select(`
          *,
          profiles!study_rooms_created_by_fkey(full_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get participant counts for each room
      const roomsWithCounts = await Promise.all(
        (data || []).map(async (room) => {
          const { count } = await supabase
            .from('room_participants')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .eq('is_active', true);

          return {
            ...room,
            participant_count: count || 0,
            creator_name: room.profiles?.full_name || 'Unknown'
          };
        })
      );

      setRooms(roomsWithCounts);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to load study rooms');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoomData = async () => {
    if (!currentRoom) return;

    try {
      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles!room_participants_user_id_fkey(full_name)
        `)
        .eq('room_id', currentRoom.id)
        .eq('is_active', true);

      if (participantsError) throw participantsError;

      setParticipants((participantsData || []).map(p => ({
        ...p,
        user_name: p.profiles?.full_name || 'Unknown'
      })));

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('room_messages')
        .select(`
          *,
          profiles!room_messages_user_id_fkey(full_name)
        `)
        .eq('room_id', currentRoom.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) throw messagesError;

      setMessages((messagesData || []).map(m => ({
        ...m,
        user_name: m.profiles?.full_name || 'Unknown'
      })));

      // Fetch shared content
      const { data: contentData, error: contentError } = await supabase
        .from('room_shared_content')
        .select(`
          *,
          profiles!room_shared_content_user_id_fkey(full_name)
        `)
        .eq('room_id', currentRoom.id)
        .order('shared_at', { ascending: false });

      if (contentError) throw contentError;

      // Enhance shared content with titles and descriptions
      const enhancedContent = (contentData || []).map(content => {
        let title = 'Shared Content';
        let description = '';

        if (content.content_type === 'quiz') {
          title = 'Quiz: Biology Fundamentals';
          description = 'Interactive quiz with 10 questions';
        } else if (content.content_type === 'study_material') {
          title = 'Study Material: Cell Structure';
          description = 'Comprehensive notes on cellular biology';
        } else if (content.content_type === 'flashcard_set') {
          title = 'Flashcards: Key Terms';
          description = '25 flashcards covering important concepts';
        }

        return {
          ...content,
          user_name: content.profiles?.full_name || 'Unknown',
          title,
          description
        };
      });

      setSharedContent(enhancedContent);

    } catch (error) {
      console.error('Error fetching room data:', error);
    }
  };

  const createRoom = async () => {
    if (!user || !newRoom.name.trim() || !newRoom.subject.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data, error } = await supabase
        .from('study_rooms')
        .insert({
          name: newRoom.name,
          description: newRoom.description,
          subject: newRoom.subject,
          difficulty: newRoom.difficulty,
          max_participants: newRoom.max_participants,
          is_public: newRoom.is_public,
          created_by: user.id,
          room_code: roomCode
        })
        .select()
        .single();

      if (error) throw error;

      // Join the room as host
      await joinRoom(data, 'host');
      
      setShowCreateRoom(false);
      setNewRoom({
        name: '',
        description: '',
        subject: '',
        difficulty: 'beginner',
        max_participants: 10,
        is_public: true
      });
      
      toast.success('Study room created successfully!');
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
    }
  };

  const joinRoomByCode = async () => {
    if (!joinRoomCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('room_code', joinRoomCode.toUpperCase())
        .eq('status', 'active')
        .single();

      if (error) throw error;

      await joinRoom(data);
      setShowJoinRoom(false);
      setJoinRoomCode('');
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Room not found or inactive');
    }
  };

  const joinRoom = async (room: StudyRoom, role: string = 'participant') => {
    if (!user) return;

    try {
      // Check if already in room
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!existingParticipant) {
        // Join the room
        const { error } = await supabase
          .from('room_participants')
          .insert({
            room_id: room.id,
            user_id: user.id,
            role: role
          });

        if (error && error.code !== '23505') { // Ignore duplicate key error
          throw error;
        }
      }

      setCurrentRoom(room);
      setCurrentView('room');
      toast.success(`Joined ${room.name}`);
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    }
  };

  const leaveRoom = async () => {
    if (!user || !currentRoom) return;

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
      toast.success('Left the room');
    } catch (error) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  const sendMessage = async () => {
    if (!user || !currentRoom || !newMessage.trim()) return;

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
      fetchRoomData(); // Refresh messages
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const shareQuiz = async (quizId: string, title: string) => {
    if (!user || !currentRoom) return;

    try {
      const { error } = await supabase
        .from('room_shared_content')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          content_type: 'quiz',
          content_id: quizId
        });

      if (error) throw error;

      toast.success(`Quiz "${title}" shared with the room!`);
      setShowShareQuiz(false);
      fetchRoomData(); // Refresh shared content
    } catch (error) {
      console.error('Error sharing quiz:', error);
      toast.error('Failed to share quiz');
    }
  };

  const shareResource = async (resourceId: string, title: string) => {
    if (!user || !currentRoom) return;

    try {
      const { error } = await supabase
        .from('room_shared_content')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          content_type: 'study_material',
          content_id: resourceId
        });

      if (error) throw error;

      toast.success(`Resource "${title}" shared with the room!`);
      setShowShareResource(false);
      fetchRoomData(); // Refresh shared content
    } catch (error) {
      console.error('Error sharing resource:', error);
      toast.error('Failed to share resource');
    }
  };

  const accessSharedContent = (content: SharedContent) => {
    if (content.content_type === 'quiz') {
      // Navigate to quiz generator with the shared quiz
      toast.success(`Opening quiz: ${content.title}`);
      onNavigate('quiz-generator');
    } else if (content.content_type === 'study_material') {
      // Navigate to materials section (when built)
      toast.success(`Opening study material: ${content.title}`);
      onNavigate('materials');
    } else if (content.content_type === 'flashcard_set') {
      // Navigate to flashcards
      toast.success(`Opening flashcard set: ${content.title}`);
      onNavigate('quiz-generator');
    } else {
      toast.info('Content type not yet supported');
    }
  };

  const togglePomodoro = () => {
    setIsPomodoroActive(!isPomodoroActive);
    if (!isPomodoroActive) {
      toast.success(`${pomodoroMode === 'work' ? 'Work' : 'Break'} session started!`);
    } else {
      toast.success('Pomodoro timer paused');
    }
  };

  const resetPomodoro = () => {
    setIsPomodoroActive(false);
    setPomodoroTime(pomodoroMode === 'work' ? 25 * 60 : 5 * 60);
    toast.success('Pomodoro timer reset');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Whiteboard functions
  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Set white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set default drawing properties
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  useEffect(() => {
    if (showWhiteboard) {
      initializeCanvas();
    }
  }, [showWhiteboard]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (currentTool === 'pen' || currentTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
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
      ctx.lineWidth = brushSize;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 2;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
      ctx.beginPath();

      if (currentTool === 'line') {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
      } else if (currentTool === 'rectangle') {
        ctx.rect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
      } else if (currentTool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      }

      ctx.stroke();
    }

    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  if (currentView === 'browse') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Study Rooms</h1>
              <p className="text-gray-600">Join collaborative study sessions with other learners</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowJoinRoom(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Join Room</span>
              </button>
              <button
                onClick={() => setShowCreateRoom(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Room</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading study rooms...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Study Rooms</h3>
              <p className="text-gray-600 mb-6">Be the first to create a study room and start collaborating!</p>
              <button
                onClick={() => setShowCreateRoom(true)}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Create First Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{room.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{room.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded">{room.subject}</span>
                        <span className="bg-green-100 text-green-600 px-2 py-1 rounded">{room.difficulty}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{room.participant_count}/{room.max_participants}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Crown className="w-4 h-4" />
                        <span>{room.creator_name}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => joinRoom(room)}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                    >
                      Join
                    </button>
                  </div>
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
                    value={newRoom.name}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter room name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newRoom.description}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Describe what you'll be studying"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    value={newRoom.subject}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Mathematics, Biology, History"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                  <select
                    value={newRoom.difficulty}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Participants</label>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    value={newRoom.max_participants}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={newRoom.is_public}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="is_public" className="ml-3 text-sm text-gray-700">
                    Make room public (visible to all users)
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
                  className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Create Room
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Room Modal */}
        {showJoinRoom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Join Study Room</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room Code</label>
                  <input
                    type="text"
                    value={joinRoomCode}
                    onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-lg font-mono"
                    placeholder="Enter 6-digit room code"
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="flex space-x-4 mt-8">
                <button
                  onClick={() => setShowJoinRoom(false)}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={joinRoomByCode}
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Room View
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Room Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('browse')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Rooms
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{currentRoom?.name}</h1>
                <p className="text-sm text-gray-600">Room Code: {currentRoom?.room_code}</p>
              </div>
            </div>
            
            {/* Media Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  isAudioEnabled ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}
                title={isAudioEnabled ? 'Mute' : 'Unmute'}
              >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  isVideoEnabled ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}
                title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => setIsScreenSharing(!isScreenSharing)}
                className={`p-2 rounded-lg transition-colors ${
                  isScreenSharing ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}
                title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
              >
                <Monitor className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowWhiteboard(!showWhiteboard)}
                className={`p-2 rounded-lg transition-colors ${
                  showWhiteboard ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                }`}
                title="Toggle whiteboard"
              >
                <Palette className="w-5 h-5" />
              </button>
              
              <button
                onClick={leaveRoom}
                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                title="Leave room"
              >
                <Phone className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Room Content */}
        <div className="flex-1 flex">
          {/* Video/Whiteboard Area */}
          <div className="flex-1 p-6">
            {showWhiteboard ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Collaborative Whiteboard</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={clearCanvas}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm"
                    >
                      Clear
                    </button>
                    <button
                      onClick={downloadCanvas}
                      className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Drawing Tools */}
                <div className="flex items-center space-x-4 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Tools:</span>
                    {[
                      { tool: 'pen', icon: '✏️', label: 'Pen' },
                      { tool: 'eraser', icon: '🧽', label: 'Eraser' },
                      { tool: 'line', icon: '📏', label: 'Line' },
                      { tool: 'rectangle', icon: '⬜', label: 'Rectangle' },
                      { tool: 'circle', icon: '⭕', label: 'Circle' }
                    ].map(({ tool, icon, label }) => (
                      <button
                        key={tool}
                        onClick={() => setCurrentTool(tool as any)}
                        className={`p-2 rounded-lg transition-colors ${
                          currentTool === tool ? 'bg-purple-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                        title={label}
                      >
                        <span className="text-lg">{icon}</span>
                      </button>
                    ))}
                  </div>

                  {currentTool !== 'eraser' && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Color:</span>
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => setCurrentColor(e.target.value)}
                        className="w-8 h-8 rounded border border-gray-300"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Size:</span>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-20"
                    />
                    <div 
                      className="rounded-full border border-gray-300"
                      style={{ 
                        width: `${Math.max(brushSize * 2, 8)}px`, 
                        height: `${Math.max(brushSize * 2, 8)}px`,
                        backgroundColor: currentTool === 'eraser' ? '#f3f4f6' : currentColor
                      }}
                    />
                  </div>
                </div>

                {/* Canvas */}
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="cursor-crosshair bg-white"
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-xl h-full flex items-center justify-center">
                <div className="text-center text-white">
                  <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Video call area</p>
                  <p className="text-sm opacity-75">Camera and screen sharing will appear here</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            {/* Participants */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Participants ({participants.length})
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {participant.user_name?.charAt(0) || 'U'}
                    </div>
                    <span className="text-sm text-gray-900">{participant.user_name}</span>
                    {participant.role === 'host' && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pomodoro Timer */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Pomodoro Timer
              </h3>
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-gray-900 mb-2">
                  {formatTime(pomodoroTime)}
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  {pomodoroMode === 'work' ? 'Work Session' : 'Break Time'}
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={togglePomodoro}
                    className={`p-2 rounded-lg transition-colors ${
                      isPomodoroActive ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                    }`}
                  >
                    {isPomodoroActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={resetPomodoro}
                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Pomodoro Technique: 25min work + 5min break cycles for enhanced focus and productivity
                </p>
              </div>
            </div>

            {/* Shared Content */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 flex items-center">
                  <Share2 className="w-4 h-4 mr-2" />
                  Shared Content
                </h3>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setShowShareQuiz(true)}
                    className="p-1 text-gray-600 hover:text-purple-600 transition-colors"
                    title="Share Quiz"
                  >
                    <Brain className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowShareResource(true)}
                    className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                    title="Share Resource"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {sharedContent.length === 0 ? (
                  <div className="text-center py-6">
                    <Share2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No content shared yet</p>
                    <p className="text-xs text-gray-400 mt-1">Share quizzes and resources to collaborate</p>
                  </div>
                ) : (
                  sharedContent.map((content) => (
                    <div key={content.id} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          content.content_type === 'quiz' ? 'bg-purple-100' :
                          content.content_type === 'study_material' ? 'bg-blue-100' :
                          'bg-green-100'
                        }`}>
                          {content.content_type === 'quiz' ? (
                            <Brain className={`w-4 h-4 ${
                              content.content_type === 'quiz' ? 'text-purple-600' : ''
                            }`} />
                          ) : content.content_type === 'study_material' ? (
                            <FileText className="w-4 h-4 text-blue-600" />
                          ) : (
                            <BookOpen className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 text-sm truncate">
                              {content.title}
                            </h4>
                            <button
                              onClick={() => accessSharedContent(content)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                              title="Open content"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 truncate">{content.description}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">by {content.user_name}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(content.shared_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          <button
                            onClick={() => accessSharedContent(content)}
                            className="mt-2 w-full flex items-center justify-center space-x-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Open</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat */}
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No messages yet</p>
                    <p className="text-xs text-gray-400">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="flex space-x-2">
                      <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                        {message.user_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">{message.user_name}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.created_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 break-words">{message.message}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Quiz Modal */}
      {showShareQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Share Quiz</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Available Quizzes</h3>
                <div className="space-y-2">
                  {[
                    { id: 'quiz-1', title: 'Biology Fundamentals', questions: 10 },
                    { id: 'quiz-2', title: 'Cell Structure & Function', questions: 15 },
                    { id: 'quiz-3', title: 'Genetics Basics', questions: 8 }
                  ].map((quiz) => (
                    <button
                      key={quiz.id}
                      onClick={() => shareQuiz(quiz.id, quiz.title)}
                      className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{quiz.title}</div>
                      <div className="text-sm text-gray-600">{quiz.questions} questions</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => setShowShareQuiz(false)}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Resource Modal */}
      {showShareResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Share Resource</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Available Resources</h3>
                <div className="space-y-2">
                  {[
                    { id: 'resource-1', title: 'Cell Structure Notes', type: 'PDF' },
                    { id: 'resource-2', title: 'Biology Textbook Chapter 3', type: 'Document' },
                    { id: 'resource-3', title: 'Mitosis Diagram', type: 'Image' }
                  ].map((resource) => (
                    <button
                      key={resource.id}
                      onClick={() => shareResource(resource.id, resource.title)}
                      className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{resource.title}</div>
                      <div className="text-sm text-gray-600">{resource.type}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => setShowShareResource(false)}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyRoom;