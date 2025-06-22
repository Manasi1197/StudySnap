/*
  # Rebuild Study Rooms from Scratch

  1. Drop all existing study room related tables and functions
  2. Recreate clean study room schema with proper constraints
  3. Add security policies and indexes
  4. Create helper functions for room management
*/

-- Drop all existing study room related objects
DROP TABLE IF EXISTS room_shared_content CASCADE;
DROP TABLE IF EXISTS room_messages CASCADE;
DROP TABLE IF EXISTS room_participants CASCADE;
DROP TABLE IF EXISTS study_rooms CASCADE;
DROP FUNCTION IF EXISTS is_room_participant(uuid, uuid) CASCADE;

-- Create study_rooms table
CREATE TABLE study_rooms (
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
CREATE TABLE room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'participant' CHECK (role IN ('host', 'moderator', 'participant')),
  joined_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- Create room_messages table
CREATE TABLE room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'quiz_share', 'system')),
  created_at timestamptz DEFAULT now()
);

-- Create room_shared_content table
CREATE TABLE room_shared_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('quiz', 'flashcard_set', 'study_material', 'file')),
  content_id uuid,
  shared_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_study_rooms_created_by ON study_rooms(created_by);
CREATE INDEX idx_study_rooms_status ON study_rooms(status);
CREATE INDEX idx_study_rooms_subject ON study_rooms(subject);
CREATE INDEX idx_study_rooms_is_public ON study_rooms(is_public);

CREATE INDEX idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX idx_room_participants_user_id ON room_participants(user_id);
CREATE INDEX idx_room_participants_is_active ON room_participants(is_active);

CREATE INDEX idx_room_messages_room_id ON room_messages(room_id);
CREATE INDEX idx_room_messages_created_at ON room_messages(created_at);

CREATE INDEX idx_room_shared_content_room_id ON room_shared_content(room_id);
CREATE INDEX idx_room_shared_content_content_type ON room_shared_content(content_type);

-- Enable Row Level Security
ALTER TABLE study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_shared_content ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is a room participant
CREATE OR REPLACE FUNCTION is_room_participant(room_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM room_participants 
    WHERE room_id = room_uuid 
    AND user_id = user_uuid 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
CREATE POLICY "Participants can view other participants in the same room"
  ON room_participants
  FOR SELECT
  TO authenticated
  USING (is_room_participant(room_id, auth.uid()));

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
CREATE POLICY "Participants can read messages"
  ON room_messages
  FOR SELECT
  TO authenticated
  USING (is_room_participant(room_id, auth.uid()));

CREATE POLICY "Participants can send messages"
  ON room_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (is_room_participant(room_id, auth.uid()));

-- RLS Policies for room_shared_content
CREATE POLICY "Users can read shared content from rooms they're in"
  ON room_shared_content
  FOR SELECT
  TO authenticated
  USING (is_room_participant(room_id, auth.uid()));

CREATE POLICY "Users can share content to rooms they're in"
  ON room_shared_content
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    is_room_participant(room_id, auth.uid())
  );

-- Create triggers for updated_at
CREATE TRIGGER update_study_rooms_updated_at
  BEFORE UPDATE ON study_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_room_participant(uuid, uuid) TO authenticated;