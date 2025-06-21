import React, { useState } from 'react';
import { X, Key, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { testTavusApiKey } from '../lib/tavus';
import toast from 'react-hot-toast';

interface ApiKeyManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeyUpdated: (newApiKey: string) => void;
  currentError?: string;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ 
  isOpen, 
  onClose, 
  onApiKeyUpdated, 
  currentError 
}) => {
  const [newApiKey, setNewApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleValidateAndSave = async () => {
    if (!newApiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const isValid = await testTavusApiKey(newApiKey.trim());
      
      if (isValid) {
        setValidationResult({
          isValid: true,
          message: 'API key is valid and working!'
        });
        
        // Save the API key
        localStorage.setItem('tavus_api_key', newApiKey.trim());
        onApiKeyUpdated(newApiKey.trim());
        
        toast.success('API key updated successfully!');
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
          setNewApiKey('');
          setValidationResult(null);
        }, 1500);
      } else {
        setValidationResult({
          isValid: false,
          message: 'Invalid API key or insufficient permissions'
        });
      }
    } catch (error: any) {
      console.error('API key validation error:', error);
      setValidationResult({
        isValid: false,
        message: error.message || 'Failed to validate API key'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    setNewApiKey('');
    setValidationResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Update Tavus API Key</h2>
          <p className="text-gray-600">
            {currentError || 'Your current API key has expired or is invalid. Please enter a new one to continue generating videos.'}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Tavus API Key
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your Tavus API key"
                disabled={isValidating}
              />
            </div>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div className={`p-4 rounded-lg border ${
              validationResult.isValid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2">
                {validationResult.isValid ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  validationResult.isValid ? 'text-green-800' : 'text-red-800'
                }`}>
                  {validationResult.message}
                </span>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How to get your Tavus API Key:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Go to <a href="https://app.tavus.io" target="_blank" rel="noopener noreferrer" className="underline">app.tavus.io</a></li>
              <li>2. Sign in to your account</li>
              <li>3. Navigate to Settings → API Keys</li>
              <li>4. Create a new API key or copy an existing one</li>
              <li>5. Paste it here and click "Validate & Save"</li>
            </ol>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={isValidating}
            >
              Cancel
            </button>
            <button
              onClick={handleValidateAndSave}
              disabled={isValidating || !newApiKey.trim()}
              className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <span>Validate & Save</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyManager;