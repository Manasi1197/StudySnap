import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  Share2, 
  Settings, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Monitor,
  MonitorOff,
  Phone,
  Plus,
  Search,
  Filter,
  Clock,
  BookOpen,
  FileText,
  Upload,
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  X,
  Edit3,
  Square,
  Circle,
  Triangle,
  Minus,
  Type,
  Eraser,
  RotateCcw,
  Download,
  Palette,
  Timer,
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Brain,
  Target,
  Award
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface StudyRoomProps {
  onNavigate: (page: string) => void;
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
  room_code: string;
  status: string;
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
  content_type: string;
  content_id: string;
  user_id: string;
  shared_at: string;
  user_name?: string;
  title?: string;
}

interface WhiteboardStroke {
  id: string;
  points: number[];
  color: string;
  width: number;
  tool: string;
}

interface PomodoroSession {
  workTime: number;
  breakTime: number;
  currentTime: number;
  isRunning: boolean;
  isWorkSession: boolean;
  completedSessions: number;
}

const StudyRoom: React.FC<StudyRoomProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'browse' | 'room'>('browse');
  const [studyRooms, setStudyRooms] = useState<StudyRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [sharedContent, setSharedContent] = useState<SharedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [showShareQuiz, setShowShareQuiz] = useState(false);
  const [showAddResource, setShowAddResource] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  
  // Media states
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Whiteboard states
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text'>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentWidth, setCurrentWidth] = useState(2);
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
  
  // Pomodoro states
  const [pomodoroSession, setPomodoroSession] = useState<PomodoroSession>({
    workTime: 25 * 60, // 25 minutes in seconds
    breakTime: 5 * 60, // 5 minutes in seconds
    currentTime: 25 * 60,
    isRunning: false,
    isWorkSession: true,
    completedSessions: 0
  });
  const pomodoroIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Form states
  const [roomForm, setRoomForm] = useState({
    name: '',
    description: '',
    subject: '',
    difficulty: 'beginner',
    maxParticipants: 10,
    isPublic: true
  });
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (user) {
      loadStudyRooms();
    }
  }, [user]);

  useEffect(() => {
    if (currentRoom && user) {
      loadRoomData();
      const interval = setInterval(loadRoomData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [currentRoom, user]);

  // Pomodoro timer effect
  useEffect(() => {
    if (pomodoroSession.isRunning) {
      pomodoroIntervalRef.current = setInterval(() => {
        setPomodoroSession(prev => {
          if (prev.currentTime <= 1) {
            // Session completed
            const isWorkSession = prev.isWorkSession;
            const completedSessions = isWorkSession ? prev.completedSessions + 1 : prev.completedSessions;
            
            toast.success(isWorkSession ? '🎉 Work session completed! Time for a break.' : '✨ Break time over! Ready for another session?');
            
            return {
              ...prev,
              currentTime: isWorkSession ? prev.breakTime : prev.workTime,
              isWorkSession: !isWorkSession,
              completedSessions,
              isRunning: false
            };
          }
          return {
            ...prev,
            currentTime: prev.currentTime - 1
          };
        });
      }, 1000);
    } else {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
      }
    }

    return () => {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
      }
    };
  }, [pomodoroSession.isRunning]);

  const loadStudyRooms = async () => {
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

      setStudyRooms(roomsWithCounts);
    } catch (error: any) {
      console.error('Error loading study rooms:', error);
      toast.error('Failed to load study rooms');
    } finally {
      setLoading(false);
    }
  };

  const loadRoomData = async () => {
    if (!currentRoom || !user) return;

    try {
      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles!room_participants_user_id_fkey(full_name)
        `)
        .eq('room_id', currentRoom.id)
        .eq('is_active', true);

      if (participantsError) throw participantsError;

      setParticipants((participantsData || []).map(p => ({
        ...p,
        user_name: p.profiles?.full_name || 'Unknown'
      })));

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('room_messages')
        .select(`
          *,
          profiles!room_messages_user_id_fkey(full_name)
        `)
        .eq('room_id', currentRoom.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) throw messagesError;

      setMessages((messagesData || []).map(m => ({
        ...m,
        user_name: m.profiles?.full_name || 'Unknown'
      })));

      // Load shared content
      const { data: contentData, error: contentError } = await supabase
        .from('room_shared_content')
        .select(`
          *,
          profiles!room_shared_content_user_id_fkey(full_name)
        `)
        .eq('room_id', currentRoom.id)
        .order('shared_at', { ascending: false });

      if (contentError) throw contentError;

      setSharedContent((contentData || []).map(c => ({
        ...c,
        user_name: c.profiles?.full_name || 'Unknown'
      })));

    } catch (error: any) {
      console.error('Error loading room data:', error);
    }
  };

  const createRoom = async () => {
    if (!user) return;

    try {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data, error } = await supabase
        .from('study_rooms')
        .insert({
          name: roomForm.name,
          description: roomForm.description,
          subject: roomForm.subject,
          difficulty: roomForm.difficulty,
          max_participants: roomForm.maxParticipants,
          is_public: roomForm.isPublic,
          created_by: user.id,
          room_code: roomCode,
          session_type: 'study' // Default session type
        })
        .select()
        .single();

      if (error) throw error;

      // Join the room as host
      await joinRoom(data.id, 'host');
      
      toast.success('Room created successfully!');
      setShowCreateRoom(false);
      setRoomForm({
        name: '',
        description: '',
        subject: '',
        difficulty: 'beginner',
        maxParticipants: 10,
        isPublic: true
      });
      loadStudyRooms();
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
    }
  };

  const joinRoom = async (roomId: string, role: string = 'participant') => {
    if (!user) return;

    try {
      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('id, is_active')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingParticipant) {
        if (!existingParticipant.is_active) {
          // Reactivate participant
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
            role: role,
            is_active: true
          });

        if (error) throw error;
      }

      // Get room details and enter
      const { data: roomData, error: roomError } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;

      setCurrentRoom(roomData);
      setCurrentView('room');
      toast.success('Joined room successfully!');
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    }
  };

  const joinRoomByCode = async () => {
    if (!joinCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }

    try {
      const { data: roomData, error } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('room_code', joinCode.toUpperCase())
        .eq('status', 'active')
        .single();

      if (error || !roomData) {
        toast.error('Room not found or inactive');
        return;
      }

      await joinRoom(roomData.id);
      setShowJoinRoom(false);
      setJoinCode('');
    } catch (error: any) {
      console.error('Error joining room by code:', error);
      toast.error('Failed to join room');
    }
  };

  const leaveRoom = async () => {
    if (!currentRoom || !user) return;

    try {
      const { error } = await supabase
        .from('room_participants')
        .update({ is_active: false })
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setCurrentRoom(null);
      setCurrentView('browse');
      setParticipants([]);
      setMessages([]);
      setSharedContent([]);
      toast.success('Left room successfully');
    } catch (error: any) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentRoom || !user) return;

    try {
      // Verify user is an active participant
      const { data: participant } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!participant) {
        toast.error('You must be an active participant to send messages');
        return;
      }

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
      loadRoomData(); // Refresh messages
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const shareQuiz = async (quizData: any) => {
    if (!currentRoom || !user) return;

    try {
      const { error } = await supabase
        .from('room_shared_content')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          content_type: 'quiz',
          content_id: quizData.id || 'demo-quiz'
        });

      if (error) throw error;

      // Send a message about the shared quiz
      await supabase
        .from('room_messages')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          message: `Shared a quiz: ${quizData.title || 'Demo Quiz'}`,
          message_type: 'quiz_share'
        });

      toast.success('Quiz shared successfully!');
      setShowShareQuiz(false);
      loadRoomData();
    } catch (error: any) {
      console.error('Error sharing quiz:', error);
      toast.error('Failed to share quiz');
    }
  };

  const addResource = async (resourceData: any) => {
    if (!currentRoom || !user) return;

    try {
      const { error } = await supabase
        .from('room_shared_content')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          content_type: 'study_material',
          content_id: resourceData.id || 'demo-resource'
        });

      if (error) throw error;

      // Send a message about the shared resource
      await supabase
        .from('room_messages')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          message: `Shared a resource: ${resourceData.title || 'Study Material'}`,
          message_type: 'file'
        });

      toast.success('Resource shared successfully!');
      setShowAddResource(false);
      loadRoomData();
    } catch (error: any) {
      console.error('Error sharing resource:', error);
      toast.error('Failed to share resource');
    }
  };

  // Whiteboard functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentWidth;
      ctx.lineCap = 'round';
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearWhiteboard = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setStrokes([]);
  };

  // Pomodoro functions
  const startPomodoro = () => {
    setPomodoroSession(prev => ({ ...prev, isRunning: true }));
    toast.success(`${pomodoroSession.isWorkSession ? 'Work' : 'Break'} session started!`);
  };

  const pausePomodoro = () => {
    setPomodoroSession(prev => ({ ...prev, isRunning: false }));
    toast('Pomodoro paused');
  };

  const resetPomodoro = () => {
    setPomodoroSession(prev => ({
      ...prev,
      currentTime: prev.isWorkSession ? prev.workTime : prev.breakTime,
      isRunning: false
    }));
    toast('Pomodoro reset');
  };

  const skipPomodoroSession = () => {
    setPomodoroSession(prev => ({
      ...prev,
      currentTime: prev.isWorkSession ? prev.breakTime : prev.workTime,
      isWorkSession: !prev.isWorkSession,
      isRunning: false,
      completedSessions: prev.isWorkSession ? prev.completedSessions + 1 : prev.completedSessions
    }));
    toast('Session skipped');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Media controls
  const toggleMic = () => {
    setIsMicOn(!isMicOn);
    toast(isMicOn ? 'Microphone muted' : 'Microphone unmuted');
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
    toast(isCameraOn ? 'Camera turned off' : 'Camera turned on');
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    toast(isScreenSharing ? 'Screen sharing stopped' : 'Screen sharing started');
  };

  const filteredRooms = studyRooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === 'all' || room.subject === filterSubject;
    const matchesDifficulty = filterDifficulty === 'all' || room.difficulty === filterDifficulty;
    
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  if (currentView === 'room' && currentRoom) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Room Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('browse')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Rooms
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{currentRoom.name}</h1>
                <p className="text-sm text-gray-600">
                  {participants.length} participants • Code: {currentRoom.room_code}
                </p>
              </div>
            </div>
            
            {/* Media Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMic}
                className={`p-2 rounded-lg ${isMicOn ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
              >
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleCamera}
                className={`p-2 rounded-lg ${isCameraOn ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
              >
                {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleScreenShare}
                className={`p-2 rounded-lg ${isScreenSharing ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
              >
                {isScreenSharing ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
              </button>
              <button
                onClick={leaveRoom}
                className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
              >
                <Phone className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Room Content */}
        <div className="flex-1 flex">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Whiteboard */}
            <div className="flex-1 bg-white m-4 rounded-lg border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Collaborative Whiteboard</h3>
                  <div className="flex items-center space-x-2">
                    {/* Drawing Tools */}
                    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setCurrentTool('pen')}
                        className={`p-2 rounded ${currentTool === 'pen' ? 'bg-white shadow' : ''}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentTool('eraser')}
                        className={`p-2 rounded ${currentTool === 'eraser' ? 'bg-white shadow' : ''}`}
                      >
                        <Eraser className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentTool('line')}
                        className={`p-2 rounded ${currentTool === 'line' ? 'bg-white shadow' : ''}`}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentTool('rectangle')}
                        className={`p-2 rounded ${currentTool === 'rectangle' ? 'bg-white shadow' : ''}`}
                      >
                        <Square className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentTool('circle')}
                        className={`p-2 rounded ${currentTool === 'circle' ? 'bg-white shadow' : ''}`}
                      >
                        <Circle className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Color Picker */}
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => setCurrentColor(e.target.value)}
                      className="w-8 h-8 rounded border border-gray-300"
                    />
                    
                    {/* Brush Size */}
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={currentWidth}
                      onChange={(e) => setCurrentWidth(parseInt(e.target.value))}
                      className="w-20"
                    />
                    
                    <button
                      onClick={clearWhiteboard}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Canvas */}
              <div className="flex-1 relative">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="w-full h-full cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            {/* Participants */}
            <div className="border-b border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3">Participants ({participants.length})</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {participants.map(participant => (
                  <div key={participant.id} className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                      {participant.user_name?.charAt(0) || 'U'}
                    </div>
                    <span className="text-sm text-gray-900">{participant.user_name}</span>
                    {participant.role === 'host' && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Host</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pomodoro Timer */}
            <div className="border-b border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3">Pomodoro Timer</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatTime(pomodoroSession.currentTime)}
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  {pomodoroSession.isWorkSession ? 'Work Session' : 'Break Time'} • 
                  Session {pomodoroSession.completedSessions + 1}
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={pomodoroSession.isRunning ? pausePomodoro : startPomodoro}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    {pomodoroSession.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={resetPomodoro}
                    className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={skipPomodoroSession}
                    className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Shared Content */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Shared Content</h3>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setShowShareQuiz(true)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="Share Quiz"
                  >
                    <Brain className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowAddResource(true)}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                    title="Add Resource"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {sharedContent.map(content => (
                  <div key={content.id} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="font-medium text-gray-900">
                      {content.content_type === 'quiz' ? '🧠 Quiz' : '📄 Resource'}
                    </div>
                    <div className="text-gray-600">Shared by {content.user_name}</div>
                  </div>
                ))}
                {sharedContent.length === 0 && (
                  <p className="text-sm text-gray-500">No content shared yet</p>
                )}
              </div>
            </div>

            {/* Chat */}
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Chat</h3>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(message => (
                  <div key={message.id} className="text-sm">
                    <div className="font-medium text-gray-900">{message.user_name}</div>
                    <div className="text-gray-700">{message.message}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-sm text-gray-500">No messages yet. Start the conversation!</p>
                )}
              </div>
              
              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Share Quiz Modal */}
        {showShareQuiz && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Share Quiz</h3>
                <button
                  onClick={() => setShowShareQuiz(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900">Demo Quiz</h4>
                  <p className="text-sm text-gray-600">Sample quiz for demonstration</p>
                  <button
                    onClick={() => shareQuiz({ id: 'demo-quiz', title: 'Demo Quiz' })}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Share This Quiz
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  More quizzes will appear here when you create them in the Quiz Generator.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add Resource Modal */}
        {showAddResource && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Add Resource</h3>
                <button
                  onClick={() => setShowAddResource(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900">Study Notes</h4>
                  <p className="text-sm text-gray-600">Sample study material</p>
                  <button
                    onClick={() => addResource({ id: 'demo-resource', title: 'Study Notes' })}
                    className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Share This Resource
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  Upload and share your study materials with the room.
                </p>
              </div>
            </div>
          </div>
        )}
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
            <p className="text-gray-600">Join collaborative study sessions with peers</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowJoinRoom(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Join by Code</span>
            </button>
            <button
              onClick={() => setShowCreateRoom(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Create Room</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6 bg-white border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Subjects</option>
              <option value="mathematics">Mathematics</option>
              <option value="science">Science</option>
              <option value="history">History</option>
              <option value="literature">Literature</option>
              <option value="computer-science">Computer Science</option>
            </select>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
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
      <div className="p-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading study rooms...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map(room => (
              <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-2">{room.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{room.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    room.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                    room.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {room.difficulty}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{room.subject}</span>
                  <span>{room.participant_count}/{room.max_participants} participants</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    by {room.creator_name}
                  </span>
                  <button
                    onClick={() => joinRoom(room.id)}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                  >
                    Join Room
                  </button>
                </div>
              </div>
            ))}
            
            {filteredRooms.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms found</h3>
                <p className="text-gray-600">Try adjusting your filters or create a new room</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Create Study Room</h2>
              <button
                onClick={() => setShowCreateRoom(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room Name</label>
                <input
                  type="text"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter room name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={roomForm.description}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe what you'll be studying"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <select
                    value={roomForm.subject}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select subject</option>
                    <option value="mathematics">Mathematics</option>
                    <option value="science">Science</option>
                    <option value="history">History</option>
                    <option value="literature">Literature</option>
                    <option value="computer-science">Computer Science</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                  <select
                    value={roomForm.difficulty}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Participants</label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={roomForm.maxParticipants}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={roomForm.isPublic}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                  Make room public
                </label>
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowCreateRoom(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createRoom}
                disabled={!roomForm.name || !roomForm.subject}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Join Room by Code</h2>
              <button
                onClick={() => setShowJoinRoom(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-lg font-mono"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowJoinRoom(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={joinRoomByCode}
                disabled={joinCode.length !== 6}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyRoom;