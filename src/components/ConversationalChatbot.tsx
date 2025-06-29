import React, { useState } from 'react';
import { MessageCircle, X, Mic, MicOff, Volume2, VolumeX, Sparkles } from 'lucide-react';
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
        conversation.startSession({ signedUrl: url });
      }
    } else {
      conversation.startSession({ signedUrl });
    }
  };

  // Handle closing the chatbot
  const handleClose = () => {
    conversation.endSession();
    setIsOpen(false);
    setSignedUrl(null);
    setError(null);
  };

  // Toggle microphone and stop conversation
  const toggleMicrophone = () => {
    if (conversation.status === 'connected') {
      // Stop the conversation when microphone is clicked
      conversation.endSession();
      handleClose();
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
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={handleOpen}
            className="relative group"
            title="Ask StudySnap - I'm here to help with your questions!"
          >
            {/* Main Button */}
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full shadow-2xl hover:shadow-orange-500/25 transform hover:scale-110 transition-all duration-300 flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
            </div>
            
            {/* Pulsing indicator */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white">
              <div className="w-full h-full bg-green-400 rounded-full animate-ping"></div>
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="bg-black/90 text-white text-sm px-4 py-2 rounded-lg whitespace-nowrap backdrop-blur-sm">
                Ask StudySnap - I'm here to help! 💡
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Compact Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-80 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 z-50 transition-all duration-500">
          {/* Header with Close Button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={handleClose}
              className="w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/20"
              title="Close"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col h-full p-6">
            {error ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                    <X className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Connection Error</h3>
                  <p className="text-white/70 text-sm mb-4">{error}</p>
                  <button
                    onClick={getSignedUrl}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 text-sm font-medium"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 border-4 border-white/30 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-2 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Connecting...</h3>
                  <p className="text-white/70 text-sm">Setting up your AI assistant</p>
                </div>
              </div>
            ) : conversation.status === 'connected' ? (
              <div className="flex-1 flex flex-col">
                {/* Status */}
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-white mb-2">
                    {conversation.isSpeaking ? 'AI is speaking...' : 'I\'m listening'}
                  </h3>
                  <p className="text-white/70 text-sm">
                    {conversation.isSpeaking 
                      ? 'Getting your answer ready'
                      : 'Ask me anything about your studies!'
                    }
                  </p>
                </div>
                
                {/* Centered Microphone */}
                <div className="flex-1 flex items-center justify-center">
                  <button
                    onClick={toggleMicrophone}
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${
                      conversation.isSpeaking
                        ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-2xl shadow-red-500/40'
                        : 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 shadow-2xl shadow-purple-500/40'
                    }`}
                    title={conversation.isSpeaking ? 'Stop conversation' : 'Stop conversation'}
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

                {/* Status indicator */}
                <div className="flex items-center justify-center space-x-2 mt-4">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white/70 text-sm font-medium">Connected</span>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded transition-all duration-200 ml-2"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-orange-500/30">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Ask StudySnap</h3>
                  <p className="text-white/70 text-sm mb-6 leading-relaxed">
                    I'm here to help with your questions about studies, learning materials, and academic topics!
                  </p>
                  <button
                    onClick={async () => {
                      const url = await getSignedUrl();
                      if (url) {
                        conversation.startSession({ signedUrl: url });
                      }
                    }}
                    className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 transition-all duration-300 font-semibold shadow-2xl shadow-purple-500/30 transform hover:scale-105"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Connecting...</span>
                      </span>
                    ) : (
                      'Start Asking'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ConversationalChatbot;