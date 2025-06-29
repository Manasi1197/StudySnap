/*
  # Add Join by Code Feature

  1. Security Updates
    - Update room_participants INSERT policy to be more secure
    - Only allow joining active, public rooms or rooms created by the user
    
  2. New Function
    - Create function to find joinable rooms by code
    - Ensures only public, active rooms can be found by code
    
  3. Changes
    - Secure the room joining process
    - Add helper function for code-based room lookup
*/

-- Update the room_participants INSERT policy to be more secure
DROP POLICY IF EXISTS "Users can join rooms" ON room_participants;

CREATE POLICY "Users can join active public rooms"
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

-- Create function to find joinable room by code
CREATE OR REPLACE FUNCTION get_joinable_room_id_by_code(room_code_input text)
RETURNS uuid AS $$
DECLARE
  room_uuid uuid;
BEGIN
  -- Find the room by code, ensuring it's active and public
  SELECT id INTO room_uuid
  FROM study_rooms
  WHERE room_code = room_code_input
    AND status = 'active'
    AND is_public = true;
    
  RETURN room_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_joinable_room_id_by_code(text) TO authenticated;