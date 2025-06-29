import OpenAI from 'openai';

// Initialize OpenAI client lazily to avoid errors when API key is not set
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your .env file.');
    }
    
    openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true // Note: In production, API calls should go through your backend
    });
  }
  
  return openaiClient;
}

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
    correctAnswer: string | number | boolean;
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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Rate limiting helper
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

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

export async function generateChatResponse(
  message: string, 
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  const openai = getOpenAIClient();
  
  console.log('🤖 Generating chat response with OpenAI...');
  console.log('💬 User message:', message);
  console.log('📚 Conversation history length:', conversationHistory.length);

  // Create system prompt for StudySnap assistant
  const systemPrompt = `You are StudySnap AI, a helpful and knowledgeable study assistant integrated into the StudySnap learning platform. Your role is to help students with their studies, answer questions about learning topics, provide study tips, and assist with educational content.

Key guidelines:
- Be conversational, friendly, and encouraging
- Provide clear, concise, and helpful responses
- Focus on educational content and study-related topics
- If asked about StudySnap features, explain how the platform can help with studying
- Keep responses under 150 words for natural conversation flow
- Be supportive and motivating for students
- If you don't know something specific, be honest and suggest alternative resources

You can help with:
- Explaining concepts and topics
- Study strategies and techniques
- Quiz and flashcard creation tips
- Learning motivation and productivity
- General academic questions
- StudySnap platform features

Remember: You're having a voice conversation, so keep responses natural and conversational.`;

  // Convert conversation history to OpenAI format
  const messages: any[] = [
    { role: 'system', content: systemPrompt }
  ];

  // Add conversation history (limit to last 10 messages to avoid token limits)
  const recentHistory = conversationHistory.slice(-10);
  recentHistory.forEach(msg => {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  });

  // Add current user message
  messages.push({
    role: 'user',
    content: message
  });

  try {
    console.log('📤 Sending chat request to OpenAI...');
    const response = await rateLimitedRequest(async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        temperature: 0.7,
        max_tokens: 300, // Keep responses concise for voice
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });
    });

    console.log('📥 Received chat response from OpenAI');
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    console.log('✅ Chat response generated successfully');
    return content.trim();

  } catch (error: any) {
    console.error('❌ Error generating chat response:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 429) {
      throw new Error('I\'m getting too many requests right now. Please wait a moment and try again.');
    } else if (error.status === 401) {
      throw new Error('There\'s an issue with my configuration. Please check the API settings.');
    } else if (error.status === 403) {
      throw new Error('Access denied. Please check the account status.');
    } else if (error.status === 500) {
      throw new Error('I\'m experiencing technical difficulties. Please try again in a moment.');
    } else if (error.code === 'insufficient_quota') {
      throw new Error('The service quota has been exceeded. Please try again later.');
    }
    
    throw new Error(`I encountered an error: ${error.message || 'Something went wrong'}`);
  }
}

export async function generateQuizWithAI(request: GenerateQuizRequest): Promise<GeneratedQuizResponse> {
  const openai = getOpenAIClient();
  
  console.log('🤖 Starting OpenAI quiz generation...');
  console.log('📊 Request details:', {
    contentLength: request.content.length,
    questionCount: request.questionCount,
    difficulty: request.difficulty,
    questionTypes: request.questionTypes,
    includeFlashcards: request.includeFlashcards,
    language: request.language
  });
  
  // Truncate content if too long
  const maxContentLength = 12000; // Increased for GPT-4
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

CRITICAL QUESTION GUIDELINES:
1. For multiple-choice questions: Provide 4 clear, distinct options with only ONE correct answer
2. For true-false questions: Create statements that are definitively true or false
3. For fill-in-the-blank questions: Design questions where the answer is a single word or short phrase (2-3 words maximum)
4. NO questions requiring long sentence answers or essays
5. Focus on factual knowledge, definitions, and key concepts
6. Ensure answers are unambiguous and can be clearly verified

Create questions that:
1. Test understanding of key concepts and facts from the provided content
2. Are clearly written and unambiguous
3. Have definitive, verifiable answers
4. Cover the most important concepts from the content
5. Include detailed explanations that help students learn
6. Are appropriate for the specified difficulty level

${request.includeFlashcards ? `
For flashcards:
1. Create 8-12 flashcards covering key terms and concepts
2. Front should be a term, concept, or question
3. Back should be a clear, comprehensive definition or answer
4. Focus on the most important concepts from the content
` : ''}

Please respond with a JSON object in this exact format:
{
  "title": "Engaging quiz title based on content (max 60 characters)",
  "description": "Clear description of what this quiz covers and learning objectives (max 200 characters)",
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice|true-false|fill-blank",
      "question": "Well-crafted question text",
      "options": ["option1", "option2", "option3", "option4"], // only for multiple-choice
      "correctAnswer": "correct answer (string for fill-blank, boolean for true-false, number index for multiple-choice)",
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

Ensure all content is educationally sound and promotes effective learning with clear, verifiable answers.
`;

  try {
    console.log('📤 Sending request to OpenAI...');
    const response = await rateLimitedRequest(async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o", // Using GPT-4o for best quality
        messages: [
          {
            role: "system",
            content: "You are an expert educational content creator with advanced pedagogical knowledge. Always respond with valid JSON only. Create high-quality, educationally valuable content with clear, verifiable answers."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });
    });

    console.log('📥 Received response from OpenAI');
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    console.log('🔧 Processing response...');
    // Clean the response to remove markdown code blocks before parsing
    const cleanedContent = cleanJsonResponse(content);

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response as JSON:', parseError);
      console.log('Raw response:', content);
      console.log('Cleaned response:', cleanedContent);
      throw new Error('Invalid JSON response from OpenAI. Please try again.');
    }
    
    // Validate and ensure IDs are present
    if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
      throw new Error('Invalid response format: missing questions array');
    }

    parsedResponse.questions = parsedResponse.questions.map((q: any, index: number) => ({
      ...q,
      id: q.id || `q${index + 1}`
    }));
    
    if (parsedResponse.flashcards && Array.isArray(parsedResponse.flashcards)) {
      parsedResponse.flashcards = parsedResponse.flashcards.map((f: any, index: number) => ({
        ...f,
        id: f.id || `f${index + 1}`
      }));
    } else {
      parsedResponse.flashcards = [];
    }

    console.log('✅ Quiz generation completed successfully');
    console.log('📊 Generated:', {
      questions: parsedResponse.questions.length,
      flashcards: parsedResponse.flashcards.length,
      title: parsedResponse.title
    });

    return parsedResponse;
  } catch (error: any) {
    console.error('❌ Error generating quiz with OpenAI:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    } else if (error.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your API key configuration.');
    } else if (error.status === 403) {
      throw new Error('Access denied. Please check your OpenAI account status and billing.');
    } else if (error.status === 500) {
      throw new Error('OpenAI service error. Please try again later.');
    } else if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI API quota exceeded. Please check your billing and usage limits.');
    }
    
    throw new Error(`Failed to generate quiz: ${error.message || 'Unknown error'}`);
  }
}

export async function extractTextFromImage(imageBase64: string): Promise<string> {
  const openai = getOpenAIClient();
  
  console.log('👁️ Extracting text from image using OpenAI Vision...');
  
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

    const extractedText = response.choices[0]?.message?.content || '';
    console.log('✅ Text extraction completed, length:', extractedText.length);
    return extractedText;
  } catch (error: any) {
    console.error('❌ Error extracting text from image:', error);
    
    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please wait before uploading more images.');
    } else if (error.status === 401) {
      throw new Error('Invalid OpenAI API key for image processing.');
    }
    
    throw new Error('Failed to extract text from image');
  }
}

export async function translateContent(content: string, targetLanguage: string): Promise<string> {
  const openai = getOpenAIClient();
  
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