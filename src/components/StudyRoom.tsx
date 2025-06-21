import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  Share2, 
  Settings, 
  Plus,
  Search,
  Filter,
  Clock,
  User,
  Globe,
  Lock,
  Calendar,
  BookOpen,
  Brain,
  Presentation,
  MessageCircle,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Phone,
  PhoneOff,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  Copy,
  ExternalLink,
  Edit3,
  Trash2,
  Crown,
  Shield,
  UserPlus,
  LogOut,
  Volume2,
  VolumeX,
  Monitor,
  MousePointer,
  Type,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Download,
  Upload,
  FileText,
  Image as ImageIcon,
  Zap,
  Target,
  Award,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2
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
}

interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: 'host' | 'moderator' | 'participant';
  joined_at: string;
  is_active: boolean;
  profiles?: {
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
  message_type: 'text' | 'file' | 'quiz_share' | 'system';
  created_at: string;
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
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  
  // Room interface state
  const [activeTab, setActiveTab] = useState<'whiteboard' | 'chat' | 'materials' | 'participants'>('whiteboard');
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Whiteboard state
  const [whiteboardTool, setWhiteboardTool] = useState<'pen' | 'eraser' | 'text' | 'shapes'>('pen');
  const [whiteboardColor, setWhiteboardColor] = useState('#000000');
  const [whiteboardSize, setWhiteboardSize] = useState(2);

  useEffect(() => {
    if (user) {
      loadRooms();
    }
  }, [user]);

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

  const joinRoom = async (room: StudyRoom) => {
    if (!user) return;

    try {
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

      setSelectedRoom(room);
      setCurrentView('room');
      loadRoomData(room.id);
      toast.success(`Joined ${room.name}`);
    } catch (error: any) {
      console.error('Error joining room:', error);
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
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .eq('is_active', true);

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('room_messages')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);
    } catch (error: any) {
      console.error('Error loading room data:', error);
    }
  };

  const leaveRoom = async () => {
    if (!selectedRoom || !user) return;

    try {
      const { error } = await supabase
        .from('room_participants')
        .update({ is_active: false })
        .eq('room_id', selectedRoom.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setCurrentView('browse');
      setSelectedRoom(null);
      setParticipants([]);
      setMessages([]);
      setActiveTab('whiteboard'); // Reset to whiteboard when leaving
      toast.success('Left the room');
    } catch (error: any) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || !user) return;

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
      loadRoomData(selectedRoom.id); // Reload messages
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = async (roomData: any) => {
    if (!user) return;

    try {
      const roomCode = generateRoomCode();
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
          role: 'host'
        });

      toast.success('Room created successfully!');
      setShowCreateModal(false);
      loadRooms();
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
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

  const subjects = ['Mathematics', 'Science', 'History', 'Literature', 'Computer Science', 'Languages', 'Art', 'Music'];

  // Room Interface Component
  const RoomInterface = () => {
    if (!selectedRoom) return null;

    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        {/* Room Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={leaveRoom}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Leave Room</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{selectedRoom.name}</h1>
                <p className="text-sm text-gray-500">
                  {selectedRoom.subject} • {participants.length} participants • Room: {selectedRoom.room_code}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Media Controls */}
              <button
                onClick={() => setIsAudioOn(!isAudioOn)}
                className={`p-2 rounded-lg transition-colors ${
                  isAudioOn ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}
              >
                {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={`p-2 rounded-lg transition-colors ${
                  isVideoOn ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}
              >
                {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsScreenSharing(!isScreenSharing)}
                className={`p-2 rounded-lg transition-colors ${
                  isScreenSharing ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Monitor className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Always show content based on active tab */}
          <div className="flex-1 flex flex-col bg-white border-r border-gray-200">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 px-6 py-3">
              <div className="flex space-x-1">
                {[
                  { id: 'whiteboard', label: 'Whiteboard', icon: Monitor },
                  { id: 'materials', label: 'Materials', icon: FileText },
                  { id: 'chat', label: 'Chat', icon: MessageSquare },
                  { id: 'participants', label: 'Participants', icon: Users }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      {tab.id === 'chat' && messages.length > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {messages.length > 99 ? '99+' : messages.length}
                        </span>
                      )}
                      {tab.id === 'participants' && (
                        <span className="bg-gray-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {participants.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'whiteboard' && (
                <div className="h-full flex flex-col">
                  {/* Whiteboard Toolbar */}
                  <div className="border-b border-gray-200 px-6 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {[
                            { id: 'pen', icon: Edit3, label: 'Pen' },
                            { id: 'eraser', icon: Minus, label: 'Eraser' },
                            { id: 'text', icon: Type, label: 'Text' },
                            { id: 'shapes', icon: Square, label: 'Shapes' }
                          ].map((tool) => {
                            const Icon = tool.icon;
                            return (
                              <button
                                key={tool.id}
                                onClick={() => setWhiteboardTool(tool.id as any)}
                                className={`p-2 rounded-lg transition-colors ${
                                  whiteboardTool === tool.id
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                                title={tool.label}
                              >
                                <Icon className="w-4 h-4" />
                              </button>
                            );
                          })}
                        </div>
                        
                        <div className="h-6 w-px bg-gray-300"></div>
                        
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={whiteboardColor}
                            onChange={(e) => setWhiteboardColor(e.target.value)}
                            className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={whiteboardSize}
                            onChange={(e) => setWhiteboardSize(parseInt(e.target.value))}
                            className="w-20"
                          />
                          <span className="text-sm text-gray-600">{whiteboardSize}px</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                          Clear
                        </button>
                        <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Whiteboard Canvas */}
                  <div className="flex-1 bg-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-white">
                      {/* This would be the actual whiteboard canvas */}
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <Monitor className="w-16 h-16 mx-auto mb-4" />
                          <p className="text-lg font-medium">Interactive Whiteboard</p>
                          <p className="text-sm">Draw, write, and collaborate in real-time</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'materials' && (
                <div className="h-full p-6">
                  <div className="text-center py-16">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Shared Materials</h3>
                    <p className="text-gray-600 mb-6">Share study materials, quizzes, and resources with the room</p>
                    <button className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors">
                      Share Material
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="h-full flex flex-col">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-16">
                        <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                        <p className="text-gray-600">Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
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
                      ))
                    )}
                  </div>
                  
                  {/* Message Input */}
                  <div className="border-t border-gray-200 p-4">
                    <div className="flex space-x-3">
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
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'participants' && (
                <div className="h-full p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        Participants ({participants.length})
                      </h3>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Invite Others
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {participants.map((participant) => (
                        <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                              {participant.profiles?.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {participant.profiles?.full_name || 'Unknown User'}
                              </p>
                              <p className="text-sm text-gray-500 capitalize">{participant.role}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {participant.role === 'host' && (
                              <Crown className="w-4 h-4 text-yellow-500" />
                            )}
                            {participant.role === 'moderator' && (
                              <Shield className="w-4 h-4 text-blue-500" />
                            )}
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Video/Screen Share Area */}
          <div className="w-80 bg-gray-900 flex flex-col">
            {/* Video Grid */}
            <div className="flex-1 p-4">
              <div className="grid grid-cols-1 gap-4">
                {/* Main video (screen share or presenter) */}
                <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
                  {isScreenSharing ? (
                    <div className="text-center text-white">
                      <Monitor className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">Screen Sharing</p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <Video className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">No video</p>
                    </div>
                  )}
                </div>
                
                {/* Participant videos */}
                {participants.slice(0, 3).map((participant) => (
                  <div key={participant.id} className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center relative">
                    <div className="text-center text-white">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2 text-lg font-medium">
                        {participant.profiles?.full_name?.charAt(0) || 'U'}
                      </div>
                      <p className="text-xs">{participant.profiles?.full_name || 'Unknown'}</p>
                    </div>
                    <div className="absolute bottom-2 right-2 flex space-x-1">
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <MicOff className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Room Info */}
            <div className="border-t border-gray-700 p-4">
              <div className="text-white space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Room Code:</span>
                  <span className="font-mono bg-gray-800 px-2 py-1 rounded">
                    {selectedRoom.room_code}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Duration:</span>
                  <span>45:32</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Create Room Modal
  const CreateRoomModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      subject: 'Mathematics',
      difficulty: 'beginner',
      session_type: 'study',
      max_participants: 10,
      is_public: true
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

          <form onSubmit={(e) => {
            e.preventDefault();
            createRoom(formData);
          }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter room name..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none"
                  placeholder="Describe what this room is for..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <select
                  required
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Level *
                </label>
                <select
                  required
                  value={formData.difficulty}
                  onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Type *
                </label>
                <select
                  required
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Participants
                </label>
                <input
                  type="number"
                  min="2"
                  max="100"
                  value={formData.max_participants}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_public" className="ml-3 text-sm text-gray-700">
                Make this room public (others can discover and join)
              </label>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Create Room
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (currentView === 'room') {
    return <RoomInterface />;
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
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center space-x-4 flex-1">
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
                ? 'Try adjusting your search criteria'
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
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      room.session_type === 'study' ? 'bg-blue-100' :
                      room.session_type === 'quiz' ? 'bg-green-100' :
                      room.session_type === 'discussion' ? 'bg-purple-100' : 'bg-orange-100'
                    }`}>
                      {room.session_type === 'study' && <BookOpen className="w-6 h-6 text-blue-600" />}
                      {room.session_type === 'quiz' && <Brain className="w-6 h-6 text-green-600" />}
                      {room.session_type === 'discussion' && <MessageCircle className="w-6 h-6 text-purple-600" />}
                      {room.session_type === 'presentation' && <Presentation className="w-6 h-6 text-orange-600" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{room.name}</h3>
                      <p className="text-sm text-gray-500">{room.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {room.is_public ? (
                      <Globe className="w-4 h-4 text-green-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                <p className="text-gray-700 mb-4 line-clamp-2">
                  {room.description || 'No description provided'}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-4">
                    <span className="capitalize">{room.difficulty}</span>
                    <span className="capitalize">{room.session_type}</span>
                  </div>
                  <span>{room.room_code}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>0/{room.max_participants}</span>
                  </div>
                  <button
                    onClick={() => joinRoom(room)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
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
      {showCreateModal && <CreateRoomModal />}
    </div>
  );
};

export default StudyRoom;