import React, { useState } from 'react';
import { MessageCircle, X, Mic, MicOff, Volume2, VolumeX, Minimize2, Maximize2, Sparkles } from 'lucide-react';
import { useConversation } from '@elevenlabs/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface ConversationalChatbotProps {
  agentId: string;
}

const ConversationalChatbot: React.FC<ConversationalChatbotProps> = ({ agentId }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to conversation');
      toast.success('Connected to AI assistant');
    },
    onDisconnect: () => {
      console.log('Disconnected from conversation');
    },
    onError: (error) => {
      console.error('Conversation error:', error);
      setError('Connection error occurred');
      toast.error('AI assistant connection error');
    },
  });

  // Get signed URL from our Supabase Edge Function
  const getSignedUrl = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('elevenlabs-signed-url', {
        body: { agentId }
      });

      if (error) {
        throw new Error(error.message || 'Failed to get signed URL');
      }

      if (data?.signed_url) {
        setSignedUrl(data.signed_url);
        return data.signed_url;
      } else {
        throw new Error('No signed URL received');
      }
    } catch (err: any) {
      console.error('Error getting signed URL:', err);
      setError(err.message || 'Failed to connect to AI assistant');
      toast.error('Failed to connect to AI assistant');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle opening the chatbot
  const handleOpen = async () => {
    if (!user) {
      toast.error('Please sign in to use the AI assistant');
      return;
    }

    setIsOpen(true);
    
    if (!signedUrl) {
      const url = await getSignedUrl();
      if (url) {
        // Start the conversation session
        conversation.startSession({ signedUrl: url });
      }
    } else {
      // Start the conversation session with existing URL
      conversation.startSession({ signedUrl });
    }
  };

  // Handle closing the chatbot
  const handleClose = () => {
    // End the conversation session
    conversation.endSession();
    
    setIsOpen(false);
    setIsMinimized(false);
    setSignedUrl(null);
    setError(null);
  };

  // Toggle microphone
  const toggleMicrophone = () => {
    if (conversation.status === 'connected') {
      if (conversation.isSpeaking) {
        // Stop speaking if currently speaking
        conversation.endSession();
      } else {
        // Start speaking
        conversation.startSession({ signedUrl: signedUrl! });
      }
    }
  };

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white rounded-full shadow-2xl hover:shadow-purple-500/25 transform hover:scale-110 transition-all duration-300 z-50 flex items-center justify-center group"
          title="Open AI Assistant"
        >
          <MessageCircle className="w-7 h-7 group-hover:scale-110 transition-transform" />
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full animate-pulse border-2 border-white">
            <div className="w-full h-full bg-green-400 rounded-full animate-ping"></div>
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 bg-black/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-800 z-50 transition-all duration-500 ${
          isMinimized ? 'w-80 h-20' : 'w-[420px] h-[650px]'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-black animate-pulse"></div>
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">AI Study Assistant</h3>
                <p className="text-sm text-gray-400">
                  {conversation.status === 'connected' ? (
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>Connected</span>
                    </span>
                  ) : conversation.status === 'connecting' ? (
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span>Connecting...</span>
                    </span>
                  ) : isLoading ? (
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span>Loading...</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span>Ready to help</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="flex flex-col h-[calc(650px-92px)]">
              {error ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
                      <X className="w-10 h-10 text-red-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">Connection Error</h3>
                    <p className="text-gray-400 mb-6 leading-relaxed">{error}</p>
                    <button
                      onClick={getSignedUrl}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-2 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-full flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">Connecting...</h3>
                    <p className="text-gray-400">Setting up your AI assistant</p>
                  </div>
                </div>
              ) : conversation.status === 'connected' ? (
                <div className="flex-1 flex flex-col">
                  {/* Conversation Interface */}
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center">
                      {/* Animated Waveform Visual */}
                      <div className="relative mb-8">
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto transition-all duration-500 ${
                          conversation.isSpeaking 
                            ? 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 shadow-2xl shadow-green-500/30' 
                            : 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 shadow-2xl shadow-purple-500/30'
                        }`}>
                          {conversation.isSpeaking ? (
                            <Volume2 className="w-16 h-16 text-white animate-pulse" />
                          ) : (
                            <Mic className="w-16 h-16 text-white" />
                          )}
                        </div>
                        
                        {/* Animated rings */}
                        {conversation.isSpeaking && (
                          <>
                            <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping"></div>
                            <div className="absolute inset-4 rounded-full border border-green-300 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                          </>
                        )}
                      </div>
                      
                      <h3 className="text-2xl font-bold text-white mb-3">
                        {conversation.isSpeaking ? 'AI is speaking...' : 'Ready to listen'}
                      </h3>
                      
                      <p className="text-gray-400 mb-8 leading-relaxed max-w-sm mx-auto">
                        {conversation.isSpeaking 
                          ? 'The AI assistant is responding to your question'
                          : 'Ask me anything about your studies, learning materials, or academic questions'
                        }
                      </p>

                      {/* Microphone Button */}
                      <button
                        onClick={toggleMicrophone}
                        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${
                          conversation.isSpeaking
                            ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-2xl shadow-red-500/40'
                            : 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 shadow-2xl shadow-purple-500/40'
                        }`}
                        title={conversation.isSpeaking ? 'Stop' : 'Start talking'}
                      >
                        {conversation.isSpeaking ? (
                          <MicOff className="w-10 h-10 text-white" />
                        ) : (
                          <Mic className="w-10 h-10 text-white" />
                        )}
                        
                        {/* Pulse effect */}
                        <div className={`absolute inset-0 rounded-full ${
                          conversation.isSpeaking ? 'bg-red-500' : 'bg-purple-500'
                        } opacity-30 animate-ping`}></div>
                      </button>
                    </div>
                  </div>

                  {/* Status Bar */}
                  <div className="border-t border-gray-800 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-300 font-medium">Connected & Ready</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                          title={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/30">
                      <Sparkles className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">AI Study Assistant</h3>
                    <p className="text-gray-400 mb-8 leading-relaxed max-w-sm mx-auto">
                      I'm here to help you with your studies! Ask me anything about your learning materials, 
                      study techniques, or any academic questions you have.
                    </p>
                    <button
                      onClick={async () => {
                        const url = await getSignedUrl();
                        if (url) {
                          conversation.startSession({ signedUrl: url });
                        }
                      }}
                      className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white px-8 py-4 rounded-xl hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 transition-all duration-300 font-semibold text-lg shadow-2xl shadow-purple-500/30 transform hover:scale-105"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Connecting...</span>
                        </span>
                      ) : (
                        'Start Conversation'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ConversationalChatbot;