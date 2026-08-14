-- Verify idempotent signup bonus after migration.
-- Run in Supabase SQL editor or: supabase db query --file scripts/test-signup-bonus.sql

-- 1) Existing users should already be marked awarded (no mass re-grant)
SELECT
  count(*) FILTER (WHERE signup_bonus_awarded = false) AS unawarded_existing,
  count(*) FILTER (WHERE signup_bonus_awarded = true) AS awarded_existing
FROM profiles;

-- 2) Call award_signup_bonus twice on one existing user
DO $$
DECLARE
  v_user uuid;
  v_tokens_before int;
  v_tokens_after1 int;
  v_tokens_after2 int;
  v_first boolean;
  v_second boolean;
  v_bonus_rows int;
BEGIN
  SELECT id, tokens INTO v_user, v_tokens_before
  FROM profiles
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE NOTICE 'No profiles found — skip RPC double-call test';
    RETURN;
  END IF;

  v_first := award_signup_bonus(v_user);
  SELECT tokens INTO v_tokens_after1 FROM profiles WHERE id = v_user;

  v_second := award_signup_bonus(v_user);
  SELECT tokens INTO v_tokens_after2 FROM profiles WHERE id = v_user;

  SELECT count(*) INTO v_bonus_rows
  FROM token_transactions
  WHERE user_id = v_user AND transaction_type = 'signup_bonus';

  RAISE NOTICE 'user=%, tokens before=%, after1=%, after2=%', v_user, v_tokens_before, v_tokens_after1, v_tokens_after2;
  RAISE NOTICE 'award_signup_bonus first=%, second=% (expect false, false for existing awarded users)', v_first, v_second;
  RAISE NOTICE 'signup_bonus txn rows=% (expect 0 or 1)', v_bonus_rows;

  IF v_tokens_after2 <> v_tokens_after1 THEN
    RAISE EXCEPTION 'FAIL: second award_signup_bonus changed token balance';
  END IF;

  IF v_second IS TRUE THEN
    RAISE EXCEPTION 'FAIL: second award_signup_bonus returned true';
  END IF;

  IF v_bonus_rows > 1 THEN
    RAISE EXCEPTION 'FAIL: more than one signup_bonus transaction';
  END IF;

  RAISE NOTICE 'PASS: award_signup_bonus is idempotent';
END $$;

-- 3) Unique index should block a second insert without crashing the statement if caught.
-- Clean up any row this test itself inserted so we do not pollute production.
DO $$
DECLARE
  v_user uuid;
  v_inserted boolean := false;
BEGIN
  SELECT id INTO v_user FROM profiles ORDER BY created_at ASC LIMIT 1;
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    INSERT INTO token_transactions (user_id, transaction_type, amount, description)
    VALUES (v_user, 'signup_bonus', 3, 'manual duplicate test');
    v_inserted := true;
    INSERT INTO token_transactions (user_id, transaction_type, amount, description)
    VALUES (v_user, 'signup_bonus', 3, 'manual duplicate test 2');
    RAISE EXCEPTION 'FAIL: unique index allowed two signup_bonus rows';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'PASS: unique index blocked duplicate signup_bonus insert';
  END;

  IF v_inserted THEN
    DELETE FROM token_transactions
    WHERE user_id = v_user
      AND transaction_type = 'signup_bonus'
      AND description = 'manual duplicate test';
  END IF;
END $$;
