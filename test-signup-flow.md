# Testing Signup Flow

## Manual Testing Instructions

### Step 1: Open Browser Developer Console
1. Open your application in the browser
2. Press `F12` or `Right-click → Inspect` to open Developer Tools
3. Go to the **Console** tab
4. Keep this open to see the signup logs

### Step 2: Create a New Account
1. Navigate to your signup form (either through the unlock modal or main auth modal)
2. Fill in the form:
   - **Email**: Use a unique email (e.g., `test123@example.com`)
   - **Password**: Use a strong password
   - **Full Name** (if required): e.g., "Test User"
3. Click "Sign Up" or "Create Account"

### Step 3: Check Console Logs
You should see logs like:
```
🔄 Starting signup process for: test123@example.com
✅ User created: [user-id-uuid]
✅ Successfully signed in after signup
⏳ Waiting for profile creation (trigger)...
✅ Profile exists (created by trigger)
✅ Signup complete
```

### Step 4: Verify in Supabase Dashboard

#### Check Authentication Users:
1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Find the email you just used
3. Copy the **User ID** (UUID)

#### Check Profiles Table:
1. Go to Supabase Dashboard → **Table Editor** → **profiles**
2. Look for a row where:
   - `id` matches the User ID from step above
   - `email` matches the email you used
   - `tokens` equals `5`
   - `full_name` matches the name you entered (if provided)

### Expected Results

✅ **Success Indicators:**
- User appears in `auth.users` table
- Profile appears in `profiles` table with matching `id`
- Profile has `tokens = 5`
- User is automatically signed in after signup
- No error messages in console

❌ **If Profile is Missing:**
- Check console for errors
- The code has a fallback that should create the profile
- If it still fails, check RLS policies on the `profiles` table

### Troubleshooting

#### Issue: Profile not created
**Check:**
1. Database trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. Trigger function exists:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
   ```

3. If missing, run the migration:
   ```sql
   -- Check supabase/migrations/20251123023340_fix_user_signup_rls.sql
   ```

#### Issue: RLS blocking profile creation
The trigger function uses `SECURITY DEFINER` which should bypass RLS, but verify:
```sql
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
```
Should show `SECURITY DEFINER` in the function definition.

#### Issue: "Failed to create session"
- Check if email confirmation is disabled in Supabase Settings
- The code should auto-sign-in as a fallback

## Test Account Example

**Email**: `test-signup-{timestamp}@example.com`  
**Password**: `TestPassword123!`  
**Full Name**: `Test User`

Use this format to avoid conflicts with existing accounts.

