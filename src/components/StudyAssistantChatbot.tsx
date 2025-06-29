import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Loader2, 
  AlertCircle,
  Bot,
  User,
  Mic,
  MicOff
} from 'lucide-react';
import { useConversationalAI, ConversationMessage } from '../lib/conversationalAI';
import toast from 'react-hot-toast';

interface StudyAssistantChatbotProps {
  agentId: string;
}

const StudyAssistantChatbot: React.FC<StudyAssistantChatbotProps> = ({ agentId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    conversationId,
    messages,
    isConnected,
    isLoading,
    error,
    startConversation,
    sendMessage,
    endConversation,
  } = useConversationalAI(agentId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const handleOpenChat = async () => {
    setIsOpen(true);
    setIsMinimized(false);
    
    if (!isConnected) {
      try {
        await startConversation();
      } catch (error) {
        console.error('Failed to start conversation:', error);
        toast.error('Failed to connect to study assistant');
      }
    }
  };

  const handleCloseChat = async () => {
    setIsOpen(false);
    setIsMinimized(false);
    
    if (isConnected) {
      try {
        await endConversation();
      } catch (error) {
        console.error('Failed to end conversation:', error);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) {
      return;
    }

    const message = inputMessage.trim();
    setInputMessage('');

    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const playAudio = async (audioUrl: string) => {
    if (isMuted) return;
    
    try {
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Floating chat button
  if (!isOpen) {
    return (
      <button
        onClick={handleOpenChat}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center z-50 group"
        title="Open Study Assistant"
      >
        <MessageCircle className="w-6 h-6" />
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Study Assistant
        </div>
      </button>
    );
  }

  // Chat window
  return (
    <div className={`fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 transition-all duration-300 ${
      isMinimized ? 'h-16' : 'h-[600px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">StudySnap Assistant</h3>
            <p className="text-xs text-purple-100">
              {isConnected ? 'Online' : 'Connecting...'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleCloseChat}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            title="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat content */}
      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[480px]">
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                    : 'bg-gray-100 text-gray-900'
                } rounded-2xl px-4 py-3`}>
                  <div className="flex items-start space-x-2">
                    {message.type === 'assistant' && (
                      <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    )}
                    {message.type === 'user' && (
                      <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs ${
                          message.type === 'user' ? 'text-purple-100' : 'text-gray-500'
                        }`}>
                          {formatTime(message.timestamp)}
                        </span>
                        {message.audioUrl && (
                          <button
                            onClick={() => playAudio(message.audioUrl!)}
                            className={`p-1 rounded transition-colors ${
                              message.type === 'user' 
                                ? 'hover:bg-white hover:bg-opacity-20' 
                                : 'hover:bg-gray-200'
                            }`}
                            title="Play audio"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-4 h-4" />
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask me anything about your studies..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                disabled={isLoading || !isConnected}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading || !isConnected}
                className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
            
            <p className="text-xs text-gray-500 mt-2 text-center">
              Ask about any academic topic for simple explanations
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default StudyAssistantChatbot;