import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  X, 
  Minimize2, 
  Maximize2,
  Bot,
  User,
  Loader2,
  AlertCircle,
  Settings
} from 'lucide-react';
import { generateChatResponse, ChatMessage } from '../lib/openai';
import { generateAudioWithElevenLabs, updateElevenLabsApiKey } from '../lib/elevenlabs';
import ApiKeyManager from './ApiKeyManager';
import toast from 'react-hot-toast';

interface ChatbotWidgetProps {
  isVisible?: boolean;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ isVisible = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showApiKeyManager, setShowApiKeyManager] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string>('');

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          console.log('🎤 Speech recognition started');
          setIsListening(true);
        };

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          console.log('🎤 Speech recognized:', transcript);
          setInputText(transcript);
          setIsListening(false);
          
          // Auto-send the message
          handleSendMessage(transcript);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('🎤 Speech recognition error:', event.error);
          setIsListening(false);
          
          if (event.error === 'not-allowed') {
            toast.error('Microphone access denied. Please enable microphone permissions.');
          } else if (event.error === 'no-speech') {
            toast.error('No speech detected. Please try again.');
          } else {
            toast.error('Speech recognition error. Please try again.');
          }
        };

        recognitionRef.current.onend = () => {
          console.log('🎤 Speech recognition ended');
          setIsListening(false);
        };
      }
    } else {
      console.warn('Speech recognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: 'Hi! I\'m StudySnap AI, your personal study assistant. I can help you with learning concepts, study strategies, and answer questions about your studies. How can I help you today?',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isProcessing) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast.error('Could not start voice recognition. Please try again.');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputText.trim();
    if (!text || isProcessing) return;

    setIsProcessing(true);
    setInputText('');

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Generate AI response
      console.log('🤖 Generating AI response...');
      const response = await generateChatResponse(text, messages);

      // Add AI message
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Generate and play audio if enabled
      if (audioEnabled) {
        try {
          console.log('🎵 Generating audio response...');
          setIsSpeaking(true);
          
          const audioUrl = await generateAudioWithElevenLabs(
            'StudySnap AI Response',
            'AI assistant response for conversational chat',
            [], // No questions for chat
            [{ front: 'Response', back: response, topic: 'chat' }], // Use response as flashcard content
            (error) => {
              console.error('ElevenLabs API key error:', error);
              setApiKeyError(error.message);
              setShowApiKeyManager(true);
            }
          );

          if (audioUrl) {
            // Play the audio
            if (audioRef.current) {
              audioRef.current.src = audioUrl;
              audioRef.current.play().catch(error => {
                console.error('Audio playback error:', error);
                toast.error('Could not play audio response');
              });
            }
          }
        } catch (error: any) {
          console.error('Audio generation error:', error);
          if (error.isExpired || error.isInvalid) {
            setApiKeyError(error.message);
            setShowApiKeyManager(true);
          } else {
            toast.error('Could not generate audio response');
          }
        } finally {
          setIsSpeaking(false);
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to get AI response');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    toast.success('Conversation cleared');
  };

  const handleApiKeyUpdate = (newApiKey: string) => {
    updateElevenLabsApiKey(newApiKey);
    setApiKeyError('');
    setShowApiKeyManager(false);
    toast.success('ElevenLabs API key updated successfully!');
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center z-50"
          title="Open StudySnap AI Assistant"
        >
          <MessageCircle className="w-8 h-8" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
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
                <h3 className="font-semibold">StudySnap AI</h3>
                <p className="text-xs opacity-80">
                  {isProcessing ? 'Thinking...' : isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Online'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                title={audioEnabled ? 'Disable audio' : 'Enable audio'}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[440px]">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start space-x-2 max-w-[80%] ${
                      message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === 'user' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-purple-100 text-purple-600'
                      }`}>
                        {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`p-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-800 rounded-bl-md'
                      }`}>
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-2 max-w-[80%]">
                      <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-gray-100 text-gray-800 p-3 rounded-2xl rounded-bl-md">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message or use voice..."
                      className="w-full p-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={isProcessing || isListening}
                    />
                    {inputText && (
                      <button
                        onClick={() => handleSendMessage()}
                        disabled={isProcessing}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-purple-500 hover:text-purple-600 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isProcessing}
                    className={`p-3 rounded-xl transition-all duration-200 ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-purple-500 text-white hover:bg-purple-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                </div>

                {messages.length > 1 && (
                  <button
                    onClick={clearConversation}
                    className="mt-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Clear conversation
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden audio element for TTS playback */}
      <audio
        ref={audioRef}
        onEnded={() => setIsSpeaking(false)}
        onError={() => {
          setIsSpeaking(false);
          console.error('Audio playback error');
        }}
        className="hidden"
      />

      {/* API Key Manager Modal */}
      <ApiKeyManager
        isOpen={showApiKeyManager}
        onClose={() => setShowApiKeyManager(false)}
        onApiKeyUpdated={handleApiKeyUpdate}
        currentError={apiKeyError}
      />
    </>
  );
};

export default ChatbotWidget;