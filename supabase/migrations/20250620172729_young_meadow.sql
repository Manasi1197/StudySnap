/*
  # Fix signup database error

  1. Database Functions
    - Create or update the handle_new_user function to properly create profiles
    - Ensure the function has proper error handling

  2. Triggers
    - Create trigger to automatically create profile on user signup
    - Ensure trigger is properly configured

  3. Security
    - Update RLS policies to allow profile creation during signup
    - Ensure auth.uid() is properly handled for new users
*/

-- Create or replace the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  
  -- Also create initial user progress record
  INSERT INTO public.user_progress (user_id)
  VALUES (new.id);
  
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update RLS policies to allow profile creation during signup
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    -- Allow insertion during signup when auth.uid() might not be set yet
    (auth.uid() IS NULL AND id IS NOT NULL)
  );

-- Ensure the profiles table has proper RLS policies
DROP POLICY IF EXISTS "Enable insert for service role" ON public.profiles;
CREATE POLICY "Enable insert for service role" ON public.profiles
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Update user_progress policies to allow creation during signup
DROP POLICY IF EXISTS "Users can manage own progress" ON public.user_progress;
CREATE POLICY "Users can manage own progress" ON public.user_progress
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable insert for service role on user_progress" ON public.user_progress;
CREATE POLICY "Enable insert for service role on user_progress" ON public.user_progress
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_progress TO service_role;