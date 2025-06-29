import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  Clock, 
  BookOpen, 
  MessageSquare, 
  Share2, 
  Settings, 
  MoreVertical,
  Calendar,
  Globe,
  Lock,
  Star,
  TrendingUp,
  Award,
  Target,
  Zap,
  Coffee,
  Brain,
  Lightbulb,
  Rocket,
  Heart,
  Eye,
  UserPlus,
  Copy,
  ExternalLink,
  Edit3,
  Trash2,
  LogOut,
  Crown,
  Shield,
  X,
  Hash,
  ArrowRight
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
  is_participant?: boolean;
  user_role?: string;
}

interface StudyRoomProps {
  onNavigate?: (page: string) => void;
}

const StudyRoom: React.FC<StudyRoomProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    subject: '',
    difficulty: 'beginner' as const,
    max_participants: 10,
    is_public: true,
    session_type: 'study' as const,
    tags: [] as string[],
    scheduled_for: ''
  });
  const [creating, setCreating] = useState(false);

  const subjects = [
    'Mathematics', 'Science', 'History', 'Literature', 'Languages', 
    'Computer Science', 'Business', 'Art', 'Music', 'Philosophy', 'Other'
  ];

  useEffect(() => {
    if (user) {
      loadRooms();
    }
  }, [user]);

  const loadRooms = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load public rooms and user's own rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('study_rooms')
        .select(`
          *,
          profiles!study_rooms_created_by_fkey(full_name)
        `)
        .eq('status', 'active')
        .or(`is_public.eq.true,created_by.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (roomsError) throw roomsError;

      // Get participant counts and user participation status
      const roomsWithDetails = await Promise.all(
        (roomsData || []).map(async (room) => {
          // Get participant count
          const { count: participantCount } = await supabase
            .from('room_participants')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .eq('is_active', true);

          // Check if current user is a participant
          const { data: userParticipation } = await supabase
            .from('room_participants')
            .select('role')
            .eq('room_id', room.id)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

          return {
            ...room,
            creator_name: room.profiles?.full_name || 'Unknown',
            participant_count: participantCount || 0,
            is_participant: !!userParticipation,
            user_role: userParticipation?.role || null
          };
        })
      );

      setRooms(roomsWithDetails);
    } catch (error: any) {
      console.error('Error loading rooms:', error);
      toast.error('Failed to load study rooms');
    } finally {
      setLoading(false);
    }
  };

  const generateRoomCode = () => {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  };

  const createRoom = async () => {
    if (!user || !newRoom.name.trim() || !newRoom.subject) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      
      const roomCode = generateRoomCode();
      
      const { data: room, error: roomError } = await supabase
        .from('study_rooms')
        .insert({
          name: newRoom.name.trim(),
          description: newRoom.description.trim(),
          subject: newRoom.subject,
          difficulty: newRoom.difficulty,
          max_participants: newRoom.max_participants,
          is_public: newRoom.is_public,
          created_by: user.id,
          session_type: newRoom.session_type,
          tags: newRoom.tags,
          room_code: roomCode,
          scheduled_for: newRoom.scheduled_for || null
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as host participant
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          role: 'host'
        });

      if (participantError) throw participantError;

      toast.success('Study room created successfully!');
      setShowCreateModal(false);
      setNewRoom({
        name: '',
        description: '',
        subject: '',
        difficulty: 'beginner',
        max_participants: 10,
        is_public: true,
        session_type: 'study',
        tags: [],
        scheduled_for: ''
      });
      
      await loadRooms();
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast.error('Failed to create study room');
    } finally {
      setCreating(false);
    }
  };

  const joinRoomByCode = async () => {
    if (!user || !joinCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }

    try {
      setJoiningRoom(true);
      
      // Find room by code
      const { data: room, error: roomError } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('room_code', joinCode.trim().toUpperCase())
        .eq('status', 'active')
        .single();

      if (roomError || !room) {
        toast.error('Room not found. Please check the code and try again.');
        return;
      }

      // Check if user is already a participant
      const { data: existingParticipation } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      if (existingParticipation) {
        toast.error('You are already a member of this room');
        return;
      }

      // Check room capacity
      const { count: participantCount } = await supabase
        .from('room_participants')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id)
        .eq('is_active', true);

      if ((participantCount || 0) >= room.max_participants) {
        toast.error('This room is full');
        return;
      }

      // Join the room
      const { error: joinError } = await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          role: 'participant'
        });

      if (joinError) throw joinError;

      toast.success(`Successfully joined "${room.name}"!`);
      setShowJoinModal(false);
      setJoinCode('');
      await loadRooms();
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    } finally {
      setJoiningRoom(false);
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomId,
          user_id: user.id,
          role: 'participant'
        });

      if (error) throw error;

      toast.success('Joined room successfully!');
      await loadRooms();
    } catch (error: any) {
      console.error('Error joining room:', error);
      if (error.code === '23505') {
        toast.error('You are already a member of this room');
      } else {
        toast.error('Failed to join room');
      }
    }
  };

  const leaveRoom = async (roomId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Left room successfully');
      await loadRooms();
    } catch (error: any) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  const copyRoomCode = (roomCode: string) => {
    navigator.clipboard.writeText(roomCode);
    toast.success('Room code copied to clipboard!');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'study': return <BookOpen className="w-4 h-4" />;
      case 'quiz': return <Target className="w-4 h-4" />;
      case 'discussion': return <MessageSquare className="w-4 h-4" />;
      case 'presentation': return <Lightbulb className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubject = selectedSubject === 'all' || room.subject === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'all' || room.difficulty === selectedDifficulty;
    const matchesType = selectedType === 'all' || room.session_type === selectedType;
    
    return matchesSearch && matchesSubject && matchesDifficulty && matchesType;
  });

  // Create Room Modal Component
  const CreateRoomModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
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
          <p className="text-gray-600">Set up a new collaborative study space</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Name *
              </label>
              <input
                type="text"
                value={newRoom.name}
                onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter room name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <select
                value={newRoom.subject}
                onChange={(e) => setNewRoom(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select subject</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={newRoom.description}
              onChange={(e) => setNewRoom(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Describe what this room is for..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
              </label>
              <select
                value={newRoom.difficulty}
                onChange={(e) => setNewRoom(prev => ({ ...prev, difficulty: e.target.value as any }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Type
              </label>
              <select
                value={newRoom.session_type}
                onChange={(e) => setNewRoom(prev => ({ ...prev, session_type: e.target.value as any }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="study">Study Session</option>
                <option value="quiz">Quiz Practice</option>
                <option value="discussion">Discussion</option>
                <option value="presentation">Presentation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Participants
              </label>
              <input
                type="number"
                min="2"
                max="100"
                value={newRoom.max_participants}
                onChange={(e) => setNewRoom(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_public"
              checked={newRoom.is_public}
              onChange={(e) => setNewRoom(prev => ({ ...prev, is_public: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_public" className="text-sm font-medium text-gray-700">
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
              disabled={creating || !newRoom.name.trim() || !newRoom.subject}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Join Room Modal Component
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Room by Code</h2>
          <p className="text-gray-600">Enter the room code to join an existing study room</p>
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
              className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
              placeholder="Enter 8-character code"
              maxLength={8}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How to get a room code:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Ask the room creator to share the code</li>
              <li>• Room codes are 8 characters long</li>
              <li>• Codes are case-insensitive</li>
            </ul>
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
              disabled={joiningRoom || !joinCode.trim()}
              className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {joiningRoom ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>Join Room</span>
                </>
              )}
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* Search */}
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

            {/* Subject Filter */}
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

            {/* Difficulty Filter */}
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

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="study">Study Session</option>
              <option value="quiz">Quiz Practice</option>
              <option value="discussion">Discussion</option>
              <option value="presentation">Presentation</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {filteredRooms.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {rooms.length === 0 ? 'No study rooms yet' : 'No rooms match your filters'}
            </h3>
            <p className="text-gray-600 mb-6">
              {rooms.length === 0 
                ? 'Create the first study room or join one using a room code'
                : 'Try adjusting your search criteria or create a new room'
              }
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowJoinModal(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      {getSessionTypeIcon(room.session_type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 line-clamp-1">{room.name}</h3>
                      <p className="text-sm text-gray-500">{room.creator_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {room.is_participant && (
                      <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium">
                        Joined
                      </span>
                    )}
                    {room.created_by === user?.id && (
                      <Crown className="w-4 h-4 text-yellow-500" title="Your room" />
                    )}
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {room.description || 'No description provided'}
                </p>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(room.difficulty)}`}>
                      {room.difficulty}
                    </span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                      {room.subject}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-gray-500">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{room.participant_count}/{room.max_participants}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyRoomCode(room.room_code)}
                      className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors"
                      title="Copy room code"
                    >
                      <Hash className="w-4 h-4" />
                      <span className="text-sm font-mono">{room.room_code}</span>
                    </button>
                  </div>
                  
                  {room.is_participant ? (
                    <button
                      onClick={() => leaveRoom(room.id)}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                    >
                      Leave
                    </button>
                  ) : (
                    <button
                      onClick={() => joinRoom(room.id)}
                      disabled={room.participant_count >= room.max_participants}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {room.participant_count >= room.max_participants ? 'Full' : 'Join'}
                    </button>
                  )}
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