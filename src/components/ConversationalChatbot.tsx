import React, { useState } from 'react';
import { MessageCircle, X, Mic, MicOff, Volume2, VolumeX, Minimize2, Maximize2 } from 'lucide-react';
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
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 z-50 flex items-center justify-center group"
          title="Open AI Assistant"
        >
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 transition-all duration-300 ${
          isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Study Assistant</h3>
                <p className="text-xs text-purple-100">
                  {conversation.status === 'connected' ? 'Connected' : 
                   conversation.status === 'connecting' ? 'Connecting...' : 
                   isLoading ? 'Loading...' : 'Ready to help'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="flex flex-col h-[calc(600px-80px)]">
              {error ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                      onClick={getSignedUrl}
                      className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Connecting...</h3>
                    <p className="text-gray-600">Setting up your AI assistant</p>
                  </div>
                </div>
              ) : conversation.status === 'connected' ? (
                <div className="flex-1 flex flex-col">
                  {/* Conversation Interface */}
                  <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-300 ${
                        conversation.isSpeaking 
                          ? 'bg-green-100 animate-pulse' 
                          : 'bg-purple-100'
                      }`}>
                        {conversation.isSpeaking ? (
                          <Volume2 className="w-12 h-12 text-green-600" />
                        ) : (
                          <Mic className="w-12 h-12 text-purple-600" />
                        )}
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {conversation.isSpeaking ? 'AI is speaking...' : 'Ready to listen'}
                      </h3>
                      
                      <p className="text-gray-600 mb-6">
                        {conversation.isSpeaking 
                          ? 'The AI assistant is responding to your question'
                          : 'Click the microphone to start talking with your AI study assistant'
                        }
                      </p>

                      {/* Microphone Button */}
                      <button
                        onClick={toggleMicrophone}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                          conversation.isSpeaking
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-purple-500 hover:bg-purple-600 text-white'
                        }`}
                        title={conversation.isSpeaking ? 'Stop' : 'Start talking'}
                      >
                        {conversation.isSpeaking ? (
                          <MicOff className="w-8 h-8" />
                        ) : (
                          <Mic className="w-8 h-8" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Status Bar */}
                  <div className="border-t border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-600">Connected</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Study Assistant</h3>
                    <p className="text-gray-600 mb-4">
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
                      className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors font-medium"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Connecting...' : 'Start Conversation'}
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