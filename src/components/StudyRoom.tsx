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
  LogOut,
  UserPlus,
  Copy,
  Eye,
  Calendar,
  MapPin,
  Star,
  Hash,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  RefreshCw,
  Globe,
  Lock,
  Crown,
  Shield,
  User
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

interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: 'host' | 'moderator' | 'participant';
  joined_at: string;
  is_active: boolean;
  user_name?: string;
}

interface StudyRoomProps {
  onNavigate?: (page: string) => void;
}

const StudyRoom: React.FC<StudyRoomProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'browse' | 'my-rooms' | 'room-detail' | 'create-room'>('browse');
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [myRooms, setMyRooms] = useState<StudyRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);
  const [roomParticipants, setRoomParticipants] = useState<RoomParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedSessionType, setSelectedSessionType] = useState<string>('all');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state for creating rooms
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
    'Physics', 'Chemistry', 'Biology', 'Economics', 'Psychology',
    'Art', 'Music', 'Languages', 'Philosophy', 'Engineering'
  ];

  const difficulties = ['beginner', 'intermediate', 'advanced'];
  const sessionTypes = ['study', 'quiz', 'discussion', 'presentation'];

  useEffect(() => {
    if (user) {
      loadRooms();
      loadMyRooms();
    }
  }, [user]);

  const loadRooms = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load public rooms with creator info and participant counts
      const { data: roomsData, error: roomsError } = await supabase
        .from('study_rooms')
        .select(`
          *,
          profiles!study_rooms_created_by_fkey(full_name),
          room_participants(count)
        `)
        .eq('is_public', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (roomsError) throw roomsError;

      // Check which rooms the user is already participating in
      const { data: participantData, error: participantError } = await supabase
        .from('room_participants')
        .select('room_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (participantError) throw participantError;

      const participantRooms = new Map(participantData.map(p => [p.room_id, p.role]));

      const processedRooms = roomsData.map(room => ({
        ...room,
        creator_name: room.profiles?.full_name || 'Unknown',
        participant_count: room.room_participants?.[0]?.count || 0,
        is_participant: participantRooms.has(room.id),
        user_role: participantRooms.get(room.id) || null
      }));

      setRooms(processedRooms);
    } catch (error: any) {
      console.error('Error loading rooms:', error);
      toast.error('Failed to load study rooms');
    } finally {
      setLoading(false);
    }
  };

  const loadMyRooms = async () => {
    if (!user) return;

    try {
      // Load rooms created by user or where user is a participant
      const { data: myRoomsData, error } = await supabase
        .from('study_rooms')
        .select(`
          *,
          profiles!study_rooms_created_by_fkey(full_name),
          room_participants!inner(user_id, role, is_active)
        `)
        .or(`created_by.eq.${user.id},room_participants.user_id.eq.${user.id}`)
        .eq('room_participants.is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedMyRooms = myRoomsData.map(room => ({
        ...room,
        creator_name: room.profiles?.full_name || 'Unknown',
        is_participant: true,
        user_role: room.created_by === user.id ? 'host' : room.room_participants?.[0]?.role || 'participant'
      }));

      setMyRooms(processedMyRooms);
    } catch (error: any) {
      console.error('Error loading my rooms:', error);
      toast.error('Failed to load your rooms');
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!user) return;

    try {
      setJoiningRoom(true);

      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      if (existingParticipant) {
        if (existingParticipant.is_active) {
          toast.error('You are already a participant in this room');
          return;
        } else {
          // Reactivate participation
          const { error } = await supabase
            .from('room_participants')
            .update({ is_active: true, joined_at: new Date().toISOString() })
            .eq('id', existingParticipant.id);

          if (error) throw error;
        }
      } else {
        // Add new participant
        const { error } = await supabase
          .from('room_participants')
          .insert({
            room_id: roomId,
            user_id: user.id,
            role: 'participant',
            is_active: true
          });

        if (error) throw error;
      }

      toast.success('Successfully joined the study room!');
      await loadRooms();
      await loadMyRooms();
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room: ' + error.message);
    } finally {
      setJoiningRoom(false);
    }
  };

  const joinRoomByCode = async () => {
    if (!user || !joinRoomCode.trim()) return;

    try {
      setJoiningRoom(true);

      // Find room by code
      const { data: room, error: roomError } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('room_code', joinRoomCode.trim().toUpperCase())
        .eq('status', 'active')
        .single();

      if (roomError || !room) {
        toast.error('Room not found. Please check the room code.');
        return;
      }

      await joinRoom(room.id);
      setShowJoinModal(false);
      setJoinRoomCode('');
    } catch (error: any) {
      console.error('Error joining room by code:', error);
      toast.error('Failed to join room');
    } finally {
      setJoiningRoom(false);
    }
  };

  const leaveRoom = async (roomId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('room_participants')
        .update({ is_active: false })
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Left the study room');
      await loadRooms();
      await loadMyRooms();
      
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null);
        setCurrentView('browse');
      }
    } catch (error: any) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  const createRoom = async () => {
    if (!user) return;

    try {
      // Generate unique room code
      const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();

      const { data, error } = await supabase
        .from('study_rooms')
        .insert({
          ...newRoom,
          created_by: user.id,
          room_code: roomCode,
          status: newRoom.scheduled_for ? 'scheduled' : 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as host participant
      await supabase
        .from('room_participants')
        .insert({
          room_id: data.id,
          user_id: user.id,
          role: 'host',
          is_active: true
        });

      toast.success(`Room created! Room code: ${roomCode}`);
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
      await loadMyRooms();
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
    }
  };

  const viewRoomDetails = async (room: StudyRoom) => {
    setSelectedRoom(room);
    setCurrentView('room-detail');

    // Load participants
    try {
      const { data: participants, error } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq('room_id', room.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      const processedParticipants = participants.map(p => ({
        ...p,
        user_name: p.profiles?.full_name || p.profiles?.email || 'Unknown User'
      }));

      setRoomParticipants(processedParticipants);
    } catch (error: any) {
      console.error('Error loading participants:', error);
    }
  };

  const copyRoomCode = (roomCode: string) => {
    navigator.clipboard.writeText(roomCode);
    toast.success('Room code copied to clipboard!');
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubject = selectedSubject === 'all' || room.subject === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'all' || room.difficulty === selectedDifficulty;
    const matchesSessionType = selectedSessionType === 'all' || room.session_type === selectedSessionType;
    
    return matchesSearch && matchesSubject && matchesDifficulty && matchesSessionType;
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
      case 'study': return <BookOpen className="w-4 h-4" />;
      case 'quiz': return <Users className="w-4 h-4" />;
      case 'discussion': return <MessageSquare className="w-4 h-4" />;
      case 'presentation': return <Eye className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'host': return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'moderator': return <Shield className="w-4 h-4 text-blue-600" />;
      default: return <User className="w-4 h-4 text-gray-600" />;
    }
  };

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
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Study Room</h2>
          <p className="text-gray-600">Enter the room code to join an existing study room</p>
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
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
              placeholder="ABC123"
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
              disabled={joiningRoom || !joinRoomCode.trim()}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {joiningRoom ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Join Room</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Create Room Modal
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
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Study Room</h2>
          <p className="text-gray-600">Set up a new study room for collaborative learning</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Room Name</label>
              <input
                type="text"
                value={newRoom.name}
                onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Advanced Calculus Study Group"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={newRoom.subject}
                onChange={(e) => setNewRoom(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={newRoom.description}
              onChange={(e) => setNewRoom(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              placeholder="Describe what this study room is about..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
              <select
                value={newRoom.difficulty}
                onChange={(e) => setNewRoom(prev => ({ ...prev, difficulty: e.target.value as any }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {difficulties.map(difficulty => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Session Type</label>
              <select
                value={newRoom.session_type}
                onChange={(e) => setNewRoom(prev => ({ ...prev, session_type: e.target.value as any }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {sessionTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Participants</label>
              <input
                type="number"
                value={newRoom.max_participants}
                onChange={(e) => setNewRoom(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                min="2"
                max="100"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={newRoom.is_public}
                onChange={(e) => setNewRoom(prev => ({ ...prev, is_public: e.target.checked }))}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="ml-2 text-sm text-gray-700">Make room public</span>
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
              className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Room
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

  // Room Detail View
  if (currentView === 'room-detail' && selectedRoom) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('browse')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span>Back to Rooms</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{selectedRoom.name}</h1>
                <p className="text-gray-600">{selectedRoom.subject} • {selectedRoom.session_type}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => copyRoomCode(selectedRoom.room_code)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>{selectedRoom.room_code}</span>
              </button>
              {selectedRoom.is_participant ? (
                <button
                  onClick={() => leaveRoom(selectedRoom.id)}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Leave Room</span>
                </button>
              ) : (
                <button
                  onClick={() => joinRoom(selectedRoom.id)}
                  disabled={joiningRoom}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {joiningRoom ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>Join Room</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Room Content */}
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Room Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Room Information</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">{selectedRoom.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Difficulty:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(selectedRoom.difficulty)}`}>
                        {selectedRoom.difficulty}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Session Type:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900 flex items-center">
                        {getSessionTypeIcon(selectedRoom.session_type)}
                        <span className="ml-1">{selectedRoom.session_type}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Created by:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">{selectedRoom.creator_name}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Visibility:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900 flex items-center">
                        {selectedRoom.is_public ? <Globe className="w-4 h-4 mr-1" /> : <Lock className="w-4 h-4 mr-1" />}
                        {selectedRoom.is_public ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat/Messages would go here */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Room Chat</h2>
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Chat functionality coming soon!</p>
                </div>
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Participants ({roomParticipants.length}/{selectedRoom.max_participants})
                </h2>
                <div className="space-y-3">
                  {roomParticipants.map(participant => (
                    <div key={participant.id} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        {getRoleIcon(participant.role)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{participant.user_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{participant.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Room Actions */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <button className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                    <Share2 className="w-5 h-5 text-blue-500" />
                    <span className="font-medium text-gray-900">Share Content</span>
                  </button>
                  <button className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                    <Calendar className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-gray-900">Schedule Session</span>
                  </button>
                  <button className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                    <Settings className="w-5 h-5 text-gray-500" />
                    <span className="font-medium text-gray-900">Room Settings</span>
                  </button>
                </div>
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
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              <Hash className="w-4 h-4" />
              <span>Join by Code</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Create Room</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-8">
        <div className="flex space-x-8">
          <button
            onClick={() => setCurrentView('browse')}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              currentView === 'browse'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Browse Rooms ({rooms.length})
          </button>
          <button
            onClick={() => setCurrentView('my-rooms')}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              currentView === 'my-rooms'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Rooms ({myRooms.length})
          </button>
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
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
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
              {difficulties.map(difficulty => (
                <option key={difficulty} value={difficulty}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={selectedSessionType}
              onChange={(e) => setSelectedSessionType(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {sessionTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSubject('all');
                setSelectedDifficulty('all');
                setSelectedSessionType('all');
              }}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {currentView === 'browse' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map(room => (
              <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {room.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {room.description}
                    </p>
                  </div>
                  {room.is_participant && (
                    <div className="ml-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Subject:</span>
                    <span className="font-medium text-gray-900">{room.subject}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Difficulty:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(room.difficulty)}`}>
                      {room.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Participants:</span>
                    <span className="font-medium text-gray-900">
                      {room.participant_count}/{room.max_participants}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Created by:</span>
                    <span className="font-medium text-gray-900">{room.creator_name}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-4">
                  <div className="flex items-center space-x-1">
                    {getSessionTypeIcon(room.session_type)}
                    <span className="text-xs text-gray-600 capitalize">{room.session_type}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {room.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    <span className="text-xs text-gray-600">{room.is_public ? 'Public' : 'Private'}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => viewRoomDetails(room)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                  {room.is_participant ? (
                    <button
                      onClick={() => leaveRoom(room.id)}
                      className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Leave</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => joinRoom(room.id)}
                      disabled={joiningRoom || room.participant_count >= room.max_participants}
                      className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {joiningRoom ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      <span>Join</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myRooms.map(room => (
              <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {room.name}
                      </h3>
                      {getRoleIcon(room.user_role || 'participant')}
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {room.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Subject:</span>
                    <span className="font-medium text-gray-900">{room.subject}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Role:</span>
                    <span className="font-medium text-gray-900 capitalize">{room.user_role}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Room Code:</span>
                    <button
                      onClick={() => copyRoomCode(room.room_code)}
                      className="font-mono text-sm bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      {room.room_code}
                    </button>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => viewRoomDetails(room)}
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Enter</span>
                  </button>
                  <button
                    onClick={() => copyRoomCode(room.room_code)}
                    className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty States */}
        {currentView === 'browse' && filteredRooms.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No study rooms found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedSubject !== 'all' || selectedDifficulty !== 'all' || selectedSessionType !== 'all'
                ? 'Try adjusting your search filters'
                : 'Be the first to create a study room!'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              Create Study Room
            </button>
          </div>
        )}

        {currentView === 'my-rooms' && myRooms.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No rooms yet</h3>
            <p className="text-gray-600 mb-6">
              Create or join study rooms to start collaborating with other learners
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Create Room
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Join by Code
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showJoinModal && <JoinRoomModal />}
      {showCreateModal && <CreateRoomModal />}
    </div>
  );
};

export default StudyRoom;