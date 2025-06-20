import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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