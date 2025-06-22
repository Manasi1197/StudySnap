import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  Share2, 
  Settings, 
  UserPlus, 
  Send, 
  Hash, 
  Clock, 
  BookOpen,
  Brain,
  FileText,
  X,
  ExternalLink,
  Play,
  Eye,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  LogOut,
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
  difficulty: string;
  max_participants: number;
  is_public: boolean;
  created_by: string;
  session_type: string;
  tags: string[];
  room_code: string;
  status: string;
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
}

interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  is_active: boolean;
  profiles: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface RoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  message_type: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: any[];
  flashcards: any[];
  created_at: string;
}

interface StudyMaterial {
  id: string;
  title: string;
  content: string;
  file_type: string;
  created_at: string;
}

interface StudyRoomProps {
  onNavigate?: (page: string, data?: any) => void;
}

const StudyRoom: React.FC<StudyRoomProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'browse' | 'room'>('browse');
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [showShareQuiz, setShowShareQuiz] = useState(false);
  const [showShareMaterial, setShowShareMaterial] = useState(false);
  const [userQuizzes, setUserQuizzes] = useState<Quiz[]>([]);
  const [userMaterials, setUserMaterials] = useState<StudyMaterial[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  // Auto-scroll logic with user scroll detection
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNear = scrollHeight - scrollTop - clientHeight < 100;
      setIsNearBottom(isNear);
      
      if (isNear && hasNewMessages) {
        setHasNewMessages(false);
      }
    }
  };

  // Auto-scroll only when user is near bottom and new messages arrive
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom();
      setHasNewMessages(false);
    } else if (messages.length > 0) {
      setHasNewMessages(true);
    }
  }, [messages, isNearBottom]);

  // Load rooms on component mount
  useEffect(() => {
    if (user) {
      loadRooms();
    }
  }, [user]);

  // Set up real-time subscriptions when in a room
  useEffect(() => {
    if (currentRoom && user) {
      loadParticipants();
      loadMessages();
      
      // Subscribe to new messages
      const messagesSubscription = supabase
        .channel(`room-messages-${currentRoom.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'room_messages',
            filter: `room_id=eq.${currentRoom.id}`,
          },
          (payload) => {
            loadMessages(); // Reload messages to get profile data
          }
        )
        .subscribe();

      // Subscribe to participant changes
      const participantsSubscription = supabase
        .channel(`room-participants-${currentRoom.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'room_participants',
            filter: `room_id=eq.${currentRoom.id}`,
          },
          () => {
            loadParticipants();
          }
        )
        .subscribe();

      return () => {
        messagesSubscription.unsubscribe();
        participantsSubscription.unsubscribe();
      };
    }
  }, [currentRoom, user]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (error: any) {
      console.error('Error loading rooms:', error);
      toast.error('Failed to load study rooms');
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    if (!currentRoom) return;

    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('room_id', currentRoom.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setParticipants(data || []);
    } catch (error: any) {
      console.error('Error loading participants:', error);
    }
  };

  const loadMessages = async () => {
    if (!currentRoom) return;

    try {
      const { data, error } = await supabase
        .from('room_messages')
        .select(`
          *,
          profiles (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('room_id', currentRoom.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error loading messages:', error);
    }
  };

  const loadUserQuizzes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('id, title, description, questions, flashcards, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserQuizzes(data || []);
    } catch (error: any) {
      console.error('Error loading user quizzes:', error);
      toast.error('Failed to load your quizzes');
    }
  };

  const loadUserMaterials = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('study_materials')
        .select('id, title, content, file_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserMaterials(data || []);
    } catch (error: any) {
      console.error('Error loading user materials:', error);
      toast.error('Failed to load your materials');
    }
  };

  const joinRoom = async (room: StudyRoom) => {
    if (!user) return;

    try {
      setJoining(true);

      // Check if already a participant
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
            role: 'participant'
          });

        if (error) throw error;

        // Send join message
        await supabase
          .from('room_messages')
          .insert({
            room_id: room.id,
            user_id: user.id,
            message: 'joined the room',
            message_type: 'system'
          });
      }

      setCurrentRoom(room);
      setCurrentView('room');
      toast.success(`Joined ${room.name}`);
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    } finally {
      setJoining(false);
    }
  };

  const leaveRoom = async () => {
    if (!currentRoom || !user) return;

    try {
      // Update participant status to inactive
      const { error } = await supabase
        .from('room_participants')
        .update({ is_active: false })
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Send leave message
      await supabase
        .from('room_messages')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          message: 'left the room',
          message_type: 'system'
        });

      setCurrentRoom(null);
      setCurrentView('browse');
      setParticipants([]);
      setMessages([]);
      toast.success('Left the room');
    } catch (error: any) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  const sendMessage = async () => {
    if (!currentRoom || !user || !newMessage.trim()) return;

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
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const shareQuiz = async (quiz: Quiz) => {
    if (!currentRoom || !user) return;

    try {
      const shareData = {
        type: 'quiz',
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        questionCount: quiz.questions.length,
        flashcardCount: quiz.flashcards.length
      };

      const { error } = await supabase
        .from('room_messages')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          message: JSON.stringify(shareData),
          message_type: 'quiz_share'
        });

      if (error) throw error;
      
      setShowShareQuiz(false);
      toast.success('Quiz shared successfully!');
    } catch (error: any) {
      console.error('Error sharing quiz:', error);
      toast.error('Failed to share quiz');
    }
  };

  const shareMaterial = async (material: StudyMaterial) => {
    if (!currentRoom || !user) return;

    try {
      const shareData = {
        type: 'material',
        id: material.id,
        title: material.title,
        fileType: material.file_type,
        preview: material.content.substring(0, 100) + '...'
      };

      const { error } = await supabase
        .from('room_messages')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          message: JSON.stringify(shareData),
          message_type: 'quiz_share' // Using same type for shared content
        });

      if (error) throw error;
      
      setShowShareMaterial(false);
      toast.success('Material shared successfully!');
    } catch (error: any) {
      console.error('Error sharing material:', error);
      toast.error('Failed to share material');
    }
  };

  const handleSharedResourceClick = (shareData: any) => {
    if (!onNavigate) return;

    if (shareData.type === 'quiz') {
      // Navigate to quiz generator with specific quiz ID
      onNavigate('quiz-generator', { quizId: shareData.id });
    } else if (shareData.type === 'material') {
      // Navigate to materials manager with specific material ID
      onNavigate('materials', { materialId: shareData.id });
    }
  };

  const renderSharedContent = (message: RoomMessage) => {
    try {
      const shareData = JSON.parse(message.message);
      
      if (shareData.type === 'quiz') {
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Shared Quiz</span>
                </div>
                <h4 className="font-bold text-gray-900 mb-1">{shareData.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{shareData.description}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>{shareData.questionCount} questions</span>
                  <span>{shareData.flashcardCount} flashcards</span>
                </div>
              </div>
              <button
                onClick={() => handleSharedResourceClick(shareData)}
                className="flex items-center space-x-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open</span>
              </button>
            </div>
          </div>
        );
      } else if (shareData.type === 'material') {
        return (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">Shared Material</span>
                </div>
                <h4 className="font-bold text-gray-900 mb-1">{shareData.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{shareData.preview}</p>
                <div className="text-xs text-gray-500">
                  Type: {shareData.fileType.toUpperCase()}
                </div>
              </div>
              <button
                onClick={() => handleSharedResourceClick(shareData)}
                className="flex items-center space-x-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open</span>
              </button>
            </div>
          </div>
        );
      }
    } catch (error) {
      return null;
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubject = filterSubject === 'all' || room.subject === filterSubject;
    const matchesDifficulty = filterDifficulty === 'all' || room.difficulty === filterDifficulty;
    
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  const subjects = [...new Set(rooms.map(room => room.subject))];
  const difficulties = ['beginner', 'intermediate', 'advanced'];

  // Share Quiz Modal
  const ShareQuizModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Share a Quiz</h2>
          <button
            onClick={() => setShowShareQuiz(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {userQuizzes.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">You haven't created any quizzes yet.</p>
            <button
              onClick={() => {
                setShowShareQuiz(false);
                if (onNavigate) onNavigate('quiz-generator');
              }}
              className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create Your First Quiz
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {userQuizzes.map((quiz) => (
              <div key={quiz.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">{quiz.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{quiz.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{quiz.questions.length} questions</span>
                      <span>{quiz.flashcards.length} flashcards</span>
                      <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => shareQuiz(quiz)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Share Material Modal
  const ShareMaterialModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Share Study Material</h2>
          <button
            onClick={() => setShowShareMaterial(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {userMaterials.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">You haven't uploaded any study materials yet.</p>
            <button
              onClick={() => {
                setShowShareMaterial(false);
                if (onNavigate) onNavigate('materials');
              }}
              className="mt-4 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Upload Your First Material
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {userMaterials.map((material) => (
              <div key={material.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">{material.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {material.content.substring(0, 100)}...
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Type: {material.file_type.toUpperCase()}</span>
                      <span>{new Date(material.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => shareMaterial(material)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (currentView === 'room' && currentRoom) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        {/* Room Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Room Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{currentRoom.name}</h2>
              <button
                onClick={leaveRoom}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Leave Room"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-4">{currentRoom.description}</p>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded">
                {currentRoom.subject}
              </span>
              <span className="bg-green-100 text-green-600 px-2 py-1 rounded">
                {currentRoom.difficulty}
              </span>
              <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded">
                {currentRoom.session_type}
              </span>
            </div>
          </div>

          {/* Participants */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Participants ({participants.length})
              </h3>
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {participant.profiles.full_name?.charAt(0) || participant.profiles.email.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {participant.profiles.full_name || participant.profiles.email}
                      </p>
                      <div className="flex items-center space-x-1">
                        {participant.role === 'host' && <Crown className="w-3 h-3 text-yellow-500" />}
                        {participant.role === 'moderator' && <Shield className="w-3 h-3 text-blue-500" />}
                        {participant.role === 'participant' && <User className="w-3 h-3 text-gray-400" />}
                        <span className="text-xs text-gray-500 capitalize">{participant.role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <MessageSquare className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-900">Room Chat</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    loadUserQuizzes();
                    setShowShareQuiz(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Brain className="w-4 h-4" />
                  <span>Share Quiz</span>
                </button>
                <button
                  onClick={() => {
                    loadUserMaterials();
                    setShowShareMaterial(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>Share Material</span>
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 space-y-4"
          >
            {messages.map((message) => (
              <div key={message.id} className="flex space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-medium">
                    {message.profiles.full_name?.charAt(0) || message.profiles.email.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {message.profiles.full_name || message.profiles.email}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  {message.message_type === 'system' ? (
                    <p className="text-sm text-gray-500 italic">{message.message}</p>
                  ) : message.message_type === 'quiz_share' ? (
                    <>
                      {renderSharedContent(message)}
                    </>
                  ) : (
                    <p className="text-sm text-gray-700">{message.message}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* New Messages Indicator */}
          {hasNewMessages && !isNearBottom && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
              <button
                onClick={scrollToBottom}
                className="bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
              >
                <span>New messages</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex space-x-4">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showShareQuiz && <ShareQuizModal />}
        {showShareMaterial && <ShareMaterialModal />}
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
              onClick={() => setShowJoinRoom(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Hash className="w-4 h-4" />
              <span>Join with Code</span>
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
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No study rooms found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || filterSubject !== 'all' || filterDifficulty !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Be the first to create a study room!'}
            </p>
            <button
              onClick={() => setShowCreateRoom(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{room.description}</p>
                  </div>
                  {room.is_public && (
                    <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-medium">
                      Public
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 mb-4">
                  <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs">
                    {room.subject}
                  </span>
                  <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded text-xs">
                    {room.difficulty}
                  </span>
                  <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded text-xs">
                    {room.session_type}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className="flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {participants.filter(p => p.room_id === room.id).length}/{room.max_participants}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(room.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => joinRoom(room)}
                    disabled={joining}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {joining ? 'Joining...' : 'Join Room'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyRoom;