/*
  # Create Study Rooms and Related Tables

  1. New Tables
    - `study_rooms`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text, optional)
      - `subject` (text, required)
      - `difficulty` (text, required, check constraint)
      - `max_participants` (integer, default 10)
      - `is_public` (boolean, default true)
      - `created_by` (uuid, foreign key to profiles)
      - `session_type` (text, required, check constraint)
      - `tags` (jsonb, default empty array)
      - `room_code` (text, unique)
      - `status` (text, default 'active', check constraint)
      - `scheduled_for` (timestamptz, optional)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

    - `room_participants`
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key to study_rooms)
      - `user_id` (uuid, foreign key to profiles)
      - `role` (text, default 'participant', check constraint)
      - `joined_at` (timestamptz, default now)
      - `is_active` (boolean, default true)

    - `room_messages`
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key to study_rooms)
      - `user_id` (uuid, foreign key to profiles)
      - `message` (text, required)
      - `message_type` (text, default 'text', check constraint)
      - `created_at` (timestamptz, default now)

    - `room_shared_content`
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key to study_rooms)
      - `user_id` (uuid, foreign key to profiles)
      - `content_type` (text, required, check constraint)
      - `content_id` (uuid, optional)
      - `shared_at` (timestamptz, default now)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for room participants to access room data

  3. Indexes
    - Add indexes for frequently queried columns
    - Add unique constraints where needed
*/

-- Create study_rooms table
CREATE TABLE IF NOT EXISTS study_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  subject text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  max_participants integer DEFAULT 10 CHECK (max_participants > 0 AND max_participants <= 100),
  is_public boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_type text NOT NULL CHECK (session_type IN ('study', 'quiz', 'discussion', 'presentation')),
  tags jsonb DEFAULT '[]'::jsonb,
  room_code text UNIQUE NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'scheduled', 'ended')),
  scheduled_for timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create room_participants table
CREATE TABLE IF NOT EXISTS room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'participant' CHECK (role IN ('host', 'moderator', 'participant')),
  joined_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- Create room_messages table
CREATE TABLE IF NOT EXISTS room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'quiz_share', 'system')),
  created_at timestamptz DEFAULT now()
);

-- Create room_shared_content table
CREATE TABLE IF NOT EXISTS room_shared_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('quiz', 'flashcard_set', 'study_material', 'file')),
  content_id uuid,
  shared_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_study_rooms_created_by ON study_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_study_rooms_status ON study_rooms(status);
CREATE INDEX IF NOT EXISTS idx_study_rooms_subject ON study_rooms(subject);
CREATE INDEX IF NOT EXISTS idx_study_rooms_is_public ON study_rooms(is_public);

CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_is_active ON room_participants(is_active);

CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_created_at ON room_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_room_shared_content_room_id ON room_shared_content(room_id);
CREATE INDEX IF NOT EXISTS idx_room_shared_content_content_type ON room_shared_content(content_type);

-- Enable Row Level Security
ALTER TABLE study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_shared_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_rooms
CREATE POLICY "Users can read public study rooms"
  ON study_rooms
  FOR SELECT
  TO authenticated
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create study rooms"
  ON study_rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own study rooms"
  ON study_rooms
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own study rooms"
  ON study_rooms
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for room_participants
CREATE POLICY "Users can read room participants for rooms they're in"
  ON room_participants
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    room_id IN (
      SELECT room_id FROM room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can join rooms"
  ON room_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation"
  ON room_participants
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for room_messages
CREATE POLICY "Users can read messages from rooms they're in"
  ON room_messages
  FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can send messages to rooms they're in"
  ON room_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    room_id IN (
      SELECT room_id FROM room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for room_shared_content
CREATE POLICY "Users can read shared content from rooms they're in"
  ON room_shared_content
  FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can share content to rooms they're in"
  ON room_shared_content
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    room_id IN (
      SELECT room_id FROM room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'update_study_rooms_updated_at'
  ) THEN
    CREATE TRIGGER update_study_rooms_updated_at
      BEFORE UPDATE ON study_rooms
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;