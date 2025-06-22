import React, { useState } from 'react';
import { ArrowLeft, TestTube, Loader2, CheckCircle, XCircle, Languages, Copy } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { useTranslation } from '../hooks/useTranslation';
import { testLingoConnection, getLanguageName } from '../lib/lingo';
import toast from 'react-hot-toast';

interface LingoTestPageProps {
  onBack: () => void;
}

const LingoTestPage: React.FC<LingoTestPageProps> = ({ onBack }) => {
  const [testText, setTestText] = useState('Hello, how are you today? This is a test of the translation service.');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [translatedText, setTranslatedText] = useState('');
  
  const { 
    isTranslating, 
    currentLanguage, 
    translateSingle, 
    setLanguage 
  } = useTranslation('en');

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    
    try {
      const isConnected = await testLingoConnection();
      setConnectionStatus(isConnected ? 'success' : 'error');
      
      if (isConnected) {
        toast.success('✅ Lingo API connection successful!');
      } else {
        toast.error('❌ Lingo API connection failed');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus('error');
      toast.error('❌ Failed to test Lingo API connection');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleTranslate = async () => {
    if (!testText.trim()) {
      toast.error('Please enter some text to translate');
      return;
    }

    if (currentLanguage === 'en') {
      toast.error('Please select a target language other than English');
      return;
    }

    try {
      const result = await translateSingle(testText, currentLanguage, 'en');
      setTranslatedText(result);
      
      if (result !== testText) {
        toast.success(`✅ Translation to ${getLanguageName(currentLanguage)} completed!`);
      } else {
        toast.warning('⚠️ Translation returned original text (API may not be configured)');
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('❌ Translation failed');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Text copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy text');
    }
  };

  const sampleTexts = [
    'Hello, how are you today? This is a test of the translation service.',
    'The quick brown fox jumps over the lazy dog.',
    'Welcome to StudySnap! We help you learn more effectively with AI-powered tools.',
    'Education is the most powerful weapon which you can use to change the world.',
    'Learning never exhausts the mind. Knowledge is power.'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Lingo Translation API Test</h1>
              <p className="text-gray-600">Test the translation service without using OpenAI tokens</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
        {/* API Connection Test */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">API Connection Test</h2>
              <p className="text-gray-600">Verify that the Lingo API is properly configured</p>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4" />
                  <span>Test Connection</span>
                </>
              )}
            </button>
          </div>

          {/* Connection Status */}
          {connectionStatus !== 'idle' && (
            <div className={`p-4 rounded-lg border ${
              connectionStatus === 'success' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2">
                {connectionStatus === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={`font-medium ${
                  connectionStatus === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {connectionStatus === 'success' 
                    ? 'API connection successful! Translation service is working.' 
                    : 'API connection failed. Please check your API key configuration.'}
                </span>
              </div>
            </div>
          )}

          {/* API Key Status */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">API Key Configuration</h4>
            <div className="text-sm text-blue-800">
              <p>• API Key: {import.meta.env.VITE_LINGO_API_KEY ? '✅ Configured' : '❌ Not configured'}</p>
              <p>• Environment Variable: VITE_LINGO_API_KEY</p>
              {!import.meta.env.VITE_LINGO_API_KEY && (
                <p className="mt-2 text-red-600">⚠️ Please add VITE_LINGO_API_KEY to your .env file</p>
              )}
            </div>
          </div>
        </div>

        {/* Translation Test */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Translation Test</h2>
              <p className="text-gray-600">Test translating text to different languages</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Languages className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Target Language:</span>
                <LanguageSelector
                  selectedLanguage={currentLanguage}
                  onLanguageChange={setLanguage}
                  className="min-w-[160px]"
                />
              </div>
            </div>
          </div>

          {/* Sample Text Buttons */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Quick Test Texts:</p>
            <div className="flex flex-wrap gap-2">
              {sampleTexts.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => setTestText(sample)}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  Sample {index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Input Text */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text to Translate (English)
            </label>
            <div className="relative">
              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter text to translate..."
                className="w-full h-32 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <button
                onClick={() => copyToClipboard(testText)}
                className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {testText.length} characters
            </div>
          </div>

          {/* Translate Button */}
          <div className="mb-6">
            <button
              onClick={handleTranslate}
              disabled={isTranslating || !testText.trim() || currentLanguage === 'en'}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <Languages className="w-4 h-4" />
                  <span>Translate to {getLanguageName(currentLanguage)}</span>
                </>
              )}
            </button>
          </div>

          {/* Translation Result */}
          {translatedText && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Translation Result ({getLanguageName(currentLanguage)})
              </label>
              <div className="relative">
                <div className="w-full min-h-[8rem] p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-gray-900 leading-relaxed">{translatedText}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(translatedText)}
                  className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copy translation"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {translatedText.length} characters
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 mb-4">How to Use This Test</h3>
          <ol className="text-blue-800 space-y-2 text-sm">
            <li>1. <strong>Test Connection:</strong> Click "Test Connection" to verify your API key is working</li>
            <li>2. <strong>Select Language:</strong> Choose a target language from the dropdown</li>
            <li>3. <strong>Enter Text:</strong> Type or select sample text to translate</li>
            <li>4. <strong>Translate:</strong> Click the translate button to test the translation</li>
            <li>5. <strong>Verify Results:</strong> Check if the translation looks correct</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-blue-900 text-sm">
              <strong>Note:</strong> If the API key is not configured, the service will return the original text 
              without throwing errors, allowing the app to continue working normally.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LingoTestPage;