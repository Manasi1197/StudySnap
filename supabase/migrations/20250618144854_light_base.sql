/*
  # Fix database schema setup

  1. Tables
    - Safely create any missing tables
    - Add any missing columns to existing tables
    
  2. Security
    - Only create policies that don't exist
    - Enable RLS where needed
    
  3. Functions and Triggers
    - Update existing functions
    - Recreate triggers safely
*/

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check and add missing columns to existing tables
DO $$
BEGIN
  -- Add missing columns to profiles if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier text DEFAULT 'basic';
  END IF;

  -- Add missing columns to study_materials if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'study_materials' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE study_materials ADD COLUMN file_size integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'study_materials' AND column_name = 'extracted_text'
  ) THEN
    ALTER TABLE study_materials ADD COLUMN extracted_text text;
  END IF;

  -- Add missing columns to quizzes if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quizzes' AND column_name = 'estimated_time'
  ) THEN
    ALTER TABLE quizzes ADD COLUMN estimated_time integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quizzes' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE quizzes ADD COLUMN is_public boolean DEFAULT false;
  END IF;

  -- Add missing columns to study_sessions if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'study_sessions' AND column_name = 'time_spent'
  ) THEN
    ALTER TABLE study_sessions ADD COLUMN time_spent integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'study_sessions' AND column_name = 'answers'
  ) THEN
    ALTER TABLE study_sessions ADD COLUMN answers jsonb DEFAULT '[]'::jsonb NOT NULL;
  END IF;
END $$;

-- Create flashcard_sets table if it doesn't exist
CREATE TABLE IF NOT EXISTS flashcard_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  flashcards jsonb DEFAULT '[]'::jsonb NOT NULL,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  total_quizzes_created integer DEFAULT 0,
  total_study_sessions integer DEFAULT 0,
  total_time_studied integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  achievements jsonb DEFAULT '[]'::jsonb,
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_study_materials_user_id ON study_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_quiz_id ON study_sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_user_id ON flashcard_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);

-- Enable Row Level Security (safe to run multiple times)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies only if they don't exist
DO $$
BEGIN
  -- Policies for study_materials
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'study_materials' AND policyname = 'Users can manage own study materials'
  ) THEN
    CREATE POLICY "Users can manage own study materials"
      ON study_materials
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Policies for quizzes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quizzes' AND policyname = 'Users can manage own quizzes'
  ) THEN
    CREATE POLICY "Users can manage own quizzes"
      ON quizzes
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quizzes' AND policyname = 'Users can read public quizzes'
  ) THEN
    CREATE POLICY "Users can read public quizzes"
      ON quizzes
      FOR SELECT
      TO authenticated
      USING (is_public = true);
  END IF;

  -- Policies for study_sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'study_sessions' AND policyname = 'Users can manage own study sessions'
  ) THEN
    CREATE POLICY "Users can manage own study sessions"
      ON study_sessions
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Policies for flashcard_sets
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'flashcard_sets' AND policyname = 'Users can manage own flashcard sets'
  ) THEN
    CREATE POLICY "Users can manage own flashcard sets"
      ON flashcard_sets
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'flashcard_sets' AND policyname = 'Users can read public flashcard sets'
  ) THEN
    CREATE POLICY "Users can read public flashcard sets"
      ON flashcard_sets
      FOR SELECT
      TO authenticated
      USING (is_public = true);
  END IF;

  -- Policies for user_progress
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_progress' AND policyname = 'Users can manage own progress'
  ) THEN
    CREATE POLICY "Users can manage own progress"
      ON user_progress
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Update the updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Safely recreate triggers
DROP TRIGGER IF EXISTS update_study_materials_updated_at ON study_materials;
CREATE TRIGGER update_study_materials_updated_at
  BEFORE UPDATE ON study_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quizzes_updated_at ON quizzes;
CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_flashcard_sets_updated_at ON flashcard_sets;
CREATE TRIGGER update_flashcard_sets_updated_at
  BEFORE UPDATE ON flashcard_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_progress_updated_at ON user_progress;
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  
  INSERT INTO user_progress (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Safely recreate the auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();