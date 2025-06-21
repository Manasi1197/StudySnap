import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Share2, 
  FileText, 
  Clock, 
  Target, 
  Trophy, 
  Settings, 
  Plus, 
  Search, 
  Filter,
  BookOpen,
  Brain,
  Zap,
  Star,
  Calendar,
  MapPin,
  Globe,
  Lock,
  Unlock,
  Crown,
  UserPlus,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  X,
  Check,
  AlertCircle,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Download
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface StudyRoom {
  id: string;
  name: string;
  description: string;
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  max_participants: number;
  current_participants: number;
  is_public: boolean;
  created_by: string;
  created_at: string;
  session_type: 'study' | 'quiz' | 'discussion' | 'presentation';
  tags: string[];
  room_code: string;
  status: 'active' | 'scheduled' | 'ended';
  scheduled_for?: string;
}

interface Participant {
  id: string;
  user_id: string;
  room_id: string;
  role: 'host' | 'moderator' | 'participant';
  joined_at: string;
  is_active: boolean;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  message_type: 'text' | 'file' | 'quiz_share' | 'system';
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

interface StudyRoomProps {
  onBack: () => void;
}

const StudyRoom: React.FC<StudyRoomProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'browse' | 'room' | 'create'>('browse');
  const [studyRooms, setStudyRooms] = useState<StudyRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [studyTimer, setStudyTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState(false);
  const [pomodoroSession, setPomodoroSession] = useState(1);
  const [showParticipants, setShowParticipants] = useState(true);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [sharedQuizzes, setSharedQuizzes] = useState<any[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Subjects for filtering
  const subjects = [
    'Mathematics', 'Science', 'History', 'Literature', 'Computer Science',
    'Physics', 'Chemistry', 'Biology', 'Economics', 'Psychology',
    'Philosophy', 'Art', 'Music', 'Languages', 'Engineering'
  ];

  useEffect(() => {
    loadStudyRooms();
  }, []);

  useEffect(() => {
    if (currentRoom) {
      loadParticipants();
      loadChatMessages();
      loadSharedQuizzes();
      
      // Set up real-time subscriptions
      const participantsSubscription = supabase
        .channel(`room_participants_${currentRoom.id}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${currentRoom.id}` },
          () => loadParticipants()
        )
        .subscribe();

      const chatSubscription = supabase
        .channel(`room_chat_${currentRoom.id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${currentRoom.id}` },
          () => loadChatMessages()
        )
        .subscribe();

      return () => {
        participantsSubscription.unsubscribe();
        chatSubscription.unsubscribe();
      };
    }
  }, [currentRoom]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setStudyTimer(prev => {
          const newTime = prev + 1;
          
          // Pomodoro logic
          if (pomodoroMode) {
            const sessionLength = 25 * 60; // 25 minutes
            const breakLength = 5 * 60; // 5 minutes
            
            if (newTime >= sessionLength && pomodoroSession % 2 === 1) {
              // Work session complete, start break
              toast.success('🍅 Work session complete! Time for a break.');
              setPomodoroSession(prev => prev + 1);
              return 0;
            } else if (newTime >= breakLength && pomodoroSession % 2 === 0) {
              // Break complete, start work
              toast.success('🎯 Break over! Back to studying.');
              setPomodoroSession(prev => prev + 1);
              return 0;
            }
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning, pomodoroMode, pomodoroSession]);

  const loadStudyRooms = async () => {
    try {
      setIsLoading(true);
      
      // First, fetch all study rooms
      const { data: rooms, error: roomsError } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (roomsError) throw roomsError;

      // Then, fetch all active room participants
      const { data: participants, error: participantsError } = await supabase
        .from('room_participants')
        .select('room_id')
        .eq('is_active', true);

      if (participantsError) throw participantsError;

      // Count participants for each room
      const participantCounts: { [key: string]: number } = {};
      participants?.forEach(p => {
        participantCounts[p.room_id] = (participantCounts[p.room_id] || 0) + 1;
      });

      // Combine rooms with participant counts
      const roomsWithCounts = rooms?.map(room => ({
        ...room,
        current_participants: participantCounts[room.id] || 0
      })) || [];

      setStudyRooms(roomsWithCounts);
    } catch (error) {
      console.error('Error loading study rooms:', error);
      toast.error('Failed to load study rooms');
    } finally {
      setIsLoading(false);
    }
  };

  const loadParticipants = async () => {
    if (!currentRoom) return;

    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('room_id', currentRoom.id)
        .eq('is_active', true);

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const loadChatMessages = async () => {
    if (!currentRoom) return;

    try {
      const { data, error } = await supabase
        .from('room_messages')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('room_id', currentRoom.id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setChatMessages(data || []);
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  const loadSharedQuizzes = async () => {
    if (!currentRoom) return;

    try {
      const { data, error } = await supabase
        .from('room_shared_content')
        .select(`
          *,
          quizzes (
            id,
            title,
            description,
            questions,
            flashcards
          )
        `)
        .eq('room_id', currentRoom.id)
        .eq('content_type', 'quiz');

      if (error) throw error;
      setSharedQuizzes(data || []);
    } catch (error) {
      console.error('Error loading shared quizzes:', error);
    }
  };

  const createRoom = async (roomData: any) => {
    if (!user) return;

    try {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data, error } = await supabase
        .from('study_rooms')
        .insert({
          ...roomData,
          created_by: user.id,
          room_code: roomCode,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as host
      await supabase
        .from('room_participants')
        .insert({
          room_id: data.id,
          user_id: user.id,
          role: 'host',
          is_active: true
        });

      toast.success('Study room created successfully!');
      setCurrentRoom({ ...data, current_participants: 1 });
      setCurrentView('room');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create study room');
    }
  };

  const joinRoom = async (room: StudyRoom, code?: string) => {
    if (!user) return;

    try {
      // Check if room requires code
      if (!room.is_public && (!code || code !== room.room_code)) {
        toast.error('Invalid room code');
        return;
      }

      // Check if already in room
      const { data: existing } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (existing) {
        setCurrentRoom(room);
        setCurrentView('room');
        setShowJoinModal(false);
        return;
      }

      // Check room capacity
      if (room.current_participants >= room.max_participants) {
        toast.error('Room is full');
        return;
      }

      // Join room
      await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          role: 'participant',
          is_active: true
        });

      // Add system message
      await supabase
        .from('room_messages')
        .insert({
          room_id: room.id,
          user_id: user.id,
          message: `${user.user_metadata?.full_name || user.email} joined the room`,
          message_type: 'system'
        });

      setCurrentRoom(room);
      setCurrentView('room');
      setShowJoinModal(false);
      toast.success('Joined study room!');
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    }
  };

  const leaveRoom = async () => {
    if (!currentRoom || !user) return;

    try {
      await supabase
        .from('room_participants')
        .update({ is_active: false })
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id);

      // Add system message
      await supabase
        .from('room_messages')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          message: `${user.user_metadata?.full_name || user.email} left the room`,
          message_type: 'system'
        });

      setCurrentRoom(null);
      setCurrentView('browse');
      toast.success('Left study room');
    } catch (error) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentRoom || !user) return;

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
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredRooms = studyRooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubject = selectedSubject === 'all' || room.subject === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'all' || room.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  // Create Room Modal
  const CreateRoomModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      subject: 'Mathematics',
      difficulty: 'intermediate',
      max_participants: 10,
      is_public: true,
      session_type: 'study',
      tags: []
    });

    return (
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
            <p className="text-gray-600">Set up a collaborative learning space</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Room Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Calculus Study Group"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none"
                placeholder="What will you be studying together?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Participants</label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={formData.max_participants}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session Type</label>
                <select
                  value={formData.session_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, session_type: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="study">Study Session</option>
                  <option value="quiz">Quiz Practice</option>
                  <option value="discussion">Discussion</option>
                  <option value="presentation">Presentation</option>
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm text-gray-700">
                  Public room (anyone can join)
                </span>
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
                onClick={() => createRoom(formData)}
                disabled={!formData.name.trim()}
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Join with Code</h2>
          <p className="text-gray-600">Enter the room code to join a private study room</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Room Code</label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
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
              onClick={() => {
                // Find room by code and join
                const room = studyRooms.find(r => r.room_code === joinCode);
                if (room) {
                  joinRoom(room, joinCode);
                } else {
                  toast.error('Room not found');
                }
              }}
              disabled={joinCode.length !== 6}
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
      <div className="min-h-screen bg-gray-50">
        {/* Room Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('browse')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Back to Rooms</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{currentRoom.name}</h1>
                <p className="text-gray-600">{currentRoom.subject} • {participants.length} participants</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {currentRoom.room_code}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentRoom.room_code);
                  toast.success('Room code copied!');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={leaveRoom}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>

        {/* Room Content */}
        <div className="flex h-[calc(100vh-120px)]">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Study Timer & Tools */}
            <div className="bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  {/* Study Timer */}
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl font-mono font-bold text-gray-900">
                      {formatTime(studyTimer)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className={`p-2 rounded-lg transition-colors ${
                          isTimerRunning 
                            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                      >
                        {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => {
                          setStudyTimer(0);
                          setIsTimerRunning(false);
                          setPomodoroSession(1);
                        }}
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Pomodoro Toggle */}
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={pomodoroMode}
                        onChange={(e) => setPomodoroMode(e.target.checked)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Pomodoro Mode</span>
                    </label>
                    {pomodoroMode && (
                      <div className="text-sm text-gray-500">
                        Session {Math.ceil(pomodoroSession / 2)} • {pomodoroSession % 2 === 1 ? 'Work' : 'Break'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Room Tools */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowWhiteboard(!showWhiteboard)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      showWhiteboard 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Whiteboard</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    <Share2 className="w-4 h-4" />
                    <span>Share Screen</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Whiteboard/Content Area */}
            <div className="flex-1 p-6">
              {showWhiteboard ? (
                <div className="bg-white rounded-xl border border-gray-200 h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">Collaborative Whiteboard</h3>
                    <p>Draw, write, and share ideas with your study group</p>
                    <button className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                      Start Drawing
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                  {/* Shared Quizzes */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-900">Shared Quizzes</h3>
                      <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                        <Plus className="w-4 h-4" />
                        <span>Share Quiz</span>
                      </button>
                    </div>
                    <div className="space-y-4">
                      {sharedQuizzes.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No quizzes shared yet</p>
                          <p className="text-sm">Share a quiz to practice together</p>
                        </div>
                      ) : (
                        sharedQuizzes.map((quiz, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <h4 className="font-medium text-gray-900">{quiz.quizzes?.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{quiz.quizzes?.description}</p>
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-xs text-gray-500">
                                {quiz.quizzes?.questions?.length} questions
                              </span>
                              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                                Take Quiz
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Study Resources */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-900">Study Resources</h3>
                      <button className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                        <Plus className="w-4 h-4" />
                        <span>Add Resource</span>
                      </button>
                    </div>
                    <div className="text-center text-gray-500 py-8">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No resources shared yet</p>
                      <p className="text-sm">Upload notes, PDFs, or links to share</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            {/* Participants */}
            <div className="border-b border-gray-200">
              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Participants ({participants.length})</span>
                </div>
                {showParticipants ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showParticipants && (
                <div className="px-4 pb-4 space-y-2">
                  {participants.map(participant => (
                    <div key={participant.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {participant.profiles?.full_name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {participant.profiles?.full_name || 'Unknown User'}
                        </p>
                        <div className="flex items-center space-x-2">
                          {participant.role === 'host' && (
                            <Crown className="w-3 h-3 text-yellow-500" />
                          )}
                          <span className="text-xs text-gray-500 capitalize">{participant.role}</span>
                        </div>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat */}
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Chat</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map(message => (
                  <div key={message.id} className={`${
                    message.message_type === 'system' 
                      ? 'text-center text-sm text-gray-500 italic' 
                      : ''
                  }`}>
                    {message.message_type === 'system' ? (
                      <p>{message.message}</p>
                    ) : (
                      <div className={`${
                        message.user_id === user?.id 
                          ? 'ml-4' 
                          : 'mr-4'
                      }`}>
                        <div className={`p-3 rounded-lg ${
                          message.user_id === user?.id
                            ? 'bg-blue-500 text-white ml-auto max-w-xs'
                            : 'bg-gray-100 text-gray-900 max-w-xs'
                        }`}>
                          {message.user_id !== user?.id && (
                            <p className="text-xs font-medium mb-1 opacity-75">
                              {message.profiles?.full_name || 'Unknown User'}
                            </p>
                          )}
                          <p className="text-sm">{message.message}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 px-3">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Study Rooms</h1>
            <p className="text-gray-600">Join collaborative study sessions with fellow learners</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              <UserPlus className="w-4 h-4" />
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
        <div className="flex items-center space-x-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search study rooms..."
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

      {/* Study Rooms Grid */}
      <div className="p-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading study rooms...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No study rooms found</h3>
            <p className="text-gray-600 mb-6">Be the first to create a study room for your subject</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Create Study Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map(room => (
              <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{room.name}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2">{room.description}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {room.is_public ? (
                      <Globe className="w-4 h-4 text-green-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-1">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-600">{room.subject}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-gray-600 capitalize">{room.difficulty}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {room.current_participants}/{room.max_participants}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {new Date(room.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    room.session_type === 'study' ? 'bg-blue-100 text-blue-800' :
                    room.session_type === 'quiz' ? 'bg-green-100 text-green-800' :
                    room.session_type === 'discussion' ? 'bg-purple-100 text-purple-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {room.session_type}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Active
                  </span>
                </div>

                <button
                  onClick={() => joinRoom(room)}
                  disabled={room.current_participants >= room.max_participants}
                  className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {room.current_participants >= room.max_participants ? 'Room Full' : 'Join Room'}
                </button>
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