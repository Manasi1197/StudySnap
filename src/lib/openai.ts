import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, API calls should go through your backend
});

export interface GenerateQuizRequest {
  content: string;
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  questionTypes: string[];
  includeFlashcards: boolean;
  language: string;
}

export interface GeneratedQuizResponse {
  title: string;
  description: string;
  questions: Array<{
    id: string;
    type: string;
    question: string;
    options?: string[];
    correctAnswer: string | number;
    explanation: string;
    difficulty: string;
    topic: string;
  }>;
  flashcards: Array<{
    id: string;
    front: string;
    back: string;
    topic: string;
  }>;
}

// Rate limiting helper
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests for GPT-4o

async function rateLimitedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  return requestFn();
}

// Helper function to clean JSON response from markdown code blocks
function cleanJsonResponse(content: string): string {
  // Remove markdown code block delimiters
  let cleaned = content.trim();
  
  // Remove ```json at the beginning
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  
  // Remove ``` at the end
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  return cleaned.trim();
}

export async function generateQuizWithAI(request: GenerateQuizRequest): Promise<GeneratedQuizResponse> {
  // GPT-4o can handle longer content better
  const maxContentLength = 8000;
  const truncatedContent = request.content.length > maxContentLength 
    ? request.content.substring(0, maxContentLength) + "..."
    : request.content;

  const prompt = `
You are an expert educational content creator with deep knowledge across all academic subjects. Generate a comprehensive, high-quality quiz based on the following content:

CONTENT:
${truncatedContent}

REQUIREMENTS:
- Generate exactly ${request.questionCount} questions
- Difficulty level: ${request.difficulty}
- Question types: ${request.questionTypes.join(', ')}
- Language: ${request.language}
- ${request.includeFlashcards ? 'Include flashcards for key concepts' : 'No flashcards needed'}

Create questions that:
1. Test deep understanding, not just memorization
2. Are clearly written and unambiguous
3. Have educational value and promote learning
4. Cover the most important concepts from the content
5. Include detailed explanations that help students learn

Please respond with a JSON object in this exact format:
{
  "title": "Engaging quiz title based on content",
  "description": "Clear description of what this quiz covers and learning objectives",
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice|true-false|fill-blank|short-answer",
      "question": "Well-crafted question text",
      "options": ["option1", "option2", "option3", "option4"], // only for multiple-choice
      "correctAnswer": "correct answer or index for multiple choice",
      "explanation": "Detailed explanation that helps students understand the concept",
      "difficulty": "easy|medium|hard",
      "topic": "specific topic this question covers"
    }
  ],
  "flashcards": [
    {
      "id": "f1",
      "front": "Key term, concept, or question",
      "back": "Clear, comprehensive definition or answer",
      "topic": "subject area"
    }
  ]
}

Ensure all content is educationally sound and promotes effective learning.
`;

  try {
    const response = await rateLimitedRequest(async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o", // Using GPT-4o for better quality
        messages: [
          {
            role: "system",
            content: "You are an expert educational content creator with advanced pedagogical knowledge. Always respond with valid JSON only. Create high-quality, educationally valuable content."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000 // GPT-4o can handle more tokens efficiently
      });
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Clean the response to remove markdown code blocks before parsing
    const cleanedContent = cleanJsonResponse(content);

    // Parse the JSON response
    const parsedResponse = JSON.parse(cleanedContent);
    
    // Ensure IDs are present
    parsedResponse.questions = parsedResponse.questions.map((q: any, index: number) => ({
      ...q,
      id: q.id || `q${index + 1}`
    }));
    
    if (parsedResponse.flashcards) {
      parsedResponse.flashcards = parsedResponse.flashcards.map((f: any, index: number) => ({
        ...f,
        id: f.id || `f${index + 1}`
      }));
    }

    return parsedResponse;
  } catch (error: any) {
    console.error('Error generating quiz with AI:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    } else if (error.status === 401) {
      throw new Error('Invalid API key. Please check your OpenAI API key configuration.');
    } else if (error.status === 403) {
      throw new Error('Access denied. Please check your OpenAI account status and billing.');
    } else if (error.status === 500) {
      throw new Error('OpenAI service error. Please try again later.');
    }
    
    throw new Error('Failed to generate quiz. Please try again.');
  }
}

export async function extractTextFromImage(imageBase64: string): Promise<string> {
  const prompt = `
Please extract all text content from this image. If it contains educational material like notes, diagrams, or textbook content, provide a clean, well-formatted transcription. If there are any diagrams or visual elements, describe them briefly.

Return only the extracted text content, formatted clearly and ready for educational use.
`;

  try {
    const response = await rateLimitedRequest(async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o", // GPT-4o has excellent vision capabilities
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: "high" // Use high detail for better text extraction
                }
              }
            ]
          }
        ],
        max_tokens: 1500
      });
    });

    return response.choices[0]?.message?.content || '';
  } catch (error: any) {
    console.error('Error extracting text from image:', error);
    
    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please wait before uploading more images.');
    }
    
    throw new Error('Failed to extract text from image');
  }
}

export async function generateVideoExplanation(question: string, explanation: string): Promise<string> {
  // This would integrate with Tavus API for video generation
  // For now, return a placeholder
  console.log('Generating video explanation for:', question);
  return 'https://example.com/video-explanation';
}

export async function translateContent(content: string, targetLanguage: string): Promise<string> {
  const prompt = `
Translate the following educational content to ${targetLanguage}. Maintain the educational context and technical terms appropriately. Ensure the translation is natural and pedagogically sound:

${content}
`;

  try {
    const response = await rateLimitedRequest(async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional translator specializing in educational content. Translate to ${targetLanguage} while preserving technical accuracy and educational value.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });
    });

    return response.choices[0]?.message?.content || content;
  } catch (error: any) {
    console.error('Error translating content:', error);
    
    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please wait before translating more content.');
    }
    
    throw new Error('Failed to translate content');
  }
}