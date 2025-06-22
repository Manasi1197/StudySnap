import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  BookOpen, 
  MessageSquare, 
  Video, 
  Settings, 
  UserPlus, 
  LogOut, 
  Crown, 
  Shield, 
  MoreVertical, 
  Send, 
  Paperclip, 
  Smile, 
  Hash, 
  Lock, 
  Globe, 
  Calendar, 
  MapPin, 
  Star, 
  TrendingUp, 
  Eye, 
  Copy, 
  Share2, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  X, 
  ArrowRight, 
  Zap, 
  Target, 
  Brain, 
  Lightbulb,
  ChevronRight,
  Timer,
  Award,
  Bookmark,
  Heart,
  ThumbsUp
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
  is_joined?: boolean;
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

interface Message {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  message_type: 'text' | 'file' | 'quiz_share' | 'system';
  created_at: string;
  user_name?: string;
}

interface StudyRoomProps {
  onNavigate?: (page: string) => void;
}

const StudyRoom: React.FC<StudyRoomProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'browse' | 'my-rooms' | 'room-detail' | 'create'>('browse');
  const [studyRooms, setStudyRooms] = useState<StudyRoom[]>([]);
  const [myRooms, setMyRooms] = useState<StudyRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState<string | null>(null);

  // Create room form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    subject: '',
    difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    max_participants: 10,
    is_public: true,
    session_type: 'study' as 'study' | 'quiz' | 'discussion' | 'presentation',
    tags: [] as string[],
    scheduled_for: ''
  });

  const subjects = [
    'Mathematics', 'Science', 'History', 'Literature', 'Languages', 
    'Computer Science', 'Business', 'Art', 'Music', 'Philosophy', 'Other'
  ];

  useEffect(() => {
    if (user) {
      loadStudyRooms();
      loadMyRooms();
    }
  }, [user]);

  useEffect(() => {
    if (selectedRoom) {
      loadRoomDetails();
      loadMessages();
      // Set up real-time subscriptions
      const messagesSubscription = supabase
        .channel(`room-messages-${selectedRoom.id}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${selectedRoom.id}` },
          () => loadMessages()
        )
        .subscribe();

      const participantsSubscription = supabase
        .channel(`room-participants-${selectedRoom.id}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${selectedRoom.id}` },
          () => loadRoomDetails()
        )
        .subscribe();

      return () => {
        messagesSubscription.unsubscribe();
        participantsSubscription.unsubscribe();
      };
    }
  }, [selectedRoom]);

  const loadStudyRooms = async () => {
    try {
      setLoading(true);
      
      // Load public study rooms with creator info and participant count
      const { data, error } = await supabase
        .from('study_rooms')
        .select(`
          *,
          profiles!study_rooms_created_by_fkey(full_name),
          room_participants(count)
        `)
        .eq('is_public', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process the data to include creator name and participant count
      const processedRooms = data?.map(room => ({
        ...room,
        creator_name: room.profiles?.full_name || 'Unknown',
        participant_count: room.room_participants?.[0]?.count || 0,
        is_joined: false // Will be updated below
      })) || [];

      // Check which rooms the user has joined
      if (user) {
        const { data: joinedRooms } = await supabase
          .from('room_participants')
          .select('room_id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        const joinedRoomIds = new Set(joinedRooms?.map(r => r.room_id) || []);
        
        processedRooms.forEach(room => {
          room.is_joined = joinedRoomIds.has(room.id);
        });
      }

      setStudyRooms(processedRooms);
    } catch (error: any) {
      console.error('Error loading study rooms:', error);
      toast.error('Failed to load study rooms');
    } finally {
      setLoading(false);
    }
  };

  const loadMyRooms = async () => {
    if (!user) return;

    try {
      // Load rooms created by user and rooms they've joined
      const [createdRooms, joinedRooms] = await Promise.all([
        supabase
          .from('study_rooms')
          .select(`
            *,
            profiles!study_rooms_created_by_fkey(full_name),
            room_participants(count)
          `)
          .eq('created_by', user.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('room_participants')
          .select(`
            room_id,
            study_rooms!inner(
              *,
              profiles!study_rooms_created_by_fkey(full_name),
              room_participants(count)
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
      ]);

      if (createdRooms.error) throw createdRooms.error;
      if (joinedRooms.error) throw joinedRooms.error;

      // Process created rooms
      const processedCreatedRooms = createdRooms.data?.map(room => ({
        ...room,
        creator_name: room.profiles?.full_name || 'You',
        participant_count: room.room_participants?.[0]?.count || 0,
        is_joined: true
      })) || [];

      // Process joined rooms
      const processedJoinedRooms = joinedRooms.data?.map(item => ({
        ...item.study_rooms,
        creator_name: item.study_rooms.profiles?.full_name || 'Unknown',
        participant_count: item.study_rooms.room_participants?.[0]?.count || 0,
        is_joined: true
      })) || [];

      // Combine and deduplicate
      const allMyRooms = [...processedCreatedRooms];
      processedJoinedRooms.forEach(room => {
        if (!allMyRooms.find(r => r.id === room.id)) {
          allMyRooms.push(room);
        }
      });

      setMyRooms(allMyRooms);
    } catch (error: any) {
      console.error('Error loading my rooms:', error);
      toast.error('Failed to load your rooms');
    }
  };

  const loadRoomDetails = async () => {
    if (!selectedRoom) return;

    try {
      // Load participants with user info
      const { data: participantsData, error } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles!room_participants_user_id_fkey(full_name)
        `)
        .eq('room_id', selectedRoom.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      const processedParticipants = participantsData?.map(p => ({
        ...p,
        user_name: p.profiles?.full_name || 'Unknown User'
      })) || [];

      setParticipants(processedParticipants);
    } catch (error: any) {
      console.error('Error loading room details:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedRoom) return;

    try {
      const { data, error } = await supabase
        .from('room_messages')
        .select(`
          *,
          profiles!room_messages_user_id_fkey(full_name)
        `)
        .eq('room_id', selectedRoom.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      const processedMessages = data?.map(m => ({
        ...m,
        user_name: m.profiles?.full_name || 'Unknown User'
      })) || [];

      setMessages(processedMessages);
    } catch (error: any) {
      console.error('Error loading messages:', error);
    }
  };

  const joinRoom = async (room: StudyRoom) => {
    if (!user) return;

    try {
      setJoiningRoom(room.id);

      // Check if already joined
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (existingParticipant) {
        toast.success('You are already in this room!');
        setSelectedRoom(room);
        setActiveView('room-detail');
        return;
      }

      // Check room capacity
      const { count } = await supabase
        .from('room_participants')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id)
        .eq('is_active', true);

      if (count && count >= room.max_participants) {
        toast.error('This room is full');
        return;
      }

      // Join the room
      const { error } = await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          role: 'participant'
        });

      if (error) throw error;

      toast.success(`Joined "${room.name}" successfully!`);
      
      // Update room state
      setStudyRooms(prev => prev.map(r => 
        r.id === room.id ? { ...r, is_joined: true, participant_count: (r.participant_count || 0) + 1 } : r
      ));

      // Navigate to room
      setSelectedRoom({ ...room, is_joined: true });
      setActiveView('room-detail');
      
      // Reload my rooms
      loadMyRooms();
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    } finally {
      setJoiningRoom(null);
    }
  };

  const joinRoomByCode = async () => {
    if (!user || !roomCodeInput.trim()) return;

    try {
      // Find room by code
      const { data: room, error } = await supabase
        .from('study_rooms')
        .select(`
          *,
          profiles!study_rooms_created_by_fkey(full_name)
        `)
        .eq('room_code', roomCodeInput.trim().toUpperCase())
        .eq('status', 'active')
        .single();

      if (error || !room) {
        toast.error('Room not found. Please check the room code.');
        return;
      }

      const roomWithDetails = {
        ...room,
        creator_name: room.profiles?.full_name || 'Unknown',
        participant_count: 0,
        is_joined: false
      };

      await joinRoom(roomWithDetails);
      setRoomCodeInput('');
      setShowJoinModal(false);
    } catch (error: any) {
      console.error('Error joining room by code:', error);
      toast.error('Failed to join room');
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
      
      // Update state
      setStudyRooms(prev => prev.map(r => 
        r.id === roomId ? { ...r, is_joined: false, participant_count: Math.max(0, (r.participant_count || 1) - 1) } : r
      ));
      
      // If currently in this room, go back to browse
      if (selectedRoom?.id === roomId) {
        setActiveView('browse');
        setSelectedRoom(null);
      }
      
      loadMyRooms();
    } catch (error: any) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedRoom || !newMessage.trim()) return;

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
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const createRoom = async () => {
    if (!user) return;

    try {
      // Generate room code
      const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();

      const { data, error } = await supabase
        .from('study_rooms')
        .insert({
          ...createForm,
          created_by: user.id,
          room_code: roomCode,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-join the creator
      await supabase
        .from('room_participants')
        .insert({
          room_id: data.id,
          user_id: user.id,
          role: 'host'
        });

      toast.success('Study room created successfully!');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        description: '',
        subject: '',
        difficulty: 'intermediate',
        max_participants: 10,
        is_public: true,
        session_type: 'study',
        tags: [],
        scheduled_for: ''
      });

      // Reload rooms
      loadStudyRooms();
      loadMyRooms();
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
    }
  };

  // Filter rooms based on search and filters
  const filteredRooms = studyRooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      case 'study': return <BookOpen className="w-4 h-4" />;
      case 'quiz': return <Brain className="w-4 h-4" />;
      case 'discussion': return <MessageSquare className="w-4 h-4" />;
      case 'presentation': return <Video className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

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
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
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
              placeholder="Describe what this room is for..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
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

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={createForm.is_public}
                onChange={(e) => setCreateForm(prev => ({ ...prev, is_public: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Make room public</span>
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

  // Join by Code Modal
  const JoinByCodeModal = () => (
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Join by Room Code</h2>
          <p className="text-gray-600">Enter the 6-character room code to join</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Code
            </label>
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
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
              disabled={roomCodeInput.length !== 6}
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

  // Room Detail View
  if (activeView === 'room-detail' && selectedRoom) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Room Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveView('browse')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Rooms
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedRoom.name}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{participants.length}/{selectedRoom.max_participants}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    {getSessionTypeIcon(selectedRoom.session_type)}
                    <span className="capitalize">{selectedRoom.session_type}</span>
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(selectedRoom.difficulty)}`}>
                    {selectedRoom.difficulty}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedRoom.room_code);
                  toast.success('Room code copied!');
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>Code: {selectedRoom.room_code}</span>
              </button>
              <button
                onClick={() => leaveRoom(selectedRoom.id)}
                className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Room</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100vh-120px)]">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="flex space-x-3">
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

            {/* Message Input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Type a message..."
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

          {/* Participants Sidebar */}
          <div className="w-80 bg-white border-l border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Participants ({participants.length})</h3>
            <div className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {participant.user_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{participant.user_name}</p>
                    <div className="flex items-center space-x-1">
                      {participant.role === 'host' && <Crown className="w-3 h-3 text-yellow-500" />}
                      {participant.role === 'moderator' && <Shield className="w-3 h-3 text-blue-500" />}
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
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
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

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-8">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveView('browse')}
            className={`py-4 border-b-2 transition-colors ${
              activeView === 'browse'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Browse Rooms
          </button>
          <button
            onClick={() => setActiveView('my-rooms')}
            className={`py-4 border-b-2 transition-colors ${
              activeView === 'my-rooms'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Rooms ({myRooms.length})
          </button>
        </nav>
      </div>

      {/* Filters */}
      {activeView === 'browse' && (
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
            <button
              onClick={loadStudyRooms}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-8">
        {activeView === 'browse' && (
          <div>
            {filteredRooms.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No study rooms found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || selectedSubject !== 'all' || selectedDifficulty !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Be the first to create a study room!'
                  }
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Create First Room
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
                      <div className="flex items-center space-x-1">
                        {getSessionTypeIcon(room.session_type)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 mb-4">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        {room.subject}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(room.difficulty)}`}>
                        {room.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{room.participant_count}/{room.max_participants}</span>
                      </span>
                      <span>by {room.creator_name}</span>
                    </div>

                    <div className="flex space-x-2">
                      {room.is_joined ? (
                        <>
                          <button
                            onClick={() => {
                              setSelectedRoom(room);
                              setActiveView('room-detail');
                            }}
                            className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                          >
                            Enter Room
                          </button>
                          <button
                            onClick={() => leaveRoom(room.id)}
                            className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => joinRoom(room)}
                          disabled={joiningRoom === room.id || room.participant_count >= room.max_participants}
                          className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          {joiningRoom === room.id ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Joining...</span>
                            </>
                          ) : room.participant_count >= room.max_participants ? (
                            <span>Room Full</span>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              <span>Join Room</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'my-rooms' && (
          <div>
            {myRooms.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No rooms yet</h3>
                <p className="text-gray-600 mb-6">
                  Create your first study room or join existing ones
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    Create Room
                  </button>
                  <button
                    onClick={() => setActiveView('browse')}
                    className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Browse Rooms
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myRooms.map((room) => (
                  <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-bold text-gray-900">{room.name}</h3>
                          {room.created_by === user?.id && (
                            <Crown className="w-4 h-4 text-yellow-500" title="You created this room" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{room.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 mb-4">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        {room.subject}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(room.difficulty)}`}>
                        {room.difficulty}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        room.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {room.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{room.participant_count}/{room.max_participants}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Hash className="w-3 h-3" />
                        <span>{room.room_code}</span>
                      </span>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedRoom(room);
                          setActiveView('room-detail');
                        }}
                        className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                      >
                        Enter Room
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(room.room_code);
                          toast.success('Room code copied!');
                        }}
                        className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Copy room code"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && <CreateRoomModal />}
      {showJoinModal && <JoinByCodeModal />}
    </div>
  );
};

export default StudyRoom;