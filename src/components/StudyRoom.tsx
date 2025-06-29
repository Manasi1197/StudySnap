import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  Share2, 
  Settings, 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  Clock,
  BookOpen,
  Brain,
  Presentation,
  MessageCircle,
  User,
  Crown,
  Shield,
  MoreVertical,
  Copy,
  ExternalLink,
  Edit3,
  Trash2,
  LogOut,
  UserPlus,
  Send,
  Paperclip,
  Smile,
  Hash,
  Key,
  ArrowRight,
  X
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
  user_avatar?: string;
}

interface RoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  message_type: 'text' | 'file' | 'quiz_share' | 'system';
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

interface StudyRoomProps {
  onNavigate?: (page: string) => void;
}

const StudyRoom: React.FC<StudyRoomProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<StudyRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'joined' | 'create'>('browse');
  const [currentView, setCurrentView] = useState<'list' | 'room'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Join by code state
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Create room state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    subject: '',
    difficulty: 'beginner' as const,
    session_type: 'study' as const,
    max_participants: 10,
    is_public: true,
    scheduled_for: ''
  });

  const subjects = [
    'Mathematics', 'Science', 'History', 'Literature', 'Languages', 
    'Computer Science', 'Business', 'Art', 'Music', 'Other'
  ];

  useEffect(() => {
    if (user) {
      loadRooms();
      loadJoinedRooms();
    }
  }, [user]);

  useEffect(() => {
    if (selectedRoom) {
      loadRoomDetails();
      const interval = setInterval(loadRoomDetails, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [selectedRoom]);

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
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const roomsWithDetails = data?.map(room => ({
        ...room,
        creator_name: room.profiles?.full_name || 'Unknown',
        tags: room.tags || []
      })) || [];

      setRooms(roomsWithDetails);
    } catch (error: any) {
      console.error('Error loading rooms:', error);
      toast.error('Failed to load study rooms');
    } finally {
      setLoading(false);
    }
  };

  const loadJoinedRooms = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select(`
          *,
          study_rooms!inner(
            *,
            profiles!study_rooms_created_by_fkey(full_name)
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      const joinedRoomsData = data?.map(participant => ({
        ...participant.study_rooms,
        creator_name: participant.study_rooms.profiles?.full_name || 'Unknown',
        tags: participant.study_rooms.tags || []
      })) || [];

      setJoinedRooms(joinedRoomsData);
    } catch (error: any) {
      console.error('Error loading joined rooms:', error);
      toast.error('Failed to load joined rooms');
    }
  };

  const loadRoomDetails = async () => {
    if (!selectedRoom) return;

    try {
      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles!room_participants_user_id_fkey(full_name, avatar_url)
        `)
        .eq('room_id', selectedRoom.id)
        .eq('is_active', true);

      if (participantsError) throw participantsError;

      const participantsWithDetails = participantsData?.map(participant => ({
        ...participant,
        user_name: participant.profiles?.full_name || 'Unknown',
        user_avatar: participant.profiles?.avatar_url
      })) || [];

      setParticipants(participantsWithDetails);

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('room_messages')
        .select(`
          *,
          profiles!room_messages_user_id_fkey(full_name, avatar_url)
        `)
        .eq('room_id', selectedRoom.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) throw messagesError;

      const messagesWithDetails = messagesData?.map(message => ({
        ...message,
        user_name: message.profiles?.full_name || 'Unknown',
        user_avatar: message.profiles?.avatar_url
      })) || [];

      setMessages(messagesWithDetails);
    } catch (error: any) {
      console.error('Error loading room details:', error);
    }
  };

  const handleJoinRoomByCode = async () => {
    if (!roomCode.trim()) {
      setJoinError('Please enter a room code');
      return;
    }

    setIsJoining(true);
    setJoinError('');

    try {
      // First, find the room by code using our secure function
      const { data: roomId, error: findError } = await supabase
        .rpc('get_joinable_room_id_by_code', { room_code_input: roomCode.trim() });

      if (findError) {
        console.error('Error finding room:', findError);
        setJoinError('Failed to find room. Please check the code and try again.');
        return;
      }

      if (!roomId) {
        setJoinError('Room not found or not available for joining');
        return;
      }

      // Use upsert to handle existing records
      const { error: joinError } = await supabase
        .from('room_participants')
        .upsert({
          room_id: roomId,
          user_id: user?.id,
          role: 'participant',
          is_active: true,
          joined_at: new Date().toISOString()
        }, {
          onConflict: 'room_id,user_id'
        });

      if (joinError) {
        console.error('Error joining room:', joinError);
        setJoinError('Failed to join room. Please try again.');
        return;
      }

      // Success! Clear the form and reload joined rooms
      setRoomCode('');
      setJoinError('');
      toast.success('Successfully joined the room!');
      
      // Reload joined rooms to show the new room
      await loadJoinedRooms();
      
      // Switch to joined rooms tab
      setActiveTab('joined');

    } catch (error: any) {
      console.error('Unexpected error joining room:', error);
      setJoinError('An unexpected error occurred. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const joinRoom = async (room: StudyRoom) => {
    if (!user) return;

    try {
      // Use upsert to handle existing records
      const { error } = await supabase
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

      if (error) throw error;

      toast.success(`Joined ${room.name}!`);
      await loadJoinedRooms();
      setActiveTab('joined');
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
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
          ...createForm,
          created_by: user.id,
          room_code: roomCode,
          tags: []
        })
        .select()
        .single();

      if (error) throw error;

      // Automatically join the created room as host using upsert
      await supabase
        .from('room_participants')
        .upsert({
          room_id: data.id,
          user_id: user.id,
          role: 'host',
          is_active: true,
          joined_at: new Date().toISOString()
        }, {
          onConflict: 'room_id,user_id'
        });

      toast.success('Room created successfully!');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        description: '',
        subject: '',
        difficulty: 'beginner',
        session_type: 'study',
        max_participants: 10,
        is_public: true,
        scheduled_for: ''
      });

      await loadRooms();
      await loadJoinedRooms();
      setActiveTab('joined');
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || !user) return;

    setSendingMessage(true);
    try {
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
      await loadRoomDetails();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
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

      toast.success('Left the room');
      await loadJoinedRooms();
      
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null);
        setCurrentView('list');
      }
    } catch (error: any) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
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

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'study': return <BookOpen className="w-4 h-4" />;
      case 'quiz': return <Brain className="w-4 h-4" />;
      case 'discussion': return <MessageCircle className="w-4 h-4" />;
      case 'presentation': return <Presentation className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

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

  if (currentView === 'room' && selectedRoom) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Room Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setCurrentView('list');
                  setSelectedRoom(null);
                }}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span>Back to Rooms</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{selectedRoom.name}</h1>
                <p className="text-gray-600">{selectedRoom.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>{participants.length}/{selectedRoom.max_participants}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Hash className="w-4 h-4" />
                <span>{selectedRoom.room_code}</span>
              </div>
              <button
                onClick={() => leaveRoom(selectedRoom.id)}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Room</span>
              </button>
            </div>
          </div>
        </div>

        {/* Room Content */}
        <div className="flex h-[calc(100vh-120px)]">
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="flex items-start space-x-3">
                  <img
                    src={message.user_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.user_name || 'User')}&size=32&background=6366f1&color=ffffff`}
                    alt={message.user_name}
                    className="w-8 h-8 rounded-full"
                  />
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

            {/* Message Input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={sendingMessage}
                />
                <button
                  onClick={sendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Participants Sidebar */}
          <div className="w-80 bg-white border-l border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">
              Participants ({participants.length})
            </h3>
            <div className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center space-x-3">
                  <img
                    src={participant.user_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.user_name || 'User')}&size=32&background=6366f1&color=ffffff`}
                    alt={participant.user_name}
                    className="w-8 h-8 rounded-full"
                  />
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
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Create Room</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-8">
        <nav className="flex space-x-8">
          {[
            { id: 'browse', label: 'Browse Rooms', icon: Search },
            { id: 'joined', label: 'My Rooms', icon: Users },
            { id: 'create', label: 'Join by Code', icon: Key }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-8">
        {activeTab === 'browse' && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
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

            {/* Rooms Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading study rooms...</p>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No rooms found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search criteria or create a new room
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Create Your First Room
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRooms.map((room) => (
                  <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        {getSessionTypeIcon(room.session_type)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(room.difficulty)}`}>
                          {room.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Users className="w-4 h-4" />
                        <span>{room.participant_count || 0}/{room.max_participants}</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-gray-900 mb-2">{room.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{room.description}</p>

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span className="font-medium">{room.subject}</span>
                      <span>by {room.creator_name}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Hash className="w-4 h-4" />
                        <span>{room.room_code}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedRoom(room);
                            setCurrentView('room');
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => joinRoom(room)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'joined' && (
          <div>
            {joinedRooms.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No joined rooms</h3>
                <p className="text-gray-600 mb-6">
                  Join a room to start collaborating with other learners
                </p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Browse Rooms
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {joinedRooms.map((room) => (
                  <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        {getSessionTypeIcon(room.session_type)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(room.difficulty)}`}>
                          {room.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Users className="w-4 h-4" />
                        <span>{room.participant_count || 0}/{room.max_participants}</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-gray-900 mb-2">{room.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{room.description}</p>

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span className="font-medium">{room.subject}</span>
                      <span>by {room.creator_name}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Hash className="w-4 h-4" />
                        <span>{room.room_code}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => leaveRoom(room.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                        >
                          Leave
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRoom(room);
                            setCurrentView('room');
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                        >
                          Enter
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Room by Code</h2>
                <p className="text-gray-600">
                  Enter a room code to join an existing study session
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Code
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => {
                        setRoomCode(e.target.value.toUpperCase());
                        setJoinError('');
                      }}
                      placeholder="Enter room code (e.g., ABC123)"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                      maxLength={6}
                      disabled={isJoining}
                    />
                  </div>
                  {joinError && (
                    <p className="mt-2 text-sm text-red-600">{joinError}</p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">How to join a room:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Get the room code from the room creator</li>
                    <li>• Enter the 6-character code above</li>
                    <li>• Click "Join Room" to enter the study session</li>
                    <li>• Only public, active rooms can be joined by code</li>
                  </ul>
                </div>

                <button
                  onClick={handleJoinRoomByCode}
                  disabled={isJoining || !roomCode.trim()}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isJoining ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
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
              <p className="text-gray-600">Set up a new collaborative study session</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter room name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <select
                    value={createForm.subject}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, subject: e.target.value }))}
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
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Describe what this study session is about..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Type
                  </label>
                  <select
                    value={createForm.session_type}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, session_type: e.target.value as any }))}
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
                    value={createForm.max_participants}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={createForm.is_public}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, is_public: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_public" className="text-sm font-medium text-gray-700">
                  Make this room public (others can find and join)
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
      )}
    </div>
  );
};

export default StudyRoom;