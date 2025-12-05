# Troubleshooting: No Users in Profiles Table

## Step 1: Verify Database Setup

1. **Open Supabase Dashboard**
2. Go to **SQL Editor** (left sidebar)
3. Copy and paste the contents of `verify-database-setup.sql`
4. Click **Run**
5. Check the results:
   - ✅ `profiles` table should exist
   - ✅ `handle_new_user` function should exist
   - ✅ `on_auth_user_created` trigger should exist
   - ✅ RLS policies should exist

## Step 2: Test User Signup

### Option A: Use the Test HTML File

1. Open `test-signup.html` in your browser
2. Fill in the form:
   - Email: `test@example.com`
   - Password: `test123456`
   - Full Name: `Test User`
3. Click "Create Test User"
4. Check the results

### Option B: Test in Your App

1. Run your app: `npm run dev`
2. Click "Sign In" or "Create Account"
3. Fill in the signup form
4. Submit

### Option C: Use Browser Console

Open browser console (F12) and run:

```javascript
// Replace with your actual Supabase credentials
const SUPABASE_URL = 'https://cxjigazdzujttcsyzatz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4amlnYXpkenVqdHRjc3l6YXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDMxNjIsImV4cCI6MjA3OTY3OTE2Mn0.MKjlRzvVXYMgIIa5GdRfSRZatNR-SFYHu583ig7IN-s';

// Import Supabase (if not already loaded)
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test signup
supabaseClient.auth.signUp({
  email: 'test@example.com',
  password: 'test123456',
  options: {
    data: {
      full_name: 'Test User'
    }
  }
}).then(({ data, error }) => {
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('User created:', data.user);
    
    // Check profile after 1 second
    setTimeout(() => {
      supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
        .then(({ data: profile, error: profileError }) => {
          if (profileError) {
            console.error('Profile error:', profileError);
          } else {
            console.log('Profile created:', profile);
          }
        });
    }, 1000);
  }
});
```

## Step 3: Check Results

### In Supabase Dashboard:

1. **Authentication → Users**
   - Should see the new user
   - User ID should be a UUID

2. **Table Editor → profiles**
   - Should see a new row
   - `id` should match the user ID
   - `email` should match signup email
   - `tokens` should be 5
   - `full_name` should match

## Common Issues

### Issue 1: Trigger Not Working

**Symptoms:** User created in auth.users but no profile

**Solution:** Run this SQL in Supabase SQL Editor:

```sql
-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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
    5
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### Issue 2: RLS Blocking Profile Creation

**Symptoms:** Trigger exists but profiles not created

**Solution:** Check RLS policies. The trigger should bypass RLS (SECURITY DEFINER).

### Issue 3: Email Already Exists

**Symptoms:** Error: "User already registered"

**Solution:** Use a different email address or delete the existing user from Authentication → Users

## Step 4: Verify Everything Works

After creating a test user:

1. ✅ Check Authentication → Users (should see user)
2. ✅ Check Table Editor → profiles (should see profile row)
3. ✅ Profile should have:
   - `id` = User ID from auth.users
   - `email` = Signup email
   - `full_name` = Signup name
   - `tokens` = 5
   - `created_at` = Current timestamp

If all checks pass, your signup is working! 🎉

