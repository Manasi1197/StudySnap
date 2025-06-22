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
  Globe,
  Lock,
  Calendar,
  MapPin,
  Star,
  TrendingUp,
  Award,
  Target,
  Zap,
  ChevronRight,
  X,
  Hash,
  LogIn,
  UserPlus,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Crown,
  Shield,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Loader2
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
  participant_count?: number;
  creator_name?: string;
}

interface StudyRoomProps {
  onNavigate?: (page: string) => void;
}

const StudyRoom: React.FC<StudyRoomProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Create room form state
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

  const subjects = [
    'Mathematics', 'Science', 'History', 'Literature', 'Computer Science',
    'Physics', 'Chemistry', 'Biology', 'Economics', 'Psychology', 'Art', 'Music'
  ];

  const difficulties = ['beginner', 'intermediate', 'advanced'];
  const sessionTypes = [
    { value: 'study', label: 'Study Session', icon: BookOpen },
    { value: 'quiz', label: 'Quiz Practice', icon: Target },
    { value: 'discussion', label: 'Discussion', icon: MessageSquare },
    { value: 'presentation', label: 'Presentation', icon: Users }
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
      console.log('Loading study rooms...');

      const { data, error } = await supabase
        .from('study_rooms')
        .select(`
          *,
          profiles!study_rooms_created_by_fkey(full_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading rooms:', error);
        throw error;
      }

      console.log('Loaded rooms:', data);

      // Get participant counts for each room
      const roomsWithCounts = await Promise.all(
        (data || []).map(async (room) => {
          try {
            const { count, error: countError } = await supabase
              .from('room_participants')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id)
              .eq('is_active', true);

            if (countError) {
              console.error('Error getting participant count for room', room.id, ':', countError);
            }

            return {
              ...room,
              participant_count: count || 0,
              creator_name: room.profiles?.full_name || 'Unknown'
            };
          } catch (error) {
            console.error('Error processing room:', room.id, error);
            return {
              ...room,
              participant_count: 0,
              creator_name: 'Unknown'
            };
          }
        })
      );

      setRooms(roomsWithCounts);
    } catch (error: any) {
      console.error('Error in loadRooms:', error);
      
      if (error.message?.includes('Failed to fetch')) {
        toast.error('Network error: Unable to connect to the server. Please check your internet connection.');
      } else if (error.message?.includes('JWT')) {
        toast.error('Authentication error: Please sign out and sign in again.');
      } else if (error.code === 'PGRST301') {
        toast.error('Database error: Invalid query. Please refresh the page.');
      } else {
        toast.error(`Failed to load study rooms: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = async () => {
    if (!user) return;

    if (!newRoom.name.trim() || !newRoom.subject) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setCreatingRoom(true);
      console.log('Creating room with data:', newRoom);

      const roomCode = generateRoomCode();
      
      const { data, error } = await supabase
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
          status: 'active',
          scheduled_for: newRoom.scheduled_for || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating room:', error);
        throw error;
      }

      console.log('Room created successfully:', data);

      // Add creator as host participant
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: data.id,
          user_id: user.id,
          role: 'host',
          is_active: true
        });

      if (participantError) {
        console.error('Error adding creator as participant:', participantError);
        // Don't throw here as room was created successfully
      }

      toast.success(`Room created successfully! Room code: ${roomCode}`);
      setShowCreateModal(false);
      resetCreateForm();
      loadRooms();
    } catch (error: any) {
      console.error('Error in createRoom:', error);
      
      if (error.message?.includes('Failed to fetch')) {
        toast.error('Network error: Unable to create room. Please check your connection.');
      } else if (error.code === '23505') {
        toast.error('Room code already exists. Please try again.');
      } else {
        toast.error(`Failed to create room: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setCreatingRoom(false);
    }
  };

  const joinRoomWithCode = async () => {
    if (!user || !joinCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }

    try {
      setJoiningRoom(true);
      console.log('Joining room with code:', joinCode.trim().toUpperCase());

      // Find room by code
      const { data: room, error: roomError } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('room_code', joinCode.trim().toUpperCase())
        .eq('status', 'active')
        .single();

      if (roomError || !room) {
        console.error('Room not found:', roomError);
        toast.error('Room not found. Please check the code and try again.');
        return;
      }

      // Check if user is already a participant
      const { data: existingParticipant, error: participantCheckError } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      if (participantCheckError && participantCheckError.code !== 'PGRST116') {
        console.error('Error checking participant status:', participantCheckError);
        throw participantCheckError;
      }

      if (existingParticipant) {
        if (existingParticipant.is_active) {
          toast.success('You are already in this room!');
        } else {
          // Reactivate participation
          const { error: updateError } = await supabase
            .from('room_participants')
            .update({ is_active: true, joined_at: new Date().toISOString() })
            .eq('id', existingParticipant.id);

          if (updateError) {
            console.error('Error reactivating participation:', updateError);
            throw updateError;
          }

          toast.success('Rejoined the room successfully!');
        }
      } else {
        // Check room capacity
        const { count, error: countError } = await supabase
          .from('room_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .eq('is_active', true);

        if (countError) {
          console.error('Error checking room capacity:', countError);
          throw countError;
        }

        if (count && count >= room.max_participants) {
          toast.error('Room is full. Cannot join at this time.');
          return;
        }

        // Add user as participant
        const { error: joinError } = await supabase
          .from('room_participants')
          .insert({
            room_id: room.id,
            user_id: user.id,
            role: 'participant',
            is_active: true
          });

        if (joinError) {
          console.error('Error joining room:', joinError);
          throw joinError;
        }

        toast.success(`Joined "${room.name}" successfully!`);
      }

      setShowJoinModal(false);
      setJoinCode('');
      loadRooms();
    } catch (error: any) {
      console.error('Error in joinRoomWithCode:', error);
      
      if (error.message?.includes('Failed to fetch')) {
        toast.error('Network error: Unable to join room. Please check your connection.');
      } else {
        toast.error(`Failed to join room: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setJoiningRoom(false);
    }
  };

  const resetCreateForm = () => {
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
  };

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

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'study': return BookOpen;
      case 'quiz': return Target;
      case 'discussion': return MessageSquare;
      case 'presentation': return Users;
      default: return BookOpen;
    }
  };

  // Join with Code Modal
  const JoinCodeModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
        <button
          onClick={() => {
            setShowJoinModal(false);
            setJoinCode('');
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Join with Code</h2>
          <p className="text-gray-600">Enter the room code to join an existing study room</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
              maxLength={6}
              disabled={joiningRoom}
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowJoinModal(false);
                setJoinCode('');
              }}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={joiningRoom}
            >
              Cancel
            </button>
            <button
              onClick={joinRoomWithCode}
              disabled={joiningRoom || !joinCode.trim()}
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {joiningRoom ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Join Room</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Compact Create Room Modal
  const CreateRoomModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Create Study Room</h2>
            <button
              onClick={() => {
                setShowCreateModal(false);
                resetCreateForm();
              }}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Name *
            </label>
            <input
              type="text"
              value={newRoom.name}
              onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter room name"
              disabled={creatingRoom}
            />
          </div>

          {/* Subject and Session Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <select
                value={newRoom.subject}
                onChange={(e) => setNewRoom(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={creatingRoom}
              >
                <option value="">Select subject</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Type
              </label>
              <select
                value={newRoom.session_type}
                onChange={(e) => setNewRoom(prev => ({ ...prev, session_type: e.target.value as any }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={creatingRoom}
              >
                {sessionTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Difficulty and Max Participants */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                value={newRoom.difficulty}
                onChange={(e) => setNewRoom(prev => ({ ...prev, difficulty: e.target.value as any }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={creatingRoom}
              >
                {difficulties.map(difficulty => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </option>
                ))}
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
                onChange={(e) => setNewRoom(prev => ({ ...prev, max_participants: parseInt(e.target.value) || 10 }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={creatingRoom}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={newRoom.description}
              onChange={(e) => setNewRoom(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Brief description of the study session"
              disabled={creatingRoom}
            />
          </div>

          {/* Public/Private Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Public Room</h4>
              <p className="text-sm text-gray-600">Anyone can discover and join this room</p>
            </div>
            <button
              onClick={() => setNewRoom(prev => ({ ...prev, is_public: !prev.is_public }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                newRoom.is_public ? 'bg-purple-500' : 'bg-gray-300'
              }`}
              disabled={creatingRoom}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  newRoom.is_public ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-2xl">
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowCreateModal(false);
                resetCreateForm();
              }}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={creatingRoom}
            >
              Cancel
            </button>
            <button
              onClick={createRoom}
              disabled={creatingRoom || !newRoom.name.trim() || !newRoom.subject}
              className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {creatingRoom ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Room</span>
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
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
            <p className="text-gray-600">Join collaborative study sessions with peers</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              <Hash className="w-4 h-4" />
              <span>Join with Code</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
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
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full lg:w-80"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Levels</option>
              {difficulties.map(difficulty => (
                <option key={difficulty} value={difficulty}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </option>
              ))}
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
              className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors font-medium"
            >
              Create First Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => {
              const SessionIcon = getSessionTypeIcon(room.session_type);
              return (
                <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <SessionIcon className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                          {room.name}
                        </h3>
                        <p className="text-sm text-gray-500">{room.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {room.is_public ? (
                        <Globe className="w-4 h-4 text-green-500" title="Public room" />
                      ) : (
                        <Lock className="w-4 h-4 text-gray-400" title="Private room" />
                      )}
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {room.description || 'No description provided'}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(room.difficulty)}`}>
                      {room.difficulty.charAt(0).toUpperCase() + room.difficulty.slice(1)}
                    </span>
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Users className="w-4 h-4" />
                      <span>{room.participant_count || 0}/{room.max_participants}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      by {room.creator_name}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                        {room.room_code}
                      </span>
                      <button className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium">
                        Join
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showJoinModal && <JoinCodeModal />}
      {showCreateModal && <CreateRoomModal />}
    </div>
  );
};

export default StudyRoom;