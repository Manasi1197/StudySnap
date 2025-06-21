// Tavus API integration for AI video generation
const TAVUS_API_KEY = import.meta.env.VITE_TAVUS_API_KEY;
const TAVUS_API_BASE_URL = 'https://tavusapi.com/v2';

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
}

export async function generateVideoWithTavus(
  title: string, 
  description: string
): Promise<string> {
  if (!TAVUS_API_KEY) {
    console.warn('Tavus API key not configured, returning mock video URL');
    // Return a mock video URL for demonstration
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  }

  try {
    // Create a comprehensive script for the video
    const script = `
Hello! Welcome to this educational overview on ${title}.

${description}

In this video, we'll explore the key concepts and important points that will help you understand this topic better. 

This material covers essential information that you should review before taking the quiz. Pay attention to the main ideas and how they connect to each other.

Remember to take notes as you watch, and feel free to pause and replay sections as needed. Good luck with your studies!
    `.trim();

    const requestBody: TavusVideoRequest = {
      script: script,
      video_name: `Educational Video: ${title}`,
      // You can customize these based on your Tavus account settings
      replica_id: 'default', // Use your preferred replica ID
    };

    const response = await fetch(`${TAVUS_API_BASE_URL}/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TAVUS_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Tavus API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const videoData: TavusVideoResponse = await response.json();

    // If video is immediately available, return the URL
    if (videoData.video_url) {
      return videoData.video_url;
    }

    // If video is still generating, poll for completion
    if (videoData.video_id) {
      return await pollForVideoCompletion(videoData.video_id);
    }

    throw new Error('No video URL or ID returned from Tavus API');

  } catch (error) {
    console.error('Error generating video with Tavus:', error);
    
    // Return a fallback video URL for demonstration
    console.log('Falling back to demo video due to error:', error);
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  }
}

async function pollForVideoCompletion(videoId: string, maxAttempts: number = 30): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${TAVUS_API_BASE_URL}/videos/${videoId}`, {
        headers: {
          'x-api-key': TAVUS_API_KEY!,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check video status: ${response.status}`);
      }

      const videoData: TavusVideoResponse = await response.json();

      if (videoData.status === 'completed' && videoData.video_url) {
        return videoData.video_url;
      }

      if (videoData.status === 'failed') {
        throw new Error('Video generation failed');
      }

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
      console.error(`Polling attempt ${attempt + 1} failed:`, error);
      
      // If this is the last attempt, throw the error
      if (attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error('Video generation timed out');
}

export async function getVideoStatus(videoId: string): Promise<TavusVideoResponse> {
  if (!TAVUS_API_KEY) {
    throw new Error('Tavus API key not configured');
  }

  const response = await fetch(`${TAVUS_API_BASE_URL}/videos/${videoId}`, {
    headers: {
      'x-api-key': TAVUS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get video status: ${response.status}`);
  }

  return response.json();
}

export async function listReplicas(): Promise<any[]> {
  if (!TAVUS_API_KEY) {
    throw new Error('Tavus API key not configured');
  }

  const response = await fetch(`${TAVUS_API_BASE_URL}/replicas`, {
    headers: {
      'x-api-key': TAVUS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list replicas: ${response.status}`);
  }

  const data = await response.json();
  return data.replicas || [];
}