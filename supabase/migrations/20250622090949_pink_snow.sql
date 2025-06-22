/*
  # Fix Room Participants RLS Policies

  1. Functions
    - Create `is_room_participant` function to check if a user is a participant in a room
    - Create `can_join_room` function to check if a user can join a room

  2. Security Updates
    - Update INSERT policy for room_participants to properly validate room joining
    - Ensure users can only join rooms that exist and aren't at capacity
    - Fix policy references to use correct function calls

  3. Policy Changes
    - Allow users to join rooms if they're not already participants
    - Validate room exists and is active
    - Check room capacity limits
*/

-- Create function to check if user is participant in a room
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

-- Create function to check if user can join a room
CREATE OR REPLACE FUNCTION can_join_room(room_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  room_exists boolean;
  room_active boolean;
  current_participants integer;
  max_allowed integer;
  already_participant boolean;
BEGIN
  -- Check if room exists and is active
  SELECT 
    COUNT(*) > 0,
    bool_and(status = 'active'),
    max(max_participants)
  INTO room_exists, room_active, max_allowed
  FROM study_rooms 
  WHERE id = room_uuid;
  
  -- If room doesn't exist or isn't active, can't join
  IF NOT room_exists OR NOT room_active THEN
    RETURN false;
  END IF;
  
  -- Check if user is already a participant
  SELECT is_room_participant(room_uuid, user_uuid) INTO already_participant;
  
  -- If already a participant, allow (for updates)
  IF already_participant THEN
    RETURN true;
  END IF;
  
  -- Check current participant count
  SELECT COUNT(*) 
  INTO current_participants
  FROM room_participants 
  WHERE room_id = room_uuid AND is_active = true;
  
  -- Check if room has space
  RETURN current_participants < max_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can join rooms" ON room_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON room_participants;
DROP POLICY IF EXISTS "Participants can view other participants in the same room" ON room_participants;

-- Create new INSERT policy that properly validates room joining
CREATE POLICY "Users can join rooms"
  ON room_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND can_join_room(room_id, auth.uid())
  );

-- Create UPDATE policy for users to update their own participation
CREATE POLICY "Users can update their own participation"
  ON room_participants
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create SELECT policy for participants to view other participants
CREATE POLICY "Participants can view other participants in the same room"
  ON room_participants
  FOR SELECT
  TO authenticated
  USING (is_room_participant(room_id, auth.uid()));

-- Create DELETE policy for users to leave rooms
CREATE POLICY "Users can leave rooms"
  ON room_participants
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());