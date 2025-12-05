-- Verify Database Setup for Rekindle.ai
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Check if profiles table exists
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'profiles' AND table_schema = 'public';

-- 2. Check if the trigger function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user' AND routine_schema = 'public';

-- 3. Check if the trigger exists
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 4. Check RLS policies on profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'profiles';

-- 5. Check current profiles count
SELECT COUNT(*) as profile_count FROM profiles;

-- 6. Check if there are any auth users (if you have access)
-- Note: This might not work with anon key, but worth trying
SELECT COUNT(*) as auth_user_count FROM auth.users;

