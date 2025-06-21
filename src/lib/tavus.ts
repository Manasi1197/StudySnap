// Tavus API integration for AI video generation
const TAVUS_API_KEY = import.meta.env.VITE_TAVUS_API_KEY || '98ab985a6f364892b9cb2ce85f2115e1';
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
  replica_id?: string;
}

export interface TavusReplica {
  replica_id: string;
  replica_name: string;
  status: string;
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
    console.log('🎬 Starting Tavus video generation...');
    
    // First, get available replicas to use a valid one
    const replicas = await listReplicas();
    const defaultReplica = replicas.find(r => r.status === 'ready') || replicas[0];
    
    if (!defaultReplica) {
      console.warn('No available replicas found, using fallback video');
      return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    }

    // Create a comprehensive script for the video
    const script = createEducationalScript(title, description);

    const requestBody: TavusVideoRequest = {
      script: script,
      video_name: `StudySnap: ${title}`,
      replica_id: defaultReplica.replica_id,
    };

    console.log('📝 Sending video generation request to Tavus...');
    
    const response = await fetch(`${TAVUS_API_BASE_URL}/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TAVUS_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tavus API error response:', errorText);
      throw new Error(`Tavus API error: ${response.status} - ${errorText}`);
    }

    const videoData: TavusVideoResponse = await response.json();
    console.log('✅ Video generation initiated:', videoData);

    // If video is immediately available, return the URL
    if (videoData.video_url) {
      console.log('🎥 Video URL immediately available:', videoData.video_url);
      return videoData.video_url;
    }

    // If video is still generating, poll for completion
    if (videoData.video_id) {
      console.log('⏳ Video is generating, polling for completion...');
      return await pollForVideoCompletion(videoData.video_id);
    }

    throw new Error('No video URL or ID returned from Tavus API');

  } catch (error) {
    console.error('❌ Error generating video with Tavus:', error);
    
    // Return a fallback video URL for demonstration
    console.log('🔄 Falling back to demo video due to error');
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  }
}

function createEducationalScript(title: string, description: string): string {
  return `
Hello and welcome to this educational video on ${title}!

I'm excited to guide you through this important topic today. Let's dive right in.

${description}

This material is designed to help you understand the key concepts and prepare you for your upcoming quiz. 

Here are the main points we'll be covering:

First, we'll explore the fundamental concepts that form the foundation of this topic. Understanding these basics is crucial for grasping the more complex ideas that follow.

Next, we'll examine how these concepts apply in real-world scenarios. This practical application will help you see the relevance and importance of what you're learning.

We'll also discuss common misconceptions and pitfalls that students often encounter. Being aware of these will help you avoid similar mistakes.

Finally, we'll review some key strategies for remembering and applying this information effectively.

As you watch this video, I encourage you to take notes on the main points. Feel free to pause and replay any sections that you find challenging.

Remember, learning is a process, and it's perfectly normal to need to review material multiple times before it fully clicks.

After watching this video, I recommend reviewing the flashcards to reinforce your understanding, and then testing yourself with the quiz.

Good luck with your studies, and remember - you've got this! Let's begin our exploration of ${title}.
  `.trim();
}

async function pollForVideoCompletion(videoId: string, maxAttempts: number = 60): Promise<string> {
  console.log(`🔄 Starting to poll for video completion (ID: ${videoId})`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`📡 Polling attempt ${attempt + 1}/${maxAttempts}`);
      
      const response = await fetch(`${TAVUS_API_BASE_URL}/videos/${videoId}`, {
        headers: {
          'x-api-key': TAVUS_API_KEY!,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check video status: ${response.status}`);
      }

      const videoData: TavusVideoResponse = await response.json();
      console.log(`📊 Video status: ${videoData.status}`);

      if (videoData.status === 'completed' && videoData.video_url) {
        console.log('🎉 Video generation completed!', videoData.video_url);
        return videoData.video_url;
      }

      if (videoData.status === 'failed') {
        console.error('❌ Video generation failed');
        throw new Error('Video generation failed');
      }

      // Wait 10 seconds before next poll (Tavus videos can take a while)
      console.log('⏱️ Waiting 10 seconds before next check...');
      await new Promise(resolve => setTimeout(resolve, 10000));

    } catch (error) {
      console.error(`❌ Polling attempt ${attempt + 1} failed:`, error);
      
      // If this is the last attempt, throw the error
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.error('⏰ Video generation timed out');
  throw new Error('Video generation timed out after 10 minutes');
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
    const errorText = await response.text();
    throw new Error(`Failed to get video status: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function listReplicas(): Promise<TavusReplica[]> {
  if (!TAVUS_API_KEY) {
    console.warn('Tavus API key not configured');
    return [];
  }

  try {
    const response = await fetch(`${TAVUS_API_BASE_URL}/replicas`, {
      headers: {
        'x-api-key': TAVUS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to list replicas:', errorText);
      return [];
    }

    const data = await response.json();
    console.log('📋 Available replicas:', data);
    return data.replicas || [];
  } catch (error) {
    console.error('Error listing replicas:', error);
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