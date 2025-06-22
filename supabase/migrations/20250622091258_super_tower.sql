/*
  # Fix RLS Policies for Study Rooms

  1. Clean up existing problematic policies
  2. Create simple, non-recursive policies that work correctly
  3. Fix the room_participants table policies to prevent 500 errors
  4. Ensure proper access control without infinite recursion

  This migration addresses:
  - 500 errors from recursive RLS policies
  - Missing function errors
  - Proper access control for study rooms functionality
*/

-- First, drop all existing policies to start clean
DROP POLICY IF EXISTS "Users can read public study rooms" ON study_rooms;
DROP POLICY IF EXISTS "Users can create study rooms" ON study_rooms;
DROP POLICY IF EXISTS "Users can update own study rooms" ON study_rooms;
DROP POLICY IF EXISTS "Users can delete own study rooms" ON study_rooms;

DROP POLICY IF EXISTS "Users can join active rooms" ON room_participants;
DROP POLICY IF EXISTS "Users can view participants in joined rooms" ON room_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON room_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON room_participants;
DROP POLICY IF EXISTS "Room creators can manage participants" ON room_participants;

DROP POLICY IF EXISTS "Participants can read messages" ON room_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON room_messages;

DROP POLICY IF EXISTS "Users can read shared content from rooms they're in" ON room_shared_content;
DROP POLICY IF EXISTS "Users can share content to rooms they're in" ON room_shared_content;

-- Drop functions that might be causing issues
DROP FUNCTION IF EXISTS is_room_participant(uuid, uuid);
DROP FUNCTION IF EXISTS can_join_room(uuid, uuid);

-- Create simple, working policies for study_rooms
CREATE POLICY "Users can read public study rooms or own rooms"
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

-- Create simple, working policies for room_participants
-- Allow users to join rooms (insert their own participation)
CREATE POLICY "Users can join rooms"
  ON room_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM study_rooms 
      WHERE study_rooms.id = room_participants.room_id 
      AND study_rooms.status = 'active'
      AND (study_rooms.is_public = true OR study_rooms.created_by = auth.uid())
    )
  );

-- Allow users to view all participants (this is safe for a study app)
CREATE POLICY "Users can view room participants"
  ON room_participants
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own participation
CREATE POLICY "Users can update own participation"
  ON room_participants
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow users to leave rooms (delete their participation)
CREATE POLICY "Users can leave rooms"
  ON room_participants
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Allow room creators to manage all participants in their rooms
CREATE POLICY "Room creators can manage participants"
  ON room_participants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_rooms
      WHERE study_rooms.id = room_participants.room_id
      AND study_rooms.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_rooms
      WHERE study_rooms.id = room_participants.room_id
      AND study_rooms.created_by = auth.uid()
    )
  );

-- Create simple policies for room_messages
-- Users can read messages from rooms where they are participants or creators
CREATE POLICY "Users can read messages from accessible rooms"
  ON room_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_rooms
      WHERE study_rooms.id = room_messages.room_id
      AND (
        study_rooms.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM room_participants
          WHERE room_participants.room_id = room_messages.room_id
          AND room_participants.user_id = auth.uid()
          AND room_participants.is_active = true
        )
      )
    )
  );

-- Users can send messages to rooms where they are participants or creators
CREATE POLICY "Users can send messages to accessible rooms"
  ON room_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM study_rooms
      WHERE study_rooms.id = room_messages.room_id
      AND (
        study_rooms.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM room_participants
          WHERE room_participants.room_id = room_messages.room_id
          AND room_participants.user_id = auth.uid()
          AND room_participants.is_active = true
        )
      )
    )
  );

-- Create simple policies for room_shared_content
-- Users can read shared content from rooms they have access to
CREATE POLICY "Users can read shared content from accessible rooms"
  ON room_shared_content
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_rooms
      WHERE study_rooms.id = room_shared_content.room_id
      AND (
        study_rooms.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM room_participants
          WHERE room_participants.room_id = room_shared_content.room_id
          AND room_participants.user_id = auth.uid()
          AND room_participants.is_active = true
        )
      )
    )
  );

-- Users can share content to rooms they have access to
CREATE POLICY "Users can share content to accessible rooms"
  ON room_shared_content
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM study_rooms
      WHERE study_rooms.id = room_shared_content.room_id
      AND (
        study_rooms.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM room_participants
          WHERE room_participants.room_id = room_shared_content.room_id
          AND room_participants.user_id = auth.uid()
          AND room_participants.is_active = true
        )
      )
    )
  );