-- Idempotent 3-token signup bonus
-- Trigger on auth.users INSERT remains the source of truth (fires pre-confirmation).
-- award_signup_bonus() + unique signup_bonus transaction prevent double grants.
--
-- supabase db push currently fails on this project (cli_login_postgres CREATEROLE).
-- Apply this file in the Supabase SQL editor, then run scripts/test-signup-bonus.sql.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS signup_bonus_awarded boolean NOT NULL DEFAULT false;

-- Existing users already received initial tokens from handle_new_user().
-- Mark them awarded so this migration cannot re-grant 3 tokens.
UPDATE profiles
SET signup_bonus_awarded = true
WHERE signup_bonus_awarded = false;

ALTER TABLE token_transactions
  DROP CONSTRAINT IF EXISTS token_transactions_transaction_type_check;

ALTER TABLE token_transactions
  ADD CONSTRAINT token_transactions_transaction_type_check
  CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'credit', 'debit', 'adjustment', 'signup_bonus'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_token_transactions_signup_bonus_once
  ON token_transactions (user_id)
  WHERE transaction_type = 'signup_bonus';

-- Clients may update tokens/name, but not flip the bonus flag.
REVOKE UPDATE (signup_bonus_awarded) ON TABLE profiles FROM PUBLIC;
REVOKE UPDATE (signup_bonus_awarded) ON TABLE profiles FROM anon;
REVOKE UPDATE (signup_bonus_awarded) ON TABLE profiles FROM authenticated;
GRANT UPDATE (signup_bonus_awarded) ON TABLE profiles TO service_role;

-- RLS allows users to update their own profile row; keep the flag non-writable from invoker roles.
CREATE OR REPLACE FUNCTION prevent_client_signup_bonus_flag_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.signup_bonus_awarded IS DISTINCT FROM OLD.signup_bonus_awarded
     AND current_user IN ('anon', 'authenticated') THEN
    NEW.signup_bonus_awarded := OLD.signup_bonus_awarded;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_signup_bonus_awarded ON profiles;
CREATE TRIGGER protect_signup_bonus_awarded
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_client_signup_bonus_flag_change();

-- Server-side idempotent grant used by unlock-preview / fallbacks
CREATE OR REPLACE FUNCTION award_signup_bonus(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_awarded boolean;
  v_has_txn boolean;
BEGIN
  IF user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT p.signup_bonus_awarded INTO v_awarded
  FROM profiles p
  WHERE p.id = award_signup_bonus.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM token_transactions t
    WHERE t.user_id = award_signup_bonus.user_id
      AND t.transaction_type = 'signup_bonus'
  ) INTO v_has_txn;

  IF v_awarded OR v_has_txn THEN
    IF v_has_txn AND NOT COALESCE(v_awarded, false) THEN
      UPDATE profiles
      SET signup_bonus_awarded = true,
          updated_at = now()
      WHERE id = award_signup_bonus.user_id;
    END IF;
    RETURN false;
  END IF;

  UPDATE profiles
  SET tokens = COALESCE(tokens, 0) + 3,
      signup_bonus_awarded = true,
      updated_at = now()
  WHERE id = award_signup_bonus.user_id
    AND signup_bonus_awarded = false;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  BEGIN
    INSERT INTO token_transactions (
      user_id,
      transaction_type,
      amount,
      description,
      metadata
    ) VALUES (
      award_signup_bonus.user_id,
      'signup_bonus',
      3,
      'Signup bonus: 3 free tokens',
      jsonb_build_object('source', 'award_signup_bonus')
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- Concurrent grant already logged the bonus; do not fail the caller.
      RETURN false;
  END;

  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    RETURN false;
  WHEN OTHERS THEN
    RAISE WARNING 'award_signup_bonus failed for %: %', user_id, SQLERRM;
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION award_signup_bonus(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION award_signup_bonus(uuid) FROM anon;
REVOKE ALL ON FUNCTION award_signup_bonus(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION award_signup_bonus(uuid) TO service_role;

-- Recreate trigger function: grant once on genuine auth.users insert only
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, tokens, signup_bonus_awarded)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    3,
    true
  )
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    INSERT INTO public.token_transactions (
      user_id,
      transaction_type,
      amount,
      description,
      metadata
    ) VALUES (
      NEW.id,
      'signup_bonus',
      3,
      'Signup bonus: 3 free tokens',
      jsonb_build_object('source', 'handle_new_user')
    );
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
