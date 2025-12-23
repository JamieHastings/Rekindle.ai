/*
  # Update Signup Bonus to 3 Tokens

  ## Changes
  - Update handle_new_user() function to give 3 tokens instead of 5
  - This matches the new token cost structure (5 tokens per message)
*/

-- Update the trigger function to use 3 tokens
DROP FUNCTION IF EXISTS handle_new_user();

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
    3  -- Updated from 5 to 3 tokens
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

-- Note: The trigger on_auth_user_created should already exist
-- If it doesn't, uncomment the following:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION handle_new_user();
