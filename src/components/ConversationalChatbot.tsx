import React, { useState, useRef, useEffect } from 'react';
import { Conversation } from '@elevenlabs/react';
import { MessageCircle, X, Mic, MicOff, Volume2, VolumeX, Minimize2, Maximize2 } from 'lucide-react';
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
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await getSignedUrl();
    }
  };

  // Handle closing the chatbot
  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setIsConnected(false);
    setSignedUrl(null);
    setError(null);
  };

  // Handle connection status changes
  const handleStatusChange = (status: any) => {
    console.log('Conversation status:', status);
    setIsConnected(status === 'connected');
    
    if (status === 'disconnected') {
      setIsConnected(false);
    }
  };

  // Handle conversation mode changes
  const handleModeChange = (mode: any) => {
    console.log('Conversation mode:', mode);
  };

  // Handle errors
  const handleError = (error: any) => {
    console.error('Conversation error:', error);
    setError('Connection error occurred');
    toast.error('AI assistant connection error');
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
                  {isConnected ? 'Connected' : isLoading ? 'Connecting...' : 'Ready to help'}
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
              ) : signedUrl ? (
                <div className="flex-1 relative">
                  <Conversation
                    signedUrl={signedUrl}
                    onStatusChange={handleStatusChange}
                    onModeChange={handleModeChange}
                    onError={handleError}
                    className="w-full h-full"
                  />
                  
                  {/* Connection Status Indicator */}
                  <div className="absolute top-4 right-4 flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-xs text-gray-600">
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
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
                      onClick={getSignedUrl}
                      className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors font-medium"
                    >
                      Start Conversation
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