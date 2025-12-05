/*
  # Fix User Signup RLS Issue

  ## Problem
  The trigger function that creates user profiles after signup is being blocked by RLS policies.
  When `handle_new_user()` tries to insert into profiles, the RLS policy checks fail because
  the function runs in a different context.

  ## Solution
  1. Update the trigger function to use proper security context
  2. Set the function to run with SECURITY DEFINER and proper search_path
  3. Grant the function permission to bypass RLS for profile creation

  ## Changes
  - Drop and recreate the `handle_new_user()` function with proper security settings
  - Ensure the function can successfully insert profiles regardless of RLS policies
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate function with proper security definer settings
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, tokens)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    5
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, skip
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();