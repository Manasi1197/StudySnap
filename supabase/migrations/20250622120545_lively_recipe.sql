/*
  # Fix Room Policies and Helper Function

  1. Security Updates
    - Drop and recreate policies that depend on helper function
    - Recreate helper function with proper security
    - Ensure proper access control for room participants

  2. Changes
    - Fix policy dependencies by dropping policies first
    - Recreate helper function for room participation checks
    - Update all room-related policies to use the helper function
    - Grant proper permissions for authenticated users
*/

-- Drop all policies that depend on the helper function first
DROP POLICY IF EXISTS "Participants can read messages" ON room_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON room_messages;
DROP POLICY IF EXISTS "Users can read messages from rooms they're in" ON room_messages;
DROP POLICY IF EXISTS "Users can send messages to rooms they're in" ON room_messages;
DROP POLICY IF EXISTS "Participants can view other participants in the same room" ON room_participants;
DROP POLICY IF EXISTS "Users can read room participants for rooms they're in" ON room_participants;
DROP POLICY IF EXISTS "Users can read room participants" ON room_participants;
DROP POLICY IF EXISTS "Users can read shared content from rooms they're in" ON room_shared_content;
DROP POLICY IF EXISTS "Users can share content to rooms they're in" ON room_shared_content;

-- Now drop the function after all dependent policies are removed
DROP FUNCTION IF EXISTS is_room_participant(uuid, uuid);

-- Create helper function to check if user is room participant
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

-- Create new policies for room_messages using the helper function
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

-- Create simplified policy for reading room participants
CREATE POLICY "Participants can view other participants in the same room"
  ON room_participants
  FOR SELECT
  TO authenticated
  USING (is_room_participant(room_id, auth.uid()));

-- Update room_participants INSERT policy to handle duplicates better
DROP POLICY IF EXISTS "Users can join rooms" ON room_participants;
CREATE POLICY "Users can join rooms"
  ON room_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Update room_participants UPDATE policy
DROP POLICY IF EXISTS "Users can update their own participation" ON room_participants;
CREATE POLICY "Users can update their own participation"
  ON room_participants
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Update room_shared_content policies to use helper function
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_room_participant(uuid, uuid) TO authenticated;