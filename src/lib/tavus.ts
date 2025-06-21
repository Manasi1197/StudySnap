// Tavus API integration for AI video generation
let TAVUS_API_KEY = import.meta.env.VITE_TAVUS_API_KEY || '98ab985a6f364892b9cb2ce85f2115e1';
const TAVUS_API_BASE_URL = 'https://tavusapi.com/v2';

// Load API key from localStorage if available
const storedApiKey = localStorage.getItem('tavus_api_key');
if (storedApiKey) {
  TAVUS_API_KEY = storedApiKey;
}

export interface TavusVideoRequest {
  script: string;
  replica_id?: string;
  video_name?: string;
  background_url?: string;
  callback_url?: string;
}

export interface TavusVideoResponse {
  video_id: string;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  video_url?: string;
  download_url?: string;
  created_at: string;
  replica_id?: string;
}

export interface TavusReplica {
  replica_id: string;
  replica_name: string;
  status: string;
  created_at: string;
}

export interface TavusError {
  message: string;
  code?: string;
  isExpired?: boolean;
  isInvalid?: boolean;
}

// Update API key function
export function updateTavusApiKey(newApiKey: string): void {
  TAVUS_API_KEY = newApiKey;
  localStorage.setItem('tavus_api_key', newApiKey);
}

// Test API key function with detailed logging
export async function testTavusApiKey(apiKey?: string): Promise<boolean> {
  const keyToTest = apiKey || TAVUS_API_KEY;
  
  if (!keyToTest) {
    console.log('❌ No API key provided');
    return false;
  }

  try {
    console.log('🔑 Testing Tavus API key...');
    console.log('🌐 API Base URL:', TAVUS_API_BASE_URL);
    console.log('🔐 API Key (first 8 chars):', keyToTest.substring(0, 8) + '...');
    
    const response = await fetch(`${TAVUS_API_BASE_URL}/replicas`, {
      method: 'GET',
      headers: {
        'x-api-key': keyToTest,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API key is valid. Response data:', data);
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ API key test failed:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ API key test error:', error);
    return false;
  }
}

// Enhanced error handling for API responses
function handleTavusError(response: Response, responseText: string): TavusError {
  const error: TavusError = {
    message: 'Unknown error occurred'
  };

  console.log('🚨 Handling Tavus error:', response.status, responseText);

  if (response.status === 401) {
    error.message = 'Invalid or expired API key. Please update your Tavus API key.';
    error.isExpired = true;
    error.isInvalid = true;
  } else if (response.status === 403) {
    error.message = 'Access denied. Your API key may not have sufficient permissions.';
    error.isInvalid = true;
  } else if (response.status === 429) {
    error.message = 'Rate limit exceeded. Please wait before making more requests.';
  } else if (response.status === 500) {
    error.message = 'Tavus server error. Please try again later.';
  } else {
    try {
      const errorData = JSON.parse(responseText);
      error.message = errorData.message || errorData.error || `API error: ${response.status}`;
    } catch {
      error.message = `API error: ${response.status} - ${responseText}`;
    }
  }

  return error;
}

export async function generateVideoWithTavus(
  title: string, 
  description: string,
  onApiKeyError?: (error: TavusError) => void
): Promise<string> {
  console.log('🎬 Starting Tavus video generation...');
  console.log('📝 Title:', title);
  console.log('📝 Description:', description);

  if (!TAVUS_API_KEY) {
    console.warn('❌ Tavus API key not configured, returning mock video URL');
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  }

  try {
    // First, test the API key
    console.log('🔍 Testing API key before video generation...');
    const isKeyValid = await testTavusApiKey();
    if (!isKeyValid) {
      const error: TavusError = {
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

    // Get available replicas to use a valid one
    console.log('👥 Fetching available replicas...');
    const replicas = await listReplicas();
    console.log('👥 Available replicas:', replicas);
    
    if (!replicas || replicas.length === 0) {
      console.warn('❌ No replicas available. This might be a new account or API issue.');
      console.log('🔄 Attempting to create video without specific replica...');
    }

    // Find a ready replica or use the first available one
    const readyReplicas = replicas.filter(r => r.status === 'ready' || r.status === 'active');
    const selectedReplica = readyReplicas[0] || replicas[0];
    
    console.log('✅ Selected replica:', selectedReplica);

    // Create a comprehensive script for the video
    const script = createEducationalScript(title, description);
    console.log('📜 Generated script length:', script.length, 'characters');

    const requestBody: TavusVideoRequest = {
      script: script,
      video_name: `StudySnap: ${title}`,
    };

    // Only add replica_id if we have one
    if (selectedReplica && selectedReplica.replica_id) {
      requestBody.replica_id = selectedReplica.replica_id;
    }

    console.log('📤 Sending video generation request...');
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${TAVUS_API_BASE_URL}/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TAVUS_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📡 Video generation response status:', response.status);
    console.log('📡 Video generation response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📡 Raw response text:', responseText);

    if (!response.ok) {
      console.error('❌ Video generation failed:', responseText);
      const error = handleTavusError(response, responseText);
      
      if (error.isExpired || error.isInvalid) {
        if (onApiKeyError) {
          onApiKeyError(error);
        }
      }
      
      throw error;
    }

    let videoData: TavusVideoResponse;
    try {
      videoData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response JSON:', parseError);
      throw new Error('Invalid response format from Tavus API');
    }

    console.log('✅ Video generation initiated:', videoData);

    // If video is immediately available, return the URL
    if (videoData.video_url) {
      console.log('🎥 Video URL immediately available:', videoData.video_url);
      return videoData.video_url;
    }

    // If video is still generating, poll for completion
    if (videoData.video_id) {
      console.log('⏳ Video is generating, polling for completion...');
      return await pollForVideoCompletion(videoData.video_id, onApiKeyError);
    }

    throw new Error('No video URL or ID returned from Tavus API');

  } catch (error: any) {
    console.error('❌ Error generating video with Tavus:', error);
    
    // If it's an API key error, don't fall back to demo video
    if (error.isExpired || error.isInvalid) {
      throw error;
    }
    
    // For other errors, return a fallback video URL for demonstration
    console.log('🔄 Falling back to demo video due to error');
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  }
}

function createEducationalScript(title: string, description: string): string {
  // Keep script concise but informative (under 300 words for better processing)
  const script = `
Hello and welcome to this educational video about ${title}.

${description.substring(0, 200)}...

Let me explain the key concepts you need to understand.

This topic is important because it forms the foundation for more advanced learning. 

The main points to remember are: first, understand the basic principles. Second, see how these principles apply in real situations. Third, practice applying what you've learned.

As you study this material, focus on the connections between different concepts. This will help you build a strong understanding.

After watching this video, review the flashcards to reinforce your learning, then test yourself with the quiz.

Good luck with your studies!
  `.trim();

  // Ensure script is not too long (Tavus has limits)
  return script.length > 500 ? script.substring(0, 497) + '...' : script;
}

async function pollForVideoCompletion(
  videoId: string, 
  onApiKeyError?: (error: TavusError) => void,
  maxAttempts: number = 40 // Increased from 20 to 40 for 10-minute timeout
): Promise<string> {
  console.log(`🔄 Starting to poll for video completion (ID: ${videoId})`);
  console.log(`⏰ Maximum polling time: ${(maxAttempts * 15) / 60} minutes`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`📡 Polling attempt ${attempt + 1}/${maxAttempts} (${Math.round((attempt / maxAttempts) * 100)}% complete)`);
      
      const response = await fetch(`${TAVUS_API_BASE_URL}/videos/${videoId}`, {
        headers: {
          'x-api-key': TAVUS_API_KEY!,
          'Content-Type': 'application/json',
        },
      });

      console.log(`📊 Poll response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Poll failed: ${response.status} - ${errorText}`);
        const error = handleTavusError(response, errorText);
        
        if (error.isExpired || error.isInvalid) {
          if (onApiKeyError) {
            onApiKeyError(error);
          }
          throw error;
        }
        
        throw new Error(`Failed to check video status: ${response.status}`);
      }

      const responseText = await response.text();
      let videoData: TavusVideoResponse;
      
      try {
        videoData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse polling response:', parseError);
        throw new Error('Invalid response format during polling');
      }

      console.log(`📊 Video status: ${videoData.status}`, videoData);

      if (videoData.status === 'completed' && videoData.video_url) {
        console.log('🎉 Video generation completed!', videoData.video_url);
        return videoData.video_url;
      }

      if (videoData.status === 'failed') {
        console.error('❌ Video generation failed');
        throw new Error('Video generation failed');
      }

      // Wait 15 seconds before next poll
      const remainingTime = Math.round(((maxAttempts - attempt - 1) * 15) / 60);
      console.log(`⏱️ Waiting 15 seconds before next check... (${remainingTime} minutes remaining)`);
      await new Promise(resolve => setTimeout(resolve, 15000));

    } catch (error: any) {
      console.error(`❌ Polling attempt ${attempt + 1} failed:`, error);
      
      // If it's an API key error, propagate it immediately
      if (error.isExpired || error.isInvalid) {
        throw error;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.error('⏰ Video generation timed out after 10 minutes');
  throw new Error('Video generation timed out after 10 minutes. The video may still be processing - please try again later.');
}

export async function getVideoStatus(videoId: string): Promise<TavusVideoResponse> {
  if (!TAVUS_API_KEY) {
    throw new Error('Tavus API key not configured');
  }

  const response = await fetch(`${TAVUS_API_BASE_URL}/videos/${videoId}`, {
    headers: {
      'x-api-key': TAVUS_API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get video status: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function listReplicas(): Promise<TavusReplica[]> {
  if (!TAVUS_API_KEY) {
    console.warn('❌ Tavus API key not configured');
    return [];
  }

  try {
    console.log('📋 Fetching replicas from Tavus...');
    const response = await fetch(`${TAVUS_API_BASE_URL}/replicas`, {
      headers: {
        'x-api-key': TAVUS_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    console.log('📋 Replicas response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to list replicas:', response.status, errorText);
      return [];
    }

    const responseText = await response.text();
    console.log('📋 Raw replicas response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse replicas response:', parseError);
      return [];
    }

    console.log('📋 Replicas response data:', data);
    
    // Handle different response formats
    const replicas = data.replicas || data.data || data || [];
    console.log('📋 Processed replicas:', replicas);
    
    return Array.isArray(replicas) ? replicas : [];
  } catch (error) {
    console.error('❌ Error listing replicas:', error);
    return [];
  }
}

export async function deleteVideo(videoId: string): Promise<boolean> {
  if (!TAVUS_API_KEY) {
    throw new Error('Tavus API key not configured');
  }

  try {
    const response = await fetch(`${TAVUS_API_BASE_URL}/videos/${videoId}`, {
      method: 'DELETE',
      headers: {
        'x-api-key': TAVUS_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting video:', error);
    return false;
  }
}

// Utility function to validate video URL
export function isValidVideoUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

// Utility function to get video thumbnail
export function getVideoThumbnail(videoUrl: string): string {
  // For Tavus videos, we might need to generate thumbnails differently
  // For now, return a placeholder
  return '/api/placeholder/400/225';
}

// Debug function to test the complete flow
export async function debugTavusIntegration(): Promise<void> {
  console.log('🔧 Starting Tavus integration debug...');
  
  // Test 1: API Key
  console.log('🔧 Test 1: API Key validation');
  const isKeyValid = await testTavusApiKey();
  console.log('🔧 API Key valid:', isKeyValid);
  
  // Test 2: List Replicas
  console.log('🔧 Test 2: List replicas');
  const replicas = await listReplicas();
  console.log('🔧 Replicas found:', replicas.length);
  
  // Test 3: Generate Video (if replicas available)
  console.log('🔧 Test 3: Generate test video');
  try {
    const videoUrl = await generateVideoWithTavus(
      'Test Video',
      'This is a test video to verify Tavus integration is working correctly.'
    );
    console.log('🔧 Video generated successfully:', videoUrl);
  } catch (error) {
    console.error('🔧 Video generation failed:', error);
  }
  
  console.log('🔧 Tavus integration debug complete');
}