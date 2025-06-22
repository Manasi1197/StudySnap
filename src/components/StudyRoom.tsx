import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, 
  MessageSquare, 
  Share2, 
  Settings, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Phone,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  Search,
  Filter,
  Plus,
  X,
  Edit3,
  Trash2,
  Copy,
  ExternalLink,
  Crown,
  Shield,
  User,
  Clock,
  Hash,
  Globe,
  Lock,
  Calendar,
  BookOpen,
  Brain,
  FileText,
  Image,
  Palette,
  Square,
  Circle,
  Triangle,
  Minus,
  Type,
  Eraser,
  RotateCcw,
  Download,
  Upload,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Move,
  MousePointer
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface StudyRoomProps {
  onNavigate?: (page: string) => void;
}

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
  participant_count?: number;
  creator_name?: string;
}

interface RoomParticipant {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  is_active: boolean;
  user_name?: string;
}

interface RoomMessage {
  id: string;
  user_id: string;
  message: string;
  message_type: string;
  created_at: string;
  user_name?: string;
}

interface SharedContent {
  id: string;
  user_id: string;
  content_type: string;
  content_id?: string;
  shared_at: string;
  user_name?: string;
  content_title?: string;
}

const StudyRoom: React.FC<StudyRoomProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'browse' | 'room'>('browse');
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  // Room state
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [sharedContent, setSharedContent] = useState<SharedContent[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'resources' | 'whiteboard'>('chat');
  
  // Audio/Video state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  // Whiteboard state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text'>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [lastPosition, setLastPosition] = useState<{ x: number; y: number } | null>(null);

  // Refs to prevent unwanted scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create room form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    subject: '',
    difficulty: 'beginner',
    session_type: 'study',
    max_participants: 10,
    is_public: true,
    scheduled_for: ''
  });

  // Load rooms on component mount
  useEffect(() => {
    if (user) {
      loadRooms();
    }
  }, [user]);

  // Auto-scroll to bottom only when appropriate
  const scrollToBottom = useCallback(() => {
    if (!isUserScrollingRef.current && messagesEndRef.current && chatContainerRef.current) {
      const container = chatContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, []);

  // Handle user scrolling detection
  const handleScroll = useCallback(() => {
    isUserScrollingRef.current = true;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 1000);
  }, []);

  // Scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Set up scroll event listener
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [handleScroll]);

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

  const createRoom = async () => {
    if (!user) return;

    try {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data: room, error } = await supabase
        .from('study_rooms')
        .insert({
          ...createForm,
          created_by: user.id,
          room_code: roomCode,
          tags: createForm.subject ? [createForm.subject] : []
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as host participant
      await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          role: 'host'
        });

      toast.success('Study room created successfully!');
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
      
      // Join the created room
      joinRoom(room);
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
        .eq('is_active', true)
        .single();

      if (!existingParticipant) {
        // Add as participant
        await supabase
          .from('room_participants')
          .insert({
            room_id: room.id,
            user_id: user.id,
            role: 'participant'
          });
      }

      setSelectedRoom(room);
      setCurrentView('room');
      loadRoomData(room.id);
      toast.success(`Joined ${room.name}!`);
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error('Failed to join study room');
    }
  };

  const joinRoomByCode = async () => {
    if (!user || !joinCode.trim()) return;

    try {
      const { data: room, error } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('room_code', joinCode.toUpperCase())
        .eq('status', 'active')
        .single();

      if (error || !room) {
        toast.error('Invalid room code');
        return;
      }

      await joinRoom(room);
      setShowJoinModal(false);
      setJoinCode('');
    } catch (error: any) {
      console.error('Error joining room by code:', error);
      toast.error('Failed to join room');
    }
  };

  const loadRoomData = async (roomId: string) => {
    try {
      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles!room_participants_user_id_fkey(full_name)
        `)
        .eq('room_id', roomId)
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
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) throw messagesError;

      setMessages(
        (messagesData || []).map(m => ({
          ...m,
          user_name: m.profiles?.full_name || 'Unknown User'
        }))
      );

      // Load shared content
      const { data: contentData, error: contentError } = await supabase
        .from('room_shared_content')
        .select(`
          *,
          profiles!room_shared_content_user_id_fkey(full_name)
        `)
        .eq('room_id', roomId)
        .order('shared_at', { ascending: false });

      if (contentError) throw contentError;

      setSharedContent(
        (contentData || []).map(c => ({
          ...c,
          user_name: c.profiles?.full_name || 'Unknown User',
          content_title: `${c.content_type} shared by ${c.profiles?.full_name || 'Unknown User'}`
        }))
      );

    } catch (error: any) {
      console.error('Error loading room data:', error);
      toast.error('Failed to load room data');
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
      // Reload messages to get the new one
      loadRoomData(selectedRoom.id);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const leaveRoom = () => {
    setSelectedRoom(null);
    setCurrentView('browse');
    setParticipants([]);
    setMessages([]);
    setSharedContent([]);
    setActiveTab('chat');
    // Reset scroll state
    isUserScrollingRef.current = false;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  };

  // Whiteboard functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setLastPosition({ x, y });
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !lastPosition) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : currentColor;
      
      if (currentTool === 'pen' || currentTool === 'eraser') {
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
    
    setLastPosition({ x, y });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPosition(null);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Filter rooms based on search and filters
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubject = selectedSubject === 'all' || room.subject === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'all' || room.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  const subjects = ['Mathematics', 'Science', 'History', 'Literature', 'Computer Science', 'Languages', 'Art', 'Music'];
  const difficulties = ['beginner', 'intermediate', 'advanced'];

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

  if (currentView === 'room' && selectedRoom) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
        {/* Room Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={leaveRoom}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Leave Room</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{selectedRoom.name}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {participants.length} participants
                  </span>
                  <span className="flex items-center">
                    <Hash className="w-4 h-4 mr-1" />
                    {selectedRoom.room_code}
                  </span>
                  <span className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-1" />
                    {selectedRoom.subject}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Audio/Video Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded-full transition-colors ${
                  isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`p-3 rounded-full transition-colors ${
                  isVideoOff ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
              <button className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                <Phone className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Room Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Tab Navigation */}
            <div className="bg-white border-b border-gray-200 px-6 flex-shrink-0">
              <div className="flex space-x-8">
                {[
                  { id: 'chat', label: 'Chat', icon: MessageSquare },
                  { id: 'participants', label: 'Participants', icon: Users },
                  { id: 'resources', label: 'Resources', icon: FileText },
                  { id: 'whiteboard', label: 'Whiteboard', icon: Edit3 }
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'chat' && (
                <div className="h-full flex flex-col">
                  {/* Messages */}
                  <div 
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-6 space-y-4"
                  >
                    {messages.map(message => (
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
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-gray-200 p-4 flex-shrink-0">
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <Smile className="w-5 h-5" />
                      </button>
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'participants' && (
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Participants ({participants.length})
                  </h3>
                  <div className="space-y-3">
                    {participants.map(participant => (
                      <div key={participant.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                            {participant.user_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{participant.user_name}</p>
                            <div className="flex items-center space-x-2">
                              {participant.role === 'host' && (
                                <span className="flex items-center text-xs text-yellow-600">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Host
                                </span>
                              )}
                              {participant.role === 'moderator' && (
                                <span className="flex items-center text-xs text-blue-600">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Moderator
                                </span>
                              )}
                              {participant.role === 'participant' && (
                                <span className="flex items-center text-xs text-gray-500">
                                  <User className="w-3 h-3 mr-1" />
                                  Participant
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-500">Online</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'resources' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Shared Resources</h3>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                      <Plus className="w-4 h-4" />
                      <span>Share Resource</span>
                    </button>
                  </div>
                  
                  {sharedContent.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No resources shared yet</h4>
                      <p className="text-gray-500">Share quizzes, materials, and files with the group</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sharedContent.map(content => (
                        <div key={content.id} className="p-4 bg-white rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                content.content_type === 'quiz' ? 'bg-purple-100' :
                                content.content_type === 'flashcard_set' ? 'bg-blue-100' :
                                content.content_type === 'study_material' ? 'bg-green-100' : 'bg-gray-100'
                              }`}>
                                {content.content_type === 'quiz' && <Brain className="w-5 h-5 text-purple-600" />}
                                {content.content_type === 'flashcard_set' && <BookOpen className="w-5 h-5 text-blue-600" />}
                                {content.content_type === 'study_material' && <FileText className="w-5 h-5 text-green-600" />}
                                {content.content_type === 'file' && <Image className="w-5 h-5 text-gray-600" />}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{content.content_title}</p>
                                <p className="text-sm text-gray-500">
                                  Shared by {content.user_name} • {new Date(content.shared_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'whiteboard' && (
                <div className="h-full flex flex-col">
                  {/* Whiteboard Tools */}
                  <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center space-x-4">
                      {/* Drawing Tools */}
                      <div className="flex items-center space-x-2">
                        {[
                          { tool: 'pen', icon: Edit3, label: 'Pen' },
                          { tool: 'eraser', icon: Eraser, label: 'Eraser' },
                          { tool: 'line', icon: Minus, label: 'Line' },
                          { tool: 'rectangle', icon: Square, label: 'Rectangle' },
                          { tool: 'circle', icon: Circle, label: 'Circle' },
                          { tool: 'text', icon: Type, label: 'Text' }
                        ].map(({ tool, icon: Icon, label }) => (
                          <button
                            key={tool}
                            onClick={() => setCurrentTool(tool as any)}
                            className={`p-2 rounded-lg transition-colors ${
                              currentTool === tool
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={label}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        ))}
                      </div>

                      <div className="h-6 w-px bg-gray-300"></div>

                      {/* Color Picker */}
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Color:</span>
                        <input
                          type="color"
                          value={currentColor}
                          onChange={(e) => setCurrentColor(e.target.value)}
                          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                        />
                        <div className="flex space-x-1">
                          {['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map(color => (
                            <button
                              key={color}
                              onClick={() => setCurrentColor(color)}
                              className={`w-6 h-6 rounded border-2 ${
                                currentColor === color ? 'border-gray-800' : 'border-gray-300'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="h-6 w-px bg-gray-300"></div>

                      {/* Brush Size */}
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Size:</span>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={brushSize}
                          onChange={(e) => setBrushSize(parseInt(e.target.value))}
                          className="w-20"
                        />
                        <span className="text-sm text-gray-600 w-6">{brushSize}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={clearCanvas}
                        className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Clear</span>
                      </button>
                      <button className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                        <Download className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>

                  {/* Canvas */}
                  <div className="flex-1 bg-white overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={1200}
                      height={800}
                      className="w-full h-full cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Browse Rooms View
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
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Hash className="w-4 h-4" />
              <span>Join by Code</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
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
              {difficulties.map(difficulty => (
                <option key={difficulty} value={difficulty}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-500">
            {filteredRooms.length} rooms available
          </div>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="p-8">
        {filteredRooms.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No study rooms found</h3>
            <p className="text-gray-600 mb-6">
              {rooms.length === 0 
                ? "Be the first to create a study room!" 
                : "Try adjusting your search or filters"
              }
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors"
            >
              Create Study Room
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
                  <div className="flex items-center space-x-1 ml-4">
                    {room.is_public ? (
                      <Globe className="w-4 h-4 text-green-500" title="Public Room" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-500" title="Private Room" />
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Subject:</span>
                    <span className="font-medium text-gray-900">{room.subject}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Level:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      room.difficulty === 'beginner' ? 'bg-green-100 text-green-600' :
                      room.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {room.difficulty.charAt(0).toUpperCase() + room.difficulty.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Participants:</span>
                    <span className="font-medium text-gray-900">
                      {room.participant_count}/{room.max_participants}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Host:</span>
                    <span className="font-medium text-gray-900">{room.creator_name}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">#{room.room_code}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      room.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></span>
                  </div>
                  <button
                    onClick={() => joinRoom(room)}
                    disabled={room.participant_count >= room.max_participants}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Join Room
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create Study Room</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter room name..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent h-24 resize-none"
                  placeholder="Describe what this study room is about..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    value={createForm.subject}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select subject</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty Level *
                  </label>
                  <select
                    value={createForm.difficulty}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {difficulties.map(difficulty => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Type *
                  </label>
                  <select
                    value={createForm.session_type}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, session_type: e.target.value }))}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={createForm.is_public}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-3 text-sm text-gray-700">Make this room public</span>
                </label>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createRoom}
                  disabled={!createForm.name || !createForm.subject}
                  className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join by Code Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Join Room</h2>
              <button
                onClick={() => setShowJoinModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
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
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
                  placeholder="ABCD12"
                  maxLength={6}
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={joinRoomByCode}
                  disabled={!joinCode.trim()}
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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