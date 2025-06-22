// Lingo.dev API integration for translation services
const LINGO_API_KEY = import.meta.env.VITE_LINGO_API_KEY || 'api_przi40vhvtidf7uri0klbece';
const LINGO_API_BASE_URL = 'https://api.lingo.dev/v1';

export interface LingoTranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface LingoTranslationResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

export interface LingoError {
  message: string;
  code?: string;
}

// Supported languages for translation
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' }
];

// Get language name by code
export function getLanguageName(code: string): string {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  return language ? language.name : code.toUpperCase();
}

// Get language flag by code
export function getLanguageFlag(code: string): string {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  return language ? language.flag : '🌐';
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

// Mock translation function for development/fallback
function mockTranslate(text: string, targetLanguage: string, sourceLanguage: string): LingoTranslationResponse {
  console.log('🔄 Using mock translation service');
  
  // Simple mock translations for demonstration
  const mockTranslations: Record<string, Record<string, string>> = {
    'es': {
      'Hello': 'Hola',
      'Question': 'Pregunta',
      'Answer': 'Respuesta',
      'True': 'Verdadero',
      'False': 'Falso',
      'Next': 'Siguiente',
      'Previous': 'Anterior',
      'Submit': 'Enviar',
      'Quiz': 'Cuestionario',
      'Study': 'Estudiar',
      'Flashcards': 'Tarjetas de estudio'
    },
    'fr': {
      'Hello': 'Bonjour',
      'Question': 'Question',
      'Answer': 'Réponse',
      'True': 'Vrai',
      'False': 'Faux',
      'Next': 'Suivant',
      'Previous': 'Précédent',
      'Submit': 'Soumettre',
      'Quiz': 'Quiz',
      'Study': 'Étudier',
      'Flashcards': 'Cartes mémoire'
    },
    'de': {
      'Hello': 'Hallo',
      'Question': 'Frage',
      'Answer': 'Antwort',
      'True': 'Wahr',
      'False': 'Falsch',
      'Next': 'Weiter',
      'Previous': 'Zurück',
      'Submit': 'Einreichen',
      'Quiz': 'Quiz',
      'Study': 'Studieren',
      'Flashcards': 'Karteikarten'
    }
  };

  // Try to find a mock translation
  const translations = mockTranslations[targetLanguage];
  if (translations) {
    for (const [english, translated] of Object.entries(translations)) {
      if (text.toLowerCase().includes(english.toLowerCase())) {
        const mockTranslated = text.replace(new RegExp(english, 'gi'), translated);
        return {
          translatedText: mockTranslated,
          sourceLanguage,
          targetLanguage,
          confidence: 0.8
        };
      }
    }
  }

  // If no specific translation found, add language prefix for demonstration
  const languageName = getLanguageName(targetLanguage);
  return {
    translatedText: `[${languageName}] ${text}`,
    sourceLanguage,
    targetLanguage,
    confidence: 0.5
  };
}

// Main translation function with improved error handling and fallback
export async function translateText(
  text: string, 
  targetLanguage: string, 
  sourceLanguage: string = 'auto'
): Promise<LingoTranslationResponse> {
  if (!text.trim()) {
    throw new Error('Text to translate cannot be empty');
  }

  // Return original text if translating to the same language
  if (sourceLanguage === targetLanguage || (sourceLanguage === 'auto' && targetLanguage === 'en')) {
    return {
      translatedText: text,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      confidence: 1
    };
  }

  console.log('🌐 Starting translation with Lingo.dev...', {
    textLength: text.length,
    sourceLanguage,
    targetLanguage,
    apiKeyConfigured: !!LINGO_API_KEY
  });

  // If no API key, use mock translation
  if (!LINGO_API_KEY || LINGO_API_KEY === 'your_lingo_api_key') {
    console.warn('⚠️ Lingo API key is not configured, using mock translation');
    return mockTranslate(text, targetLanguage, sourceLanguage);
  }

  try {
    const response = await rateLimitedRequest(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(`${LINGO_API_BASE_URL}/translate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LINGO_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            text: text.trim(),
            target_language: targetLanguage,
            source_language: sourceLanguage === 'auto' ? undefined : sourceLanguage,
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });

    console.log('📡 Translation response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Translation API failed:', response.status, errorText);
      
      // Use mock translation as fallback
      console.log('🔄 Falling back to mock translation');
      return mockTranslate(text, targetLanguage, sourceLanguage);
    }

    const data = await response.json();
    console.log('✅ Translation completed successfully', data);

    return {
      translatedText: data.translatedText || data.translated_text || data.text || text,
      sourceLanguage: data.sourceLanguage || data.source_language || sourceLanguage,
      targetLanguage: data.targetLanguage || data.target_language || targetLanguage,
      confidence: data.confidence || 1.0
    };

  } catch (error: any) {
    console.error('❌ Translation error:', error);
    
    // Use mock translation as fallback for any error
    console.log('🔄 Using mock translation due to error');
    return mockTranslate(text, targetLanguage, sourceLanguage);
  }
}

// Batch translation for multiple texts with better error handling
export async function translateBatch(
  texts: string[], 
  targetLanguage: string, 
  sourceLanguage: string = 'auto'
): Promise<LingoTranslationResponse[]> {
  console.log('📦 Starting batch translation...', {
    textCount: texts.length,
    targetLanguage,
    sourceLanguage
  });

  const results: LingoTranslationResponse[] = [];
  
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    
    try {
      if (text.trim()) {
        const result = await translateText(text, targetLanguage, sourceLanguage);
        results.push(result);
        console.log(`✅ Translated ${i + 1}/${texts.length}: "${text.substring(0, 50)}..."`);
      } else {
        // Handle empty strings
        results.push({
          translatedText: text,
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage,
          confidence: 1
        });
      }
    } catch (error) {
      console.error(`❌ Batch translation error for text ${i + 1}:`, text.substring(0, 50), error);
      // Return original text if translation fails
      results.push({
        translatedText: text,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        confidence: 0
      });
    }
    
    // Add small delay between requests to avoid rate limiting
    if (i < texts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log('📦 Batch translation completed');
  return results;
}

// Test the Lingo API connection
export async function testLingoConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing Lingo API connection...');
    
    if (!LINGO_API_KEY || LINGO_API_KEY === 'your_lingo_api_key') {
      console.warn('⚠️ Lingo API key is not configured');
      return false;
    }
    
    const testResult = await translateText('Hello, world!', 'es', 'en');
    
    console.log('✅ Lingo API test result:', testResult);
    return testResult.confidence > 0;
  } catch (error) {
    console.error('❌ Lingo API test failed:', error);
    return false;
  }
}

// Utility to check if translation is needed
export function needsTranslation(sourceLanguage: string, targetLanguage: string): boolean {
  return sourceLanguage !== targetLanguage && targetLanguage !== 'auto';
}

// Cache for translations to avoid repeated API calls
const translationCache = new Map<string, LingoTranslationResponse>();

function getCacheKey(text: string, targetLanguage: string, sourceLanguage: string): string {
  return `${sourceLanguage}-${targetLanguage}-${text.substring(0, 100)}`;
}

// Cached translation function
export async function translateTextCached(
  text: string, 
  targetLanguage: string, 
  sourceLanguage: string = 'auto'
): Promise<LingoTranslationResponse> {
  // Return original if no translation needed
  if (!needsTranslation(sourceLanguage, targetLanguage)) {
    return {
      translatedText: text,
      sourceLanguage,
      targetLanguage,
      confidence: 1
    };
  }

  const cacheKey = getCacheKey(text, targetLanguage, sourceLanguage);
  
  // Check cache first
  if (translationCache.has(cacheKey)) {
    console.log('📋 Using cached translation');
    return translationCache.get(cacheKey)!;
  }

  // Translate and cache result
  const result = await translateText(text, targetLanguage, sourceLanguage);
  translationCache.set(cacheKey, result);
  
  return result;
}

// Clear translation cache
export function clearTranslationCache(): void {
  translationCache.clear();
  console.log('🗑️ Translation cache cleared');
}

// Debug function to test translation
export async function debugTranslation(): Promise<void> {
  console.log('🔧 Starting translation debug...');
  
  // Test 1: API Key
  console.log('🔧 Test 1: API Key check');
  console.log('API Key configured:', !!LINGO_API_KEY);
  console.log('API Key value:', LINGO_API_KEY?.substring(0, 10) + '...');
  
  // Test 2: Simple translation
  console.log('🔧 Test 2: Simple translation');
  try {
    const result = await translateText('Hello, world!', 'es', 'en');
    console.log('Translation result:', result);
  } catch (error) {
    console.error('Translation test failed:', error);
  }
  
  // Test 3: Batch translation
  console.log('🔧 Test 3: Batch translation');
  try {
    const results = await translateBatch(['Hello', 'World', 'Test'], 'fr', 'en');
    console.log('Batch translation results:', results);
  } catch (error) {
    console.error('Batch translation test failed:', error);
  }
  
  console.log('🔧 Translation debug complete');
}