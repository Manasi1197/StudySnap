/*
  # Fix Room Participants RLS Policies

  1. Security Updates
    - Drop existing problematic policies on room_participants table
    - Create new simplified policies that work without custom functions
    - Allow authenticated users to join rooms properly
    - Allow users to manage their own participation

  2. Policy Changes
    - Users can join any active public room or rooms they created
    - Users can view participants in rooms they're part of
    - Users can leave rooms they've joined
    - Room creators (hosts) can manage participants in their rooms
*/

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Participants can view other participants in the same room" ON room_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON room_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON room_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON room_participants;

-- Create new working policies

-- Policy 1: Allow authenticated users to join rooms
-- Users can insert their own participation record for active public rooms or rooms they created
CREATE POLICY "Users can join active rooms"
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

-- Policy 2: Allow users to view participants in rooms they're part of
CREATE POLICY "Users can view participants in joined rooms"
  ON room_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_participants rp2
      WHERE rp2.room_id = room_participants.room_id
      AND rp2.user_id = auth.uid()
      AND rp2.is_active = true
    )
  );

-- Policy 3: Allow users to update their own participation status
CREATE POLICY "Users can update own participation"
  ON room_participants
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 4: Allow users to delete/leave their own participation
CREATE POLICY "Users can leave rooms"
  ON room_participants
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 5: Allow room creators to manage participants in their rooms
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