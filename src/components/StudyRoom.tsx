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
  Crown,
  Shield,
  User,
  Hash,
  Globe,
  Lock,
  Calendar,
  Target,
  Zap,
  X,
  ChevronDown,
  LogOut,
  Copy,
  ExternalLink,
  FileText,
  Brain,
  Volume2,
  Play
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

interface UserResource {
  id: string;
  title: string;
  type: 'quiz' | 'material' | 'flashcard_set';
  created_at: string;
}

interface StudyRoomProps {
  onNavigate?: (page: string) => void;
}

const StudyRoom: React.FC<StudyRoomProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'browse' | 'create' | 'room' | 'join'>('browse');
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  
  // Current room state
  const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null);
  const [roomParticipants, setRoomParticipants] = useState<RoomParticipant[]>([]);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userResources, setUserResources] = useState<UserResource[]>([]);
  const [showResourceShare, setShowResourceShare] = useState(false);

  // Join room state
  const [joinRoomCode, setJoinRoomCode] = useState('');

  // Create room form state
  const [createRoomForm, setCreateRoomForm] = useState({
    name: '',
    description: '',
    subject: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    max_participants: 10,
    is_public: true,
    tags: [] as string[]
  });

  const subjects = ['Math', 'Science', 'History', 'English', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics', 'Psychology', 'Other'];

  useEffect(() => {
    if (user) {
      loadRooms();
      loadUserResources();
    }
  }, [user]);

  const loadRooms = async () => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get rooms with participant counts
      const { data: roomsData, error: roomsError } = await supabase
        .from('study_rooms')
        .select(`
          *,
          profiles!study_rooms_created_by_fkey(full_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (roomsError) {
        console.error('Error loading rooms:', roomsError);
        throw roomsError;
      }

      // Get participant counts for each room
      const roomsWithCounts = await Promise.all(
        (roomsData || []).map(async (room) => {
          try {
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
          } catch (error) {
            console.error(`Error getting participant count for room ${room.id}:`, error);
            return {
              ...room,
              participant_count: 0,
              creator_name: room.profiles?.full_name || 'Unknown'
            };
          }
        })
      );

      setRooms(roomsWithCounts);
    } catch (error: any) {
      console.error('Error loading rooms:', error);
      if (error.message?.includes('Failed to fetch')) {
        toast.error('Network connection issue. Please check your internet connection.');
      } else {
        toast.error('Failed to load study rooms. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUserResources = async () => {
    if (!user || !supabase) {
      console.error('User not authenticated or Supabase client not initialized');
      return;
    }

    try {
      const resources: UserResource[] = [];

      // Load quizzes
      try {
        const { data: quizzes, error: quizzesError } = await supabase
          .from('quizzes')
          .select('id, title, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (quizzesError) {
          console.error('Error loading quizzes:', quizzesError);
        } else if (quizzes) {
          resources.push(...quizzes.map(quiz => ({
            id: quiz.id,
            title: quiz.title,
            type: 'quiz' as const,
            created_at: quiz.created_at
          })));
        }
      } catch (error) {
        console.error('Failed to load quizzes:', error);
      }

      // Load study materials
      try {
        const { data: materials, error: materialsError } = await supabase
          .from('study_materials')
          .select('id, title, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (materialsError) {
          console.error('Error loading materials:', materialsError);
        } else if (materials) {
          resources.push(...materials.map(material => ({
            id: material.id,
            title: material.title,
            type: 'material' as const,
            created_at: material.created_at
          })));
        }
      } catch (error) {
        console.error('Failed to load materials:', error);
      }

      // Load flashcard sets
      try {
        const { data: flashcards, error: flashcardsError } = await supabase
          .from('flashcard_sets')
          .select('id, title, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (flashcardsError) {
          console.error('Error loading flashcards:', flashcardsError);
        } else if (flashcards) {
          resources.push(...flashcards.map(flashcard => ({
            id: flashcard.id,
            title: flashcard.title,
            type: 'flashcard_set' as const,
            created_at: flashcard.created_at
          })));
        }
      } catch (error) {
        console.error('Failed to load flashcards:', error);
      }

      // Sort all resources by creation date
      resources.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setUserResources(resources);
    } catch (error: any) {
      console.error('Error loading user resources:', error);
      // Don't show error toast for resource loading failures as it's not critical
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
          name: createRoomForm.name,
          description: createRoomForm.description,
          subject: createRoomForm.subject,
          difficulty: createRoomForm.difficulty,
          max_participants: createRoomForm.max_participants,
          is_public: createRoomForm.is_public,
          created_by: user.id,
          session_type: 'study', // Default session type
          tags: createRoomForm.tags,
          room_code: roomCode,
          status: 'active'
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
          role: 'host'
        });

      toast.success('Study room created successfully!');
      setShowCreateForm(false);
      setCreateRoomForm({
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
      toast.error('Failed to create room. Please try again.');
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!user) return;

    try {
      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      if (existingParticipant) {
        // User is already a participant, just enter the room
        const room = rooms.find(r => r.id === roomId);
        if (room) {
          setCurrentRoom(room);
          setCurrentView('room');
          loadRoomData(roomId);
        }
        return;
      }

      // Add user as participant
      const { error } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomId,
          user_id: user.id,
          role: 'participant'
        });

      if (error) throw error;

      // Enter the room
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        setCurrentRoom(room);
        setCurrentView('room');
        loadRoomData(roomId);
        toast.success(`Joined ${room.name}!`);
      }
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room. Please try again.');
    }
  };

  const joinRoomByCode = async () => {
    if (!user || !joinRoomCode.trim()) return;

    try {
      // Find room by code
      const { data: room, error: roomError } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('room_code', joinRoomCode.toUpperCase())
        .eq('status', 'active')
        .single();

      if (roomError || !room) {
        toast.error('Room not found. Please check the room code.');
        return;
      }

      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      if (!existingParticipant) {
        // Add user as participant
        const { error } = await supabase
          .from('room_participants')
          .insert({
            room_id: room.id,
            user_id: user.id,
            role: 'participant'
          });

        if (error) throw error;
      }

      // Enter the room
      setCurrentRoom(room);
      setCurrentView('room');
      setShowJoinForm(false);
      setJoinRoomCode('');
      loadRoomData(room.id);
      toast.success(`Joined ${room.name}!`);
    } catch (error: any) {
      console.error('Error joining room by code:', error);
      toast.error('Failed to join room. Please try again.');
    }
  };

  const loadRoomData = async (roomId: string) => {
    try {
      // Load participants
      const { data: participants, error: participantsError } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles!room_participants_user_id_fkey(full_name)
        `)
        .eq('room_id', roomId)
        .eq('is_active', true);

      if (participantsError) throw participantsError;

      setRoomParticipants(participants?.map(p => ({
        ...p,
        user_name: p.profiles?.full_name || 'Unknown User'
      })) || []);

      // Load messages
      const { data: messages, error: messagesError } = await supabase
        .from('room_messages')
        .select(`
          *,
          profiles!room_messages_user_id_fkey(full_name)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      setRoomMessages(messages?.map(m => ({
        ...m,
        user_name: m.profiles?.full_name || 'Unknown User'
      })) || []);
    } catch (error: any) {
      console.error('Error loading room data:', error);
      toast.error('Failed to load room data.');
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
      loadRoomData(currentRoom.id);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message.');
    }
  };

  const shareResource = async (resourceId: string, resourceType: string) => {
    if (!user || !currentRoom) return;

    try {
      const { error } = await supabase
        .from('room_shared_content')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          content_type: resourceType,
          content_id: resourceId
        });

      if (error) throw error;

      // Send a message about the shared resource
      const resource = userResources.find(r => r.id === resourceId);
      if (resource) {
        await supabase
          .from('room_messages')
          .insert({
            room_id: currentRoom.id,
            user_id: user.id,
            message: `Shared ${resource.type}: ${resource.title}`,
            message_type: 'quiz_share'
          });
      }

      setShowResourceShare(false);
      loadRoomData(currentRoom.id);
      toast.success('Resource shared successfully!');
    } catch (error: any) {
      console.error('Error sharing resource:', error);
      toast.error('Failed to share resource.');
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
      setRoomParticipants([]);
      setRoomMessages([]);
      toast.success('Left the room successfully.');
    } catch (error: any) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room.');
    }
  };

  const handleResourceClick = (resourceId: string, resourceType: string) => {
    if (resourceType === 'quiz') {
      // Navigate to quiz taking page with the specific quiz
      if (onNavigate) {
        // Store the quiz ID for the quiz taker to load
        localStorage.setItem('selected_quiz_id', resourceId);
        onNavigate('quiz-generator');
      }
    } else if (resourceType === 'material') {
      // Navigate to materials page with the specific material
      if (onNavigate) {
        localStorage.setItem('selected_material_id', resourceId);
        onNavigate('materials');
      }
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
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <Hash className="w-4 h-4 mr-1" />
                {currentRoom.room_code}
              </span>
              <span className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                {roomParticipants.length}/{currentRoom.max_participants}
              </span>
            </div>
          </div>

          {/* Participants */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-medium text-gray-900 mb-4">Participants ({roomParticipants.length})</h3>
            <div className="space-y-3">
              {roomParticipants.map(participant => (
                <div key={participant.id} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    {participant.role === 'host' ? (
                      <Crown className="w-4 h-4 text-yellow-600" />
                    ) : participant.role === 'moderator' ? (
                      <Shield className="w-4 h-4 text-blue-600" />
                    ) : (
                      <User className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{participant.user_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{participant.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6">
            <h3 className="font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowResourceShare(true)}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <Share2 className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-900">Share Resource</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentRoom.room_code);
                  toast.success('Room code copied to clipboard!');
                }}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <Copy className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-900">Copy Room Code</span>
              </button>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Room Chat</h3>
                <p className="text-sm text-gray-500">{currentRoom.subject} • {currentRoom.difficulty}</p>
              </div>
              <button
                onClick={() => setCurrentView('browse')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Browse Rooms</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {roomMessages.map(message => (
              <div key={message.id} className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{message.user_name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  {message.message_type === 'quiz_share' ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">{message.message}</p>
                      <button
                        onClick={() => {
                          const parts = message.message.split(': ');
                          if (parts.length === 2) {
                            const resourceType = parts[0].split(' ')[1].toLowerCase();
                            // For now, we'll navigate to the appropriate page
                            // In a real implementation, you'd extract the resource ID from the message
                            if (resourceType === 'quiz') {
                              handleResourceClick('', 'quiz');
                            } else if (resourceType === 'material') {
                              handleResourceClick('', 'material');
                            }
                          }
                        }}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Resource</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700">{message.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 p-6">
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

        {/* Resource Share Modal */}
        {showResourceShare && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
              <button
                onClick={() => setShowResourceShare(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Resource</h2>
                <p className="text-gray-600">Choose a resource to share with the room</p>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {userResources.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No resources available to share</p>
                ) : (
                  userResources.map(resource => (
                    <button
                      key={resource.id}
                      onClick={() => shareResource(resource.id, resource.type)}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        resource.type === 'quiz' ? 'bg-green-100' :
                        resource.type === 'material' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        {resource.type === 'quiz' ? (
                          <Brain className="w-4 h-4 text-green-600" />
                        ) : resource.type === 'material' ? (
                          <FileText className="w-4 h-4 text-blue-600" />
                        ) : (
                          <BookOpen className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{resource.title}</p>
                        <p className="text-sm text-gray-500 capitalize">{resource.type}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Study Rooms</h2>
          <p className="text-gray-600">Join collaborative study sessions with other learners</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowJoinForm(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Hash className="w-4 h-4" />
            <span>Join with Code</span>
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-4 h-4" />
            <span>Create Room</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading study rooms...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No study rooms found</h3>
          <p className="text-gray-600 mb-6">Be the first to create a study room!</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors"
          >
            Create Room
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map(room => (
            <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2">{room.name}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{room.description}</p>
                </div>
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  {room.is_public ? (
                    <Globe className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-1" />
                    {room.subject}
                  </span>
                  <span className="flex items-center">
                    <Target className="w-4 h-4 mr-1" />
                    {room.difficulty}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  <span>{room.participant_count || 0}/{room.max_participants}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Hash className="w-4 h-4" />
                  <span>{room.room_code}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  by {room.creator_name}
                </div>
                <button
                  onClick={() => joinRoom(room.id)}
                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                >
                  Join Room
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
            <button
              onClick={() => setShowCreateForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-purple-600" />
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
                  value={createRoomForm.name}
                  onChange={(e) => setCreateRoomForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter room name..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={createRoomForm.description}
                  onChange={(e) => setCreateRoomForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent h-20 resize-none"
                  placeholder="Describe what you'll be studying..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <select
                  value={createRoomForm.subject}
                  onChange={(e) => setCreateRoomForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select a subject...</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={createRoomForm.difficulty}
                  onChange={(e) => setCreateRoomForm(prev => ({ ...prev, difficulty: e.target.value as any }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
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
                  value={createRoomForm.max_participants}
                  onChange={(e) => setCreateRoomForm(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={createRoomForm.is_public}
                  onChange={(e) => setCreateRoomForm(prev => ({ ...prev, is_public: e.target.checked }))}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="is_public" className="ml-3 text-sm text-gray-700">
                  Make room public (visible to all users)
                </label>
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createRoom}
                disabled={!createRoomForm.name || !createRoomForm.subject}
                className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
            <button
              onClick={() => setShowJoinForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Hash className="w-8 h-8 text-blue-600" />
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
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
                  placeholder="ABCD12"
                  maxLength={6}
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowJoinForm(false)}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={joinRoomByCode}
                  disabled={!joinRoomCode.trim()}
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join Room
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