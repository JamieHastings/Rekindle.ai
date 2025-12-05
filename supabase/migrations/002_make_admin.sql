-- 002_make_admin.sql
-- Make hastings.jamie05@gmail.com an admin account

UPDATE profiles 
SET is_admin = true 
WHERE email = 'hastings.jamie05@gmail.com';

-- Verify the change
SELECT id, email, is_admin, tokens, created_at 
FROM profiles 
WHERE email = 'hastings.jamie05@gmail.com';