// Lingo.dev API integration for translation services
const LINGO_API_KEY = import.meta.env.VITE_LINGO_API_KEY;
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
const MIN_REQUEST_INTERVAL = 500; // 500ms between requests

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

// Main translation function
export async function translateText(
  text: string, 
  targetLanguage: string, 
  sourceLanguage: string = 'auto'
): Promise<LingoTranslationResponse> {
  if (!text.trim()) {
    throw new Error('Text to translate cannot be empty');
  }

  if (!LINGO_API_KEY) {
    console.warn('⚠️ Lingo API key is not configured, returning original text');
    return {
      translatedText: text,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      confidence: 0
    };
  }

  console.log('🌐 Starting translation with Lingo.dev...', {
    textLength: text.length,
    sourceLanguage,
    targetLanguage
  });

  try {
    const response = await rateLimitedRequest(async () => {
      return await fetch(`${LINGO_API_BASE_URL}/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LINGO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          target_language: targetLanguage,
          source_language: sourceLanguage === 'auto' ? undefined : sourceLanguage,
        }),
      });
    });

    console.log('📡 Translation response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Translation failed:', response.status, errorText);
      
      let errorMessage = 'Translation failed';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = `Translation API error: ${response.status}`;
      }
      
      // Return original text instead of throwing error
      console.warn('⚠️ Translation failed, returning original text');
      return {
        translatedText: text,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        confidence: 0
      };
    }

    const data = await response.json();
    console.log('✅ Translation completed successfully');

    return {
      translatedText: data.translatedText || data.translated_text || data.text,
      sourceLanguage: data.sourceLanguage || data.source_language || sourceLanguage,
      targetLanguage: data.targetLanguage || data.target_language || targetLanguage,
      confidence: data.confidence || 1.0
    };

  } catch (error: any) {
    console.error('❌ Translation error:', error);
    
    // Return original text instead of throwing error to prevent app crashes
    console.warn('⚠️ Translation failed, returning original text');
    return {
      translatedText: text,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      confidence: 0
    };
  }
}

// Batch translation for multiple texts
export async function translateBatch(
  texts: string[], 
  targetLanguage: string, 
  sourceLanguage: string = 'auto'
): Promise<LingoTranslationResponse[]> {
  const results: LingoTranslationResponse[] = [];
  
  for (const text of texts) {
    if (text.trim()) {
      try {
        const result = await translateText(text, targetLanguage, sourceLanguage);
        results.push(result);
      } catch (error) {
        console.error('Batch translation error for text:', text.substring(0, 50), error);
        // Return original text if translation fails
        results.push({
          translatedText: text,
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage,
          confidence: 0
        });
      }
    } else {
      // Handle empty strings
      results.push({
        translatedText: text,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        confidence: 1
      });
    }
  }
  
  return results;
}

// Test the Lingo API connection
export async function testLingoConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing Lingo API connection...');
    
    if (!LINGO_API_KEY) {
      console.warn('⚠️ Lingo API key is not configured');
      return false;
    }
    
    const testResult = await translateText('Hello, world!', 'es', 'en');
    
    console.log('✅ Lingo API test successful:', testResult);
    return testResult.confidence > 0;
  } catch (error) {
    console.error('❌ Lingo API test failed:', error);
    return false;
  }
}

// Utility to check if translation is needed
export function needsTranslation(sourceLanguage: string, targetLanguage: string): boolean {
  return sourceLanguage !== targetLanguage && targetLanguage !== 'en';
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