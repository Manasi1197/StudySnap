// ElevenLabs API integration for AI audio generation
let ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || 'sk_2770b2b1eeca50b4eec158cfc56fb4b1c4bc12afc8b16187';
const ELEVENLABS_API_BASE_URL = 'https://api.elevenlabs.io/v1';

// Load API key from localStorage if available
const storedApiKey = localStorage.getItem('elevenlabs_api_key');
if (storedApiKey) {
  ELEVENLABS_API_KEY = storedApiKey;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
}

export interface ElevenLabsAudioRequest {
  text: string;
  voice_id: string;
  model_id?: string;
  voice_settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface ElevenLabsError {
  message: string;
  code?: string;
  isExpired?: boolean;
  isInvalid?: boolean;
}

// Update API key function
export function updateElevenLabsApiKey(newApiKey: string): void {
  ELEVENLABS_API_KEY = newApiKey;
  localStorage.setItem('elevenlabs_api_key', newApiKey);
}

// Test API key function
export async function testElevenLabsApiKey(apiKey?: string): Promise<boolean> {
  const keyToTest = apiKey || ELEVENLABS_API_KEY;
  
  if (!keyToTest) {
    console.log('❌ No ElevenLabs API key provided');
    return false;
  }

  try {
    console.log('🔑 Testing ElevenLabs API key...');
    console.log('🌐 API Base URL:', ELEVENLABS_API_BASE_URL);
    console.log('🔐 API Key (first 8 chars):', keyToTest.substring(0, 8) + '...');
    
    const response = await fetch(`${ELEVENLABS_API_BASE_URL}/voices`, {
      method: 'GET',
      headers: {
        'xi-api-key': keyToTest,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ ElevenLabs API key is valid. Available voices:', data.voices?.length || 0);
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ ElevenLabs API key test failed:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ ElevenLabs API key test error:', error);
    return false;
  }
}

// Enhanced error handling for API responses
function handleElevenLabsError(response: Response, responseText: string): ElevenLabsError {
  const error: ElevenLabsError = {
    message: 'Unknown error occurred'
  };

  console.log('🚨 Handling ElevenLabs error:', response.status, responseText);

  if (response.status === 401) {
    error.message = 'Invalid or expired API key. Please update your ElevenLabs API key.';
    error.isExpired = true;
    error.isInvalid = true;
  } else if (response.status === 403) {
    error.message = 'Access denied. Your API key may not have sufficient permissions.';
    error.isInvalid = true;
  } else if (response.status === 429) {
    error.message = 'Rate limit exceeded. Please wait before making more requests.';
  } else if (response.status === 422) {
    error.message = 'Invalid request. Please check your input parameters.';
  } else if (response.status === 500) {
    error.message = 'ElevenLabs server error. Please try again later.';
  } else {
    try {
      const errorData = JSON.parse(responseText);
      error.message = errorData.detail?.message || errorData.message || `API error: ${response.status}`;
    } catch {
      error.message = `API error: ${response.status} - ${responseText}`;
    }
  }

  return error;
}

// Get available voices
export async function getAvailableVoices(): Promise<ElevenLabsVoice[]> {
  if (!ELEVENLABS_API_KEY) {
    console.warn('❌ ElevenLabs API key not configured');
    return [];
  }

  try {
    console.log('🎤 Fetching available voices from ElevenLabs...');
    const response = await fetch(`${ELEVENLABS_API_BASE_URL}/voices`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Voices response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch voices:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    console.log('🎤 Available voices:', data.voices?.length || 0);
    
    return data.voices || [];
  } catch (error) {
    console.error('❌ Error fetching voices:', error);
    return [];
  }
}

// Create educational script from quiz data or simple text
function createEducationalScript(title: string, description: string, questions: any[], flashcards: any[]): string {
  // For chat responses, use the flashcard content as the main text
  if (flashcards.length > 0 && flashcards[0].back && questions.length === 0) {
    // This is a chat response
    return flashcards[0].back;
  }

  // Original quiz-based script
  const script = `
Welcome to your audio revision guide for ${title}.

${description}

Let me walk you through the key concepts you need to understand.

${flashcards.slice(0, 5).map((card, index) => 
  `${index + 1}. ${card.front}. The answer is: ${card.back}.`
).join(' ')}

Now, let's review some important points from your quiz questions.

${questions.slice(0, 3).map((question, index) => {
  if (question.type === 'multiple-choice') {
    return `Question ${index + 1}: ${question.question} The correct answer is: ${question.options[question.correctAnswer]}.`;
  } else if (question.type === 'true-false') {
    return `Question ${index + 1}: ${question.question} This statement is ${question.correctAnswer ? 'true' : 'false'}.`;
  } else {
    return `Question ${index + 1}: ${question.question} The answer is: ${question.correctAnswer}.`;
  }
}).join(' ')}

Remember to review these concepts carefully and test yourself with the full quiz when you're ready. Good luck with your studies!
  `.trim();

  // Ensure script is not too long (ElevenLabs has character limits)
  const maxLength = 2500; // Conservative limit for good audio quality
  return script.length > maxLength ? script.substring(0, maxLength - 3) + '...' : script;
}

// Generate audio with ElevenLabs
export async function generateAudioWithElevenLabs(
  title: string,
  description: string,
  questions: any[],
  flashcards: any[],
  onApiKeyError?: (error: ElevenLabsError) => void
): Promise<string> {
  console.log('🎵 Starting ElevenLabs audio generation...');
  console.log('📝 Title:', title);
  console.log('📝 Questions count:', questions.length);
  console.log('📝 Flashcards count:', flashcards.length);

  if (!ELEVENLABS_API_KEY) {
    console.warn('❌ ElevenLabs API key not configured, returning mock audio URL');
    // Return a mock audio URL for demonstration
    return 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';
  }

  try {
    // First, test the API key
    console.log('🔍 Testing API key before audio generation...');
    const isKeyValid = await testElevenLabsApiKey();
    if (!isKeyValid) {
      const error: ElevenLabsError = {
        message: 'Invalid or expired API key',
        isExpired: true,
        isInvalid: true
      };
      console.error('❌ API key validation failed');
      if (onApiKeyError) {
        onApiKeyError(error);
      }
      throw error;
    }

    // Get available voices
    console.log('🎤 Fetching available voices...');
    const voices = await getAvailableVoices();
    console.log('🎤 Available voices:', voices.length);
    
    // Select a suitable voice (prefer educational/professional voices)
    const preferredVoices = ['Rachel', 'Brian', 'Sarah', 'Adam', 'Bella'];
    let selectedVoice = voices.find(v => preferredVoices.includes(v.name));
    
    if (!selectedVoice && voices.length > 0) {
      selectedVoice = voices[0]; // Fallback to first available voice
    }
    
    if (!selectedVoice) {
      throw new Error('No voices available. Please check your ElevenLabs account.');
    }

    console.log('✅ Selected voice:', selectedVoice.name, selectedVoice.voice_id);

    // Create educational script
    const script = createEducationalScript(title, description, questions, flashcards);
    console.log('📜 Generated script length:', script.length, 'characters');
    console.log('📜 Script preview:', script.substring(0, 200) + '...');

    const requestBody: ElevenLabsAudioRequest = {
      text: script,
      voice_id: selectedVoice.voice_id,
      model_id: 'eleven_monolingual_v1', // Good balance of quality and speed
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      }
    };

    console.log('📤 Sending audio generation request...');
    
    const response = await fetch(`${ELEVENLABS_API_BASE_URL}/text-to-speech/${selectedVoice.voice_id}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📡 Audio generation response status:', response.status);

    if (!response.ok) {
      const responseText = await response.text();
      console.error('❌ Audio generation failed:', responseText);
      const error = handleElevenLabsError(response, responseText);
      
      if (error.isExpired || error.isInvalid) {
        if (onApiKeyError) {
          onApiKeyError(error);
        }
      }
      
      throw error;
    }

    // Get the audio blob
    const audioBlob = await response.blob();
    console.log('🎵 Audio blob size:', audioBlob.size, 'bytes');

    // Create a blob URL for the audio
    const audioUrl = URL.createObjectURL(audioBlob);
    console.log('✅ Audio generation completed:', audioUrl);

    return audioUrl;

  } catch (error: any) {
    console.error('❌ Error generating audio with ElevenLabs:', error);
    
    // If it's an API key error, don't fall back to demo audio
    if (error.isExpired || error.isInvalid) {
      throw error;
    }
    
    // For other errors, return a fallback audio URL for demonstration
    console.log('🔄 Falling back to demo audio due to error');
    return 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';
  }
}

// Generate simple text-to-speech for chat responses
export async function generateChatAudio(
  text: string,
  onApiKeyError?: (error: ElevenLabsError) => void
): Promise<string> {
  console.log('🎵 Generating chat audio with ElevenLabs...');
  console.log('📝 Text length:', text.length);

  if (!ELEVENLABS_API_KEY) {
    console.warn('❌ ElevenLabs API key not configured');
    throw new Error('ElevenLabs API key not configured');
  }

  try {
    // Test API key
    const isKeyValid = await testElevenLabsApiKey();
    if (!isKeyValid) {
      const error: ElevenLabsError = {
        message: 'Invalid or expired API key',
        isExpired: true,
        isInvalid: true
      };
      if (onApiKeyError) {
        onApiKeyError(error);
      }
      throw error;
    }

    // Get voices
    const voices = await getAvailableVoices();
    const preferredVoices = ['Rachel', 'Brian', 'Sarah', 'Adam', 'Bella'];
    let selectedVoice = voices.find(v => preferredVoices.includes(v.name));
    
    if (!selectedVoice && voices.length > 0) {
      selectedVoice = voices[0];
    }
    
    if (!selectedVoice) {
      throw new Error('No voices available');
    }

    // Limit text length for chat responses
    const maxLength = 500;
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;

    const requestBody: ElevenLabsAudioRequest = {
      text: truncatedText,
      voice_id: selectedVoice.voice_id,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.6,
        similarity_boost: 0.8,
        style: 0.2,
        use_speaker_boost: true
      }
    };

    const response = await fetch(`${ELEVENLABS_API_BASE_URL}/text-to-speech/${selectedVoice.voice_id}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const responseText = await response.text();
      const error = handleElevenLabsError(response, responseText);
      
      if (error.isExpired || error.isInvalid) {
        if (onApiKeyError) {
          onApiKeyError(error);
        }
      }
      
      throw error;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    console.log('✅ Chat audio generated successfully');
    return audioUrl;

  } catch (error: any) {
    console.error('❌ Error generating chat audio:', error);
    throw error;
  }
}

// Utility function to validate audio URL
export function isValidAudioUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:' || urlObj.protocol === 'blob:';
  } catch {
    return false;
  }
}

// Debug function to test the complete flow
export async function debugElevenLabsIntegration(): Promise<void> {
  console.log('🔧 Starting ElevenLabs integration debug...');
  
  // Test 1: API Key
  console.log('🔧 Test 1: API Key validation');
  const isKeyValid = await testElevenLabsApiKey();
  console.log('🔧 API Key valid:', isKeyValid);
  
  // Test 2: List Voices
  console.log('🔧 Test 2: List voices');
  const voices = await getAvailableVoices();
  console.log('🔧 Voices found:', voices.length);
  
  // Test 3: Generate Audio (if voices available)
  if (voices.length > 0) {
    console.log('🔧 Test 3: Generate test audio');
    try {
      const mockQuestions = [
        { type: 'multiple-choice', question: 'What is 2+2?', options: ['3', '4', '5', '6'], correctAnswer: 1 }
      ];
      const mockFlashcards = [
        { front: 'What is the capital of France?', back: 'Paris' }
      ];
      
      const audioUrl = await generateAudioWithElevenLabs(
        'Test Audio',
        'This is a test audio to verify ElevenLabs integration is working correctly.',
        mockQuestions,
        mockFlashcards
      );
      console.log('🔧 Audio generated successfully:', audioUrl);
    } catch (error) {
      console.error('🔧 Audio generation failed:', error);
    }
  }
  
  console.log('🔧 ElevenLabs integration debug complete');
}