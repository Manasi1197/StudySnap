import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  User, 
  MessageSquare, 
  Share2, 
  Settings,
  Globe,
  Lock,
  Calendar,
  BookOpen,
  Brain,
  Presentation,
  MessageCircle,
  Send,
  Paperclip,
  MoreVertical,
  Copy,
  ExternalLink,
  UserPlus,
  Crown,
  Shield,
  X,
  ArrowLeft,
  Hash,
  Eye,
  EyeOff,
  Palette,
  Square,
  Circle,
  Triangle,
  Minus,
  Type,
  Eraser,
  RotateCcw,
  Download,
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface StudyRoom {
  id: string;
  name: string;
  description: string;
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  max_participants: number;
  is_public: boolean;
  created_by: string;
  tags: string[];
  room_code: string;
  status: 'active' | 'scheduled' | 'ended';
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
  participant_count?: number;
  creator_name?: string;
}

interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: 'host' | 'moderator' | 'participant';
  joined_at: string;
  is_active: boolean;
  user_name?: string;
}

interface RoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  message_type: 'text' | 'file' | 'quiz_share' | 'system';
  created_at: string;
  user_name?: string;
}

interface SharedResource {
  id: string;
  room_id: string;
  user_id: string;
  content_type: 'quiz' | 'flashcard_set' | 'study_material' | 'file';
  content_id: string;
  shared_at: string;
  user_name?: string;
  content_title?: string;
}

interface StudyRoomProps {
  onNavigate?: (page: string) => void;
}

interface WhiteboardTool {
  type: 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text';
  color: string;
  size: number;
}

interface WhiteboardElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  size: number;
  text?: string;
  points?: { x: number; y: number }[];
}

const StudyRoom: React.FC<StudyRoomProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'browse' | 'room' | 'create'>('browse');
  const [activeTab, setActiveTab] = useState<'chat' | 'whiteboard' | 'resources'>('chat');
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [sharedResources, setSharedResources] = useState<SharedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  // Whiteboard state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [whiteboardTool, setWhiteboardTool] = useState<WhiteboardTool>({
    type: 'pen',
    color: '#000000',
    size: 2
  });
  const [whiteboardElements, setWhiteboardElements] = useState<WhiteboardElement[]>([]);

  // Resource sharing state
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<any[]>([]);
  const [showResourceDropdown, setShowResourceDropdown] = useState(false);

  // Available subjects for dropdown
  const subjects = [
    'Mathematics',
    'Science',
    'Biology',
    'Chemistry',
    'Physics',
    'History',
    'Literature',
    'Computer Science',
    'Engineering',
    'Business',
    'Psychology',
    'Philosophy',
    'Art',
    'Music',
    'Languages',
    'Medicine',
    'Law',
    'Economics',
    'Other'
  ];

  // Create room form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    subject: '',
    difficulty: 'beginner' as const,
    max_participants: 10,
    is_public: true,
    tags: [] as string[],
    scheduled_for: ''
  });

  useEffect(() => {
    if (user) {
      loadRooms();
      loadUserResources();
    }
  }, [user]);

  const loadRooms = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load public rooms and rooms created by user
      const { data: roomsData, error } = await supabase
        .from('study_rooms')
        .select(`
          *,
          profiles!study_rooms_created_by_fkey(full_name)
        `)
        .or(`is_public.eq.true,created_by.eq.${user.id}`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get participant counts for each room
      const roomsWithCounts = await Promise.all(
        (roomsData || []).map(async (room) => {
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
        .select('id, title, description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (quizzesError) throw quizzesError;
      setAvailableQuizzes(quizzes || []);

      // Load user's study materials
      const { data: materials, error: materialsError } = await supabase
        .from('study_materials')
        .select('id, title, content, file_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (materialsError) throw materialsError;
      setAvailableMaterials(materials || []);
    } catch (error: any) {
      console.error('Error loading user resources:', error);
    }
  };

  const createRoom = async () => {
    if (!user) return;

    try {
      // Generate unique room code
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Prepare the room data, ensuring scheduled_for is null if empty
      const roomData = {
        ...createForm,
        created_by: user.id,
        room_code: roomCode,
        status: createForm.scheduled_for ? 'scheduled' : 'active',
        scheduled_for: createForm.scheduled_for || null,
        session_type: 'study' // Default session type since we removed the field
      };

      const { data: room, error } = await supabase
        .from('study_rooms')
        .insert(roomData)
        .select()
        .single();

      if (error) throw error;

      // Add creator as host participant using upsert to avoid duplicate key errors
      await supabase
        .from('room_participants')
        .upsert({
          room_id: room.id,
          user_id: user.id,
          role: 'host',
          is_active: true,
          joined_at: new Date().toISOString()
        }, {
          onConflict: 'room_id,user_id'
        });

      toast.success('Study room created successfully!');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        description: '',
        subject: '',
        difficulty: 'beginner',
        max_participants: 10,
        is_public: true,
        tags: [],
        scheduled_for: ''
      });
      
      await loadRooms();
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast.error('Failed to create study room');
    }
  };

  const joinRoom = async (room: StudyRoom) => {
    if (!user) return;

    try {
      // Check if user is already a participant - handle the case where no rows are returned
      const { data: existingParticipant, error: participantError } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle zero rows gracefully

      // Handle the error only if it's not a "no rows found" error
      if (participantError && participantError.code !== 'PGRST116') {
        throw participantError;
      }

      if (existingParticipant) {
        if (existingParticipant.is_active) {
          // User is already active in the room
          setCurrentRoom(room);
          setCurrentView('room');
          await loadRoomData(room.id);
          return;
        } else {
          // Reactivate the participant
          await supabase
            .from('room_participants')
            .update({ is_active: true, joined_at: new Date().toISOString() })
            .eq('id', existingParticipant.id);
        }
      } else {
        // Add new participant using upsert to avoid duplicate key errors
        await supabase
          .from('room_participants')
          .upsert({
            room_id: room.id,
            user_id: user.id,
            role: 'participant',
            is_active: true,
            joined_at: new Date().toISOString()
          }, {
            onConflict: 'room_id,user_id'
          });
      }

      setCurrentRoom(room);
      setCurrentView('room');
      await loadRoomData(room.id);
      toast.success(`Joined ${room.name}!`);
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    }
  };

  const joinRoomByCode = async () => {
    if (!user || !joinCode.trim()) return;

    try {
      const { data: room, error } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('room_code', joinCode.toUpperCase())
        .eq('status', 'active')
        .maybeSingle(); // Use maybeSingle() to handle zero rows gracefully

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!room) {
        toast.error('Invalid room code');
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

  const leaveRoom = async () => {
    if (!user || !currentRoom) return;

    try {
      await supabase
        .from('room_participants')
        .update({ is_active: false })
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id);

      toast.success('Left the room');
      setCurrentView('browse');
      setCurrentRoom(null);
      await loadRooms();
    } catch (error: any) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  const loadRoomData = async (roomId: string) => {
    try {
      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles!room_participants_user_id_fkey(full_name)
        `)
        .eq('room_id', roomId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (participantsError) throw participantsError;

      setParticipants(
        (participantsData || []).map(p => ({
          ...p,
          user_name: p.profiles?.full_name || 'Unknown User'
        }))
      );

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('room_messages')
        .select(`
          *,
          profiles!room_messages_user_id_fkey(full_name)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) throw messagesError;

      setMessages(
        (messagesData || []).map(m => ({
          ...m,
          user_name: m.profiles?.full_name || 'Unknown User'
        }))
      );

      // Load shared resources
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('room_shared_content')
        .select(`
          *,
          profiles!room_shared_content_user_id_fkey(full_name)
        `)
        .eq('room_id', roomId)
        .order('shared_at', { ascending: false });

      if (resourcesError) throw resourcesError;

      // Enrich resources with content details
      const enrichedResources = await Promise.all(
        (resourcesData || []).map(async (resource) => {
          let contentTitle = 'Unknown Resource';
          
          if (resource.content_type === 'quiz' && resource.content_id) {
            const { data: quiz, error: quizError } = await supabase
              .from('quizzes')
              .select('title')
              .eq('id', resource.content_id)
              .maybeSingle(); // Use maybeSingle() to handle zero rows gracefully
            
            if (!quizError || quizError.code === 'PGRST116') {
              contentTitle = quiz?.title || 'Quiz';
            }
          } else if (resource.content_type === 'study_material' && resource.content_id) {
            const { data: material, error: materialError } = await supabase
              .from('study_materials')
              .select('title')
              .eq('id', resource.content_id)
              .maybeSingle(); // Use maybeSingle() to handle zero rows gracefully
            
            if (!materialError || materialError.code === 'PGRST116') {
              contentTitle = material?.title || 'Study Material';
            }
          }

          return {
            ...resource,
            user_name: resource.profiles?.full_name || 'Unknown User',
            content_title: contentTitle
          };
        })
      );

      setSharedResources(enrichedResources);
    } catch (error: any) {
      console.error('Error loading room data:', error);
      toast.error('Failed to load room data');
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
      await loadRoomData(currentRoom.id);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const shareResource = async (contentType: 'quiz' | 'study_material', contentId: string) => {
    if (!user || !currentRoom) return;

    try {
      const { error } = await supabase
        .from('room_shared_content')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          content_type: contentType,
          content_id: contentId
        });

      if (error) throw error;

      toast.success('Resource shared successfully!');
      setShowResourceModal(false);
      await loadRoomData(currentRoom.id);
    } catch (error: any) {
      console.error('Error sharing resource:', error);
      toast.error('Failed to share resource');
    }
  };

  const copyRoomCode = () => {
    if (currentRoom) {
      navigator.clipboard.writeText(currentRoom.room_code);
      toast.success('Room code copied to clipboard!');
    }
  };

  // Whiteboard functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (whiteboardTool.type === 'pen') {
      const newElement: WhiteboardElement = {
        id: Date.now().toString(),
        type: 'pen',
        x,
        y,
        color: whiteboardTool.color,
        size: whiteboardTool.size,
        points: [{ x, y }]
      };
      setWhiteboardElements(prev => [...prev, newElement]);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (whiteboardTool.type === 'pen') {
      setWhiteboardElements(prev => {
        const newElements = [...prev];
        const lastElement = newElements[newElements.length - 1];
        if (lastElement && lastElement.points) {
          lastElement.points.push({ x, y });
        }
        return newElements;
      });
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearWhiteboard = () => {
    setWhiteboardElements([]);
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    whiteboardElements.forEach(element => {
      ctx.strokeStyle = element.color;
      ctx.lineWidth = element.size;
      ctx.lineCap = 'round';

      if (element.type === 'pen' && element.points) {
        ctx.beginPath();
        element.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      }
    });
  };

  useEffect(() => {
    redrawCanvas();
  }, [whiteboardElements]);

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubject = selectedSubject === 'all' || room.subject === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'all' || room.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'host': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'moderator': return <Shield className="w-4 h-4 text-blue-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getResourceIcon = (contentType: string) => {
    switch (contentType) {
      case 'quiz': return <Brain className="w-4 h-4 text-purple-500" />;
      case 'study_material': return <FileText className="w-4 h-4 text-blue-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  // Create Room Modal
  const CreateRoomModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Study Room</h2>
          <button
            onClick={() => setShowCreateModal(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Name *
            </label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter room name..."
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none"
              placeholder="Describe what this room is about..."
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <select
                value={createForm.subject}
                onChange={(e) => setCreateForm(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a subject</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                value={createForm.difficulty}
                onChange={(e) => setCreateForm(prev => ({ ...prev, difficulty: e.target.value as any }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Participants
            </label>
            <input
              type="number"
              min="2"
              max="100"
              value={createForm.max_participants}
              onChange={(e) => setCreateForm(prev => ({ ...prev, max_participants: parseInt(e.target.value) || 10 }))}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_public"
              checked={createForm.is_public}
              onChange={(e) => setCreateForm(prev => ({ ...prev, is_public: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_public" className="text-sm text-gray-700">
              Make this room public (others can discover and join)
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
              disabled={!createForm.name || !createForm.subject}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Join Room Modal
  const JoinRoomModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Join Room</h2>
          <button
            onClick={() => setShowJoinModal(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
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
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
              placeholder="Enter 6-digit code"
              maxLength={6}
              autoComplete="off"
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
              disabled={joinCode.length !== 6}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Resource Sharing Modal
  const ResourceSharingModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Share Resources</h2>
          <button
            onClick={() => setShowResourceModal(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Quizzes Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-500" />
              Your Quizzes
            </h3>
            {availableQuizzes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No quizzes available. Create some quizzes first!
              </p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {availableQuizzes.map((quiz) => (
                  <div key={quiz.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{quiz.title}</h4>
                      <p className="text-sm text-gray-500">{quiz.description}</p>
                      <p className="text-xs text-gray-400">
                        Created {new Date(quiz.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => shareResource('quiz', quiz.id)}
                      className="ml-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                    >
                      Share
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Study Materials Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-500" />
              Your Study Materials
            </h3>
            {availableMaterials.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No study materials available. Upload some materials first!
              </p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {availableMaterials.map((material) => (
                  <div key={material.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{material.title}</h4>
                      <p className="text-sm text-gray-500 capitalize">{material.file_type} file</p>
                      <p className="text-xs text-gray-400">
                        Created {new Date(material.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => shareResource('study_material', material.id)}
                      className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      Share
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => setShowResourceModal(false)}
            className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading study rooms...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'room' && currentRoom) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Room Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('browse')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Rooms</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{currentRoom.name}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center space-x-1">
                    <Hash className="w-4 h-4" />
                    <span>{currentRoom.room_code}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{participants.length} participants</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={copyRoomCode}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Code</span>
              </button>
              <button
                onClick={leaveRoom}
                className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Leave Room</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center space-x-1 mt-4">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('whiteboard')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'whiteboard'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Palette className="w-4 h-4 inline mr-2" />
              Whiteboard
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'resources'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Share2 className="w-4 h-4 inline mr-2" />
              Resources
            </button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <>
                {/* Messages */}
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {message.user_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900">{message.user_name}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-gray-700">{message.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 p-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Type a message..."
                      autoComplete="off"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Whiteboard Tab */}
            {activeTab === 'whiteboard' && (
              <>
                {/* Whiteboard Tools */}
                <div className="border-b border-gray-200 p-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setWhiteboardTool(prev => ({ ...prev, type: 'pen' }))}
                        className={`p-2 rounded-lg ${whiteboardTool.type === 'pen' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                      >
                        <Type className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setWhiteboardTool(prev => ({ ...prev, type: 'eraser' }))}
                        className={`p-2 rounded-lg ${whiteboardTool.type === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                      >
                        <Eraser className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Color:</label>
                      <input
                        type="color"
                        value={whiteboardTool.color}
                        onChange={(e) => setWhiteboardTool(prev => ({ ...prev, color: e.target.value }))}
                        className="w-8 h-8 rounded border border-gray-200"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Size:</label>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={whiteboardTool.size}
                        onChange={(e) => setWhiteboardTool(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600 w-8">{whiteboardTool.size}px</span>
                    </div>

                    <button
                      onClick={clearWhiteboard}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>

                {/* Whiteboard Canvas */}
                <div className="flex-1 p-4">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="border border-gray-200 rounded-lg bg-white cursor-crosshair w-full h-full"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>
              </>
            )}

            {/* Resources Tab */}
            {activeTab === 'resources' && (
              <>
                <div className="border-b border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Shared Resources</h3>
                    <button
                      onClick={() => setShowResourceModal(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Share Resource</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                  {sharedResources.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Share2 className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No resources shared yet</h3>
                      <p className="text-gray-600 mb-6">Share your quizzes and study materials with the room</p>
                      <button
                        onClick={() => setShowResourceModal(true)}
                        className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Share First Resource
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sharedResources.map((resource) => (
                        <div key={resource.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4">
                              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                {getResourceIcon(resource.content_type)}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">{resource.content_title}</h4>
                                <p className="text-sm text-gray-600 mb-2 capitalize">{resource.content_type.replace('_', ' ')}</p>
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <span>Shared by {resource.user_name}</span>
                                  <span>{new Date(resource.shared_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Participants Sidebar */}
          <div className="w-80 bg-white border-l border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Participants ({participants.length})</h3>
            <div className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {participant.user_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{participant.user_name}</p>
                    <div className="flex items-center space-x-1">
                      {getRoleIcon(participant.role)}
                      <span className="text-xs text-gray-500 capitalize">{participant.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
              className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              <Hash className="w-4 h-4" />
              <span>Join by Code</span>
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
                placeholder="Search rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full lg:w-96"
                autoComplete="off"
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
        {filteredRooms.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-gray-400" />
            </div>
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
              <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {room.name}
                      </h3>
                      <p className="text-sm text-gray-500">by {room.creator_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {room.is_public ? (
                      <Globe className="w-4 h-4 text-green-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {room.description || 'No description provided'}
                </p>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">{room.subject}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(room.difficulty)}`}>
                      {room.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>{room.participant_count}/{room.max_participants}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(room.created_at).toLocaleDateString()}</span>
                  </div>
                  <button
                    onClick={() => joinRoom(room)}
                    disabled={room.participant_count >= room.max_participants}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {room.participant_count >= room.max_participants ? 'Full' : 'Join'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && <CreateRoomModal />}
      {showJoinModal && <JoinRoomModal />}
      {showResourceModal && <ResourceSharingModal />}
    </div>
  );
};

export default StudyRoom;