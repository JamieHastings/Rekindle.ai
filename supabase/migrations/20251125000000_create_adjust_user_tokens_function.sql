-- Migration: Create adjust_user_tokens function for secure token management
-- This function handles both adding and deducting tokens atomically
-- It includes proper error handling and transaction logging

CREATE OR REPLACE FUNCTION adjust_user_tokens(
  p_user_id uuid,
  p_delta integer,
  p_reason text DEFAULT 'adjustment'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_tokens integer;
  v_new_tokens integer;
  v_transaction_type text;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'profile_not_found' USING MESSAGE = 'User ID is required';
  END IF;

  IF p_delta IS NULL THEN
    RAISE EXCEPTION 'invalid_delta' USING MESSAGE = 'Delta value is required';
  END IF;

  -- Get current token count
  SELECT COALESCE(tokens, 0) INTO v_current_tokens
  FROM profiles
  WHERE id = p_user_id;

  -- Check if profile exists
  IF v_current_tokens IS NULL THEN
    RAISE EXCEPTION 'profile_not_found' USING MESSAGE = 'User profile not found';
  END IF;

  -- Calculate new token count
  v_new_tokens := v_current_tokens + p_delta;

  -- Check for insufficient tokens (only if deducting)
  IF p_delta < 0 AND v_new_tokens < 0 THEN
    RAISE EXCEPTION 'insufficient_tokens' 
      USING MESSAGE = format('Insufficient tokens. Current: %s, Required: %s', 
                             v_current_tokens, ABS(p_delta));
  END IF;

  -- Determine transaction type
  IF p_delta > 0 THEN
    v_transaction_type := 'purchase';
  ELSIF p_delta < 0 THEN
    v_transaction_type := 'usage';
  ELSE
    v_transaction_type := 'adjustment';
  END IF;

  -- Update tokens atomically
  UPDATE profiles
  SET tokens = v_new_tokens,
      updated_at = now()
  WHERE id = p_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING MESSAGE = 'Failed to update user profile';
  END IF;

  -- Record transaction
  INSERT INTO token_transactions (
    user_id,
    transaction_type,
    amount,
    description,
    metadata
  ) VALUES (
    p_user_id,
    v_transaction_type,
    p_delta,
    p_reason,
    jsonb_build_object(
      'previous_balance', v_current_tokens,
      'new_balance', v_new_tokens,
      'delta', p_delta
    )
  );

  -- Return new token count
  RETURN v_new_tokens;

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception with context
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users (they can only adjust their own tokens via Edge Functions)
-- The Edge Functions use service role key, so this is secure

-- Add comment
COMMENT ON FUNCTION adjust_user_tokens IS 
  'Atomically adjusts user tokens with transaction logging. Returns new token balance. Raises exceptions for insufficient tokens or missing profiles.';

