import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  BookOpen, 
  MessageSquare, 
  Share2, 
  Settings,
  Send,
  Paperclip,
  MoreVertical,
  UserPlus,
  Copy,
  ExternalLink,
  X,
  Palette,
  Type,
  Square,
  Circle,
  Triangle,
  Minus,
  RotateCcw,
  Download,
  Upload,
  Eraser,
  Edit3,
  Brain,
  FileText,
  LogOut,
  Eye,
  EyeOff,
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
  session_type: string;
  tags: string[];
  room_code: string;
  status: 'active' | 'scheduled' | 'ended';
  scheduled_for?: string;
  created_at: string;
  participant_count?: number;
  creator_name?: string;
}

interface RoomParticipant {
  id: string;
  user_id: string;
  role: 'host' | 'moderator' | 'participant';
  joined_at: string;
  is_active: boolean;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface RoomMessage {
  id: string;
  user_id: string;
  message: string;
  message_type: 'text' | 'file' | 'quiz_share' | 'system';
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface SharedResource {
  id: string;
  content_type: 'quiz' | 'flashcard_set' | 'study_material' | 'file';
  content_id?: string;
  shared_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    email: string;
  };
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
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [newMessage, setNewMessage] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'text' | 'shapes'>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentShape, setCurrentShape] = useState<'rectangle' | 'circle' | 'triangle' | 'line'>('rectangle');
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');

  // Subject options for dropdown
  const subjectOptions = [
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
    'Other'
  ];

  // Form state for creating room
  const [roomForm, setRoomForm] = useState({
    name: '',
    description: '',
    subject: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    max_participants: 10,
    is_public: true,
    tags: [] as string[]
  });

  useEffect(() => {
    if (user) {
      loadRooms();
    }
  }, [user]);

  useEffect(() => {
    if (currentRoom) {
      loadRoomData();
      const interval = setInterval(loadRoomData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [currentRoom]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      
      // Get all public rooms and rooms created by the user
      const { data: roomsData, error: roomsError } = await supabase
        .from('study_rooms')
        .select(`
          *,
          profiles!study_rooms_created_by_fkey(full_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (roomsError) throw roomsError;

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

  const loadRoomData = async () => {
    if (!currentRoom) return;

    try {
      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq('room_id', currentRoom.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('room_messages')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq('room_id', currentRoom.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

      // Load shared resources
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('room_shared_content')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq('room_id', currentRoom.id)
        .order('shared_at', { ascending: false });

      if (resourcesError) throw resourcesError;
      setSharedResources(resourcesData || []);

    } catch (error: any) {
      console.error('Error loading room data:', error);
    }
  };

  const createRoom = async () => {
    if (!user) return;

    try {
      // Generate a unique room code
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from('study_rooms')
        .insert({
          name: roomForm.name,
          description: roomForm.description,
          subject: roomForm.subject,
          difficulty: roomForm.difficulty,
          max_participants: roomForm.max_participants,
          is_public: roomForm.is_public,
          created_by: user.id,
          session_type: 'study', // Default to study since we removed the dropdown
          tags: roomForm.tags,
          room_code: roomCode,
          status: 'active'
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
      setShowCreateModal(false);
      setRoomForm({
        name: '',
        description: '',
        subject: '',
        difficulty: 'beginner',
        max_participants: 10,
        is_public: true,
        tags: []
      });
      loadRooms();
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
          await supabase
            .from('room_participants')
            .update({ is_active: true })
            .eq('id', existingParticipant.id);
        }
      } else {
        // Join as new participant
        await supabase
          .from('room_participants')
          .insert({
            room_id: room.id,
            user_id: user.id,
            role: 'participant'
          });
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
      // Find room by code
      const { data: room, error: roomError } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('room_code', joinRoomCode.trim().toUpperCase())
        .eq('status', 'active')
        .single();

      if (roomError || !room) {
        toast.error('Room not found or inactive');
        return;
      }

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
          await supabase
            .from('room_participants')
            .update({ is_active: true })
            .eq('id', existingParticipant.id);
        }
      } else {
        // Join as new participant
        await supabase
          .from('room_participants')
          .insert({
            room_id: room.id,
            user_id: user.id,
            role: 'participant'
          });
      }

      setCurrentRoom(room);
      setCurrentView('room');
      setShowJoinModal(false);
      setJoinRoomCode('');
      toast.success(`Joined ${room.name}!`);
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

      setCurrentView('browse');
      setCurrentRoom(null);
      toast.success('Left the room');
    } catch (error: any) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  const sendMessage = async () => {
    if (!user || !currentRoom || !newMessage.trim()) return;

    try {
      await supabase
        .from('room_messages')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          message: newMessage.trim(),
          message_type: 'text'
        });

      setNewMessage('');
      loadRoomData(); // Refresh messages
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const shareResource = async (type: 'quiz' | 'material') => {
    if (!user || !currentRoom) return;

    try {
      await supabase
        .from('room_shared_content')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          content_type: type === 'quiz' ? 'quiz' : 'study_material',
          content_id: null // For now, we'll just share the type
        });

      // Send a system message about the share
      await supabase
        .from('room_messages')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          message: `Shared a ${type}`,
          message_type: 'quiz_share'
        });

      toast.success(`${type} shared successfully!`);
      loadRoomData(); // Refresh data
    } catch (error: any) {
      console.error('Error sharing resource:', error);
      toast.error('Failed to share resource');
    }
  };

  const handleResourceClick = (resource: SharedResource) => {
    if (resource.content_type === 'quiz') {
      if (onNavigate) {
        onNavigate('quiz-generator');
      }
    } else if (resource.content_type === 'study_material') {
      if (onNavigate) {
        onNavigate('materials');
      }
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
                         room.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubject = selectedSubject === 'all' || room.subject === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'all' || room.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  // Create Room Modal
  const CreateRoomModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setShowCreateModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Study Room</h2>
          <p className="text-gray-600">Set up a collaborative learning space</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Name
            </label>
            <input
              type="text"
              value={roomForm.name}
              onChange={(e) => setRoomForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter room name..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={roomForm.description}
              onChange={(e) => setRoomForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20 resize-none"
              placeholder="Brief description of the study session..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <select
                value={roomForm.subject}
                onChange={(e) => setRoomForm(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select subject</option>
                {subjectOptions.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                value={roomForm.difficulty}
                onChange={(e) => setRoomForm(prev => ({ ...prev, difficulty: e.target.value as any }))}
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
              max="50"
              value={roomForm.max_participants}
              onChange={(e) => setRoomForm(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_public"
              checked={roomForm.is_public}
              onChange={(e) => setRoomForm(prev => ({ ...prev, is_public: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_public" className="ml-3 text-sm text-gray-700">
              Make room public (others can discover and join)
            </label>
          </div>
        </div>

        <div className="flex space-x-4 mt-6">
          <button
            onClick={() => setShowCreateModal(false)}
            className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={createRoom}
            disabled={!roomForm.name || !roomForm.subject}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

        <div className="text-center mb-6">
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

  if (currentView === 'room' && currentRoom) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Room Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{currentRoom.name}</h1>
                <p className="text-gray-600">{currentRoom.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {currentRoom.subject}
                </span>
                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                  {participants.length}/{currentRoom.max_participants} participants
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={copyRoomCode}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>Code: {currentRoom.room_code}</span>
              </button>
              <button
                onClick={() => setShowWhiteboard(!showWhiteboard)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>{showWhiteboard ? 'Hide' : 'Show'} Whiteboard</span>
              </button>
              <button
                onClick={leaveRoom}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Room</span>
              </button>
            </div>
          </div>
        </div>

        {/* Room Content */}
        <div className="flex-1 flex">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Whiteboard */}
            {showWhiteboard && (
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Collaborative Whiteboard</h3>
                  <div className="flex items-center space-x-2">
                    {/* Drawing Tools */}
                    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setCurrentTool('pen')}
                        className={`p-2 rounded ${currentTool === 'pen' ? 'bg-white shadow' : ''}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentTool('eraser')}
                        className={`p-2 rounded ${currentTool === 'eraser' ? 'bg-white shadow' : ''}`}
                      >
                        <Eraser className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentTool('text')}
                        className={`p-2 rounded ${currentTool === 'text' ? 'bg-white shadow' : ''}`}
                      >
                        <Type className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentTool('shapes')}
                        className={`p-2 rounded ${currentTool === 'shapes' ? 'bg-white shadow' : ''}`}
                      >
                        <Square className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Color Picker */}
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => setCurrentColor(e.target.value)}
                      className="w-8 h-8 rounded border border-gray-300"
                    />

                    {/* Clear Button */}
                    <button className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Whiteboard Canvas */}
                <div className="bg-white border-2 border-gray-200 rounded-lg h-64 relative">
                  <canvas
                    className="w-full h-full rounded-lg cursor-crosshair"
                    onMouseDown={() => setIsDrawing(true)}
                    onMouseUp={() => setIsDrawing(false)}
                    onMouseLeave={() => setIsDrawing(false)}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <span>Collaborative whiteboard - start drawing!</span>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-bold text-gray-900">Discussion</h3>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {message.profiles?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {message.profiles?.full_name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-700">{message.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            {/* Participants */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">Participants ({participants.length})</h3>
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {participant.profiles?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {participant.profiles?.full_name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{participant.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shared Resources */}
            <div className="flex-1 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Shared Resources</h3>
                <div className="flex space-x-1">
                  <button
                    onClick={() => shareResource('quiz')}
                    className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                    title="Share Quiz"
                  >
                    <Brain className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => shareResource('material')}
                    className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                    title="Share Material"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                {sharedResources.map((resource) => (
                  <div
                    key={resource.id}
                    onClick={() => handleResourceClick(resource)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      {resource.content_type === 'quiz' ? (
                        <Brain className="w-4 h-4 text-blue-500" />
                      ) : (
                        <FileText className="w-4 h-4 text-green-500" />
                      )}
                      <span className="font-medium text-gray-900 capitalize">
                        {resource.content_type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Shared by {resource.profiles?.full_name || 'Unknown User'}
                    </p>
                  </div>
                ))}
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
            <p className="text-gray-600">Join collaborative study sessions with peers</p>
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Subjects</option>
              {subjectOptions.map(subject => (
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
          <div className="text-center py-16">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading study rooms...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No study rooms found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedSubject !== 'all' || selectedDifficulty !== 'all'
                ? 'Try adjusting your search filters'
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
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{room.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-4">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                    {room.subject}
                  </span>
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium capitalize">
                    {room.difficulty}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{room.participant_count}/{room.max_participants}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(room.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    by {room.creator_name}
                  </span>
                  <button
                    onClick={() => joinRoom(room)}
                    disabled={room.participant_count >= room.max_participants}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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