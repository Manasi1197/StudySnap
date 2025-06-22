import React, { useState, useEffect } from 'react';
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
  Send,
  Paperclip,
  MoreVertical,
  X,
  Copy,
  Check,
  Trash2,
  Edit3,
  Eye,
  Brain,
  BookOpen,
  FileText,
  Image,
  Video,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Monitor,
  MonitorOff,
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
  Palette,
  Download,
  Upload,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Move,
  MousePointer,
  Pen,
  PenTool,
  Hash
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
  session_type: 'study' | 'quiz' | 'discussion' | 'presentation';
  tags: string[];
  room_code: string;
  status: 'active' | 'scheduled' | 'ended';
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  participant_count?: number;
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
  content_id?: string;
  shared_at: string;
  user_name?: string;
  content_title?: string;
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
  const [sharedResources, setSharedResources] = useState<SharedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');

  // Whiteboard state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'text' | 'shapes'>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [whiteboardData, setWhiteboardData] = useState<any[]>([]);

  // Create room form state
  const [createRoomForm, setCreateRoomForm] = useState({
    name: '',
    description: '',
    subject: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    max_participants: 10,
    is_public: true,
    scheduled_for: ''
  });

  const subjects = [
    'Mathematics',
    'Science',
    'History',
    'Literature',
    'Computer Science',
    'Physics',
    'Chemistry',
    'Biology',
    'Economics',
    'Psychology',
    'Philosophy',
    'Art',
    'Music',
    'Languages',
    'Engineering',
    'Medicine',
    'Business',
    'Law',
    'Other'
  ];

  useEffect(() => {
    if (user) {
      loadRooms();
    }
  }, [user]);

  useEffect(() => {
    if (currentRoom) {
      loadRoomData();
      const interval = setInterval(loadRoomData, 3000); // Refresh every 3 seconds
      return () => clearInterval(interval);
    }
  }, [currentRoom]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('study_rooms')
        .select(`
          *,
          profiles!study_rooms_created_by_fkey(full_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const roomsWithCounts = await Promise.all(
        (data || []).map(async (room) => {
          const { count } = await supabase
            .from('room_participants')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .eq('is_active', true);

          return {
            ...room,
            creator_name: room.profiles?.full_name || 'Unknown',
            participant_count: count || 0
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

  const loadRoomData = async () => {
    if (!currentRoom) return;

    try {
      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles!room_participants_user_id_fkey(full_name)
        `)
        .eq('room_id', currentRoom.id)
        .eq('is_active', true);

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
        .eq('room_id', currentRoom.id)
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
        .eq('room_id', currentRoom.id)
        .order('shared_at', { ascending: false });

      if (resourcesError) throw resourcesError;

      setSharedResources(
        (resourcesData || []).map(r => ({
          ...r,
          user_name: r.profiles?.full_name || 'Unknown User'
        }))
      );

    } catch (error: any) {
      console.error('Error loading room data:', error);
    }
  };

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = async () => {
    if (!user) return;

    try {
      const roomCode = generateRoomCode();
      
      const { data: roomData, error: roomError } = await supabase
        .from('study_rooms')
        .insert({
          name: createRoomForm.name,
          description: createRoomForm.description,
          subject: createRoomForm.subject,
          difficulty: createRoomForm.difficulty,
          max_participants: createRoomForm.max_participants,
          is_public: createRoomForm.is_public,
          created_by: user.id,
          session_type: 'study', // Default to study since we removed the dropdown
          room_code: roomCode,
          scheduled_for: createRoomForm.scheduled_for || null
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as host participant
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomData.id,
          user_id: user.id,
          role: 'host'
        });

      if (participantError) throw participantError;

      toast.success('Study room created successfully!');
      setShowCreateModal(false);
      setCreateRoomForm({
        name: '',
        description: '',
        subject: '',
        difficulty: 'beginner',
        max_participants: 10,
        is_public: true,
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
      // Check if already a participant
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      if (existingParticipant) {
        // Update to active if inactive
        if (!existingParticipant.is_active) {
          const { error } = await supabase
            .from('room_participants')
            .update({ is_active: true })
            .eq('id', existingParticipant.id);

          if (error) throw error;
        }
      } else {
        // Add as new participant
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
      toast.success(`Joined ${room.name}!`);
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    }
  };

  const joinRoomByCode = async () => {
    if (!user || !joinRoomCode.trim()) return;

    try {
      const { data: room, error } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('room_code', joinRoomCode.trim().toUpperCase())
        .eq('status', 'active')
        .single();

      if (error || !room) {
        toast.error('Room not found or inactive');
        return;
      }

      await joinRoom(room);
      setJoinRoomCode('');
      setShowJoinModal(false);
    } catch (error: any) {
      console.error('Error joining room by code:', error);
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
      toast.success('Left the room');
    } catch (error: any) {
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
      await loadRoomData(); // Refresh messages
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const shareResource = async (type: 'quiz' | 'material') => {
    if (!user || !currentRoom) return;

    try {
      const { error } = await supabase
        .from('room_shared_content')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          content_type: type === 'quiz' ? 'quiz' : 'study_material'
        });

      if (error) throw error;

      toast.success(`${type === 'quiz' ? 'Quiz' : 'Material'} shared successfully!`);
      await loadRoomData(); // Refresh shared resources
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

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || room.subject === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'all' || room.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  // Create Room Modal
  const CreateRoomModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
        <button
          onClick={() => setShowCreateModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Plus className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Create Study Room</h2>
          <p className="text-gray-600 text-sm">Set up a new collaborative study session</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Name
            </label>
            <input
              type="text"
              value={createRoomForm.name}
              onChange={(e) => setCreateRoomForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Enter room name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <select
              value={createRoomForm.subject}
              onChange={(e) => setCreateRoomForm(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">Select a subject</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={createRoomForm.difficulty}
                onChange={(e) => setCreateRoomForm(prev => ({ ...prev, difficulty: e.target.value as any }))}
                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Participants
              </label>
              <input
                type="number"
                min="2"
                max="50"
                value={createRoomForm.max_participants}
                onChange={(e) => setCreateRoomForm(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={createRoomForm.description}
              onChange={(e) => setCreateRoomForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows={2}
              placeholder="Brief description of the study session"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_public"
              checked={createRoomForm.is_public}
              onChange={(e) => setCreateRoomForm(prev => ({ ...prev, is_public: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_public" className="ml-2 text-sm text-gray-700">
              Make room public
            </label>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={() => setShowCreateModal(false)}
            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={createRoom}
            disabled={!createRoomForm.name || !createRoomForm.subject}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Create Room
          </button>
        </div>
      </div>
    </div>
  );

  // Join Room Modal
  const JoinRoomModal = () => (
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Room</h2>
          <p className="text-gray-600">Enter the room code to join a study session</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Code
            </label>
            <input
              type="text"
              value={joinRoomCode}
              onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
              className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
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
              disabled={!joinRoomCode.trim()}
              className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Room
            </button>
          </div>
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
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{currentRoom.name}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{currentRoom.subject}</span>
                  <span>•</span>
                  <span className="capitalize">{currentRoom.difficulty}</span>
                  <span>•</span>
                  <span>{participants.length} participants</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={copyRoomCode}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span className="font-mono">{currentRoom.room_code}</span>
              </button>
              <button
                onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
                className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <Monitor className="w-5 h-5" />
              </button>
              <button
                onClick={leaveRoom}
                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Whiteboard */}
            {isWhiteboardOpen && (
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="bg-gray-100 rounded-lg p-4 h-64">
                  {/* Whiteboard Tools */}
                  <div className="flex items-center space-x-2 mb-4">
                    <button
                      onClick={() => setCurrentTool('pen')}
                      className={`p-2 rounded-lg transition-colors ${
                        currentTool === 'pen' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Pen className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentTool('eraser')}
                      className={`p-2 rounded-lg transition-colors ${
                        currentTool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Eraser className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-gray-300"></div>
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => setCurrentColor(e.target.value)}
                      className="w-8 h-8 rounded border border-gray-300"
                    />
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-20"
                    />
                    <div className="w-px h-6 bg-gray-300"></div>
                    <button className="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50">
                      <Undo className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50">
                      <Redo className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Whiteboard Canvas */}
                  <div className="bg-white rounded border-2 border-dashed border-gray-300 h-48 flex items-center justify-center">
                    <p className="text-gray-500">Whiteboard Canvas</p>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white">
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto">
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
                      onClick={() => shareResource('quiz')}
                      className="p-3 text-gray-400 hover:text-blue-500 transition-colors"
                      title="Share Quiz"
                    >
                      <Brain className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => shareResource('material')}
                      className="p-3 text-gray-400 hover:text-green-500 transition-colors"
                      title="Share Material"
                    >
                      <FileText className="w-5 h-5" />
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
          </div>

          {/* Sidebar */}
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            {/* Participants */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Participants ({participants.length})</h3>
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {participant.user_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{participant.user_name}</p>
                      <p className="text-xs text-gray-500 capitalize">{participant.role}</p>
                    </div>
                    {participant.role === 'host' && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Shared Resources */}
            <div className="flex-1 p-4">
              <h3 className="font-medium text-gray-900 mb-3">Shared Resources</h3>
              <div className="space-y-3">
                {sharedResources.map((resource) => (
                  <div key={resource.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      {resource.content_type === 'quiz' ? (
                        <Brain className="w-4 h-4 text-purple-500" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-500" />
                      )}
                      <span className="font-medium text-gray-900 capitalize">
                        {resource.content_type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Shared by {resource.user_name} • {new Date(resource.shared_at).toLocaleTimeString()}
                    </p>
                    <button
                      onClick={() => {
                        if (resource.content_type === 'quiz') {
                          onNavigate?.('quiz-generator');
                        } else {
                          onNavigate?.('materials');
                        }
                      }}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View →
                    </button>
                  </div>
                ))}
                {sharedResources.length === 0 && (
                  <p className="text-gray-500 text-sm">No resources shared yet</p>
                )}
              </div>
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
                placeholder="Search rooms..."
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
        {filteredRooms.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No study rooms found</h3>
            <p className="text-gray-600 mb-6">
              {rooms.length === 0 
                ? "Be the first to create a study room!" 
                : "Try adjusting your search or filters"
              }
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
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{room.description}</p>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>{room.participant_count}/{room.max_participants}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-4">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                    {room.subject}
                  </span>
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium capitalize">
                    {room.difficulty}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    by {room.creator_name}
                  </div>
                  <button
                    onClick={() => joinRoom(room)}
                    disabled={room.participant_count >= room.max_participants}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
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
    </div>
  );
};

export default StudyRoom;