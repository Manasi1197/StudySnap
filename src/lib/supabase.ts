import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  });
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error('Invalid Supabase URL format:', supabaseUrl);
  throw new Error('Invalid Supabase URL format. Please check your VITE_SUPABASE_URL in .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        // Add timeout and retry logic
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }).catch(error => {
        console.error('Supabase fetch error:', error);
        // Return a more descriptive error
        throw new Error(`Network error: Unable to connect to Supabase. Please check your internet connection and try again.`);
      });
    }
  }
});

// Enhanced connection test with retry logic
let connectionTested = false;

export const testSupabaseConnection = async (retries = 3) => {
  if (connectionTested) return true;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Testing Supabase connection (attempt ${attempt}/${retries})...`);
      
      const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error(`Supabase connection test failed (attempt ${attempt}):`, error);
        if (attempt === retries) {
          throw error;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      console.log('Supabase connection successful');
      connectionTested = true;
      return true;
    } catch (error) {
      console.error(`Supabase connection error (attempt ${attempt}):`, error);
      if (attempt === retries) {
        connectionTested = false;
        return false;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return false;
};

// Helper function to handle Supabase queries with error handling
export const safeSupabaseQuery = async (queryFn: () => Promise<any>, fallbackValue: any = null) => {
  try {
    const result = await queryFn();
    return result;
  } catch (error) {
    console.error('Supabase query error:', error);
    
    // Check if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to the database. Please check your internet connection and try again.');
    }
    
    // Check if it's a Supabase-specific error
    if (error && typeof error === 'object' && 'message' in error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    // Generic error
    throw new Error('An unexpected error occurred while accessing the database.');
  }
};

// Database types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: string;
  user_id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  flashcards: Flashcard[];
  settings: QuizSettings;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'short-answer';
  question: string;
  options?: string[];
  correct_answer: string | number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
}

export interface QuizSettings {
  question_count: number;
  difficulty: string;
  include_flashcards: boolean;
  question_types: string[];
  language: string;
}

export interface StudyMaterial {
  id: string;
  user_id: string;
  title: string;
  content: string;
  file_type: 'text' | 'image' | 'pdf';
  file_url?: string;
  extracted_text?: string;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  time_spent: number;
  completed_at: string;
}