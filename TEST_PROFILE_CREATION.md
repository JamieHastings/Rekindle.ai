# Test Plan: Profile Creation via Database Trigger

## Changes Made

1. **AuthContext.tsx** - Updated `loadProfile()` function:
   - Removed manual profile creation code
   - Added retry logic (wait 500ms, then retry after 1 second if profile not found)
   - Now relies entirely on database trigger to create profiles

2. **AuthContext.tsx** - Updated `signUp()` function:
   - Removed manual profile creation fallback
   - Added profile verification step after waiting for trigger
   - Returns error if profile is not created by trigger

3. **UnlockPreviewModal.tsx** - Updated `handleSignUp()` function:
   - Added profile verification step after signup
   - Shows error message if profile is not created
   - Waits 1 second for trigger to complete before verifying

## Testing Steps

### Test 1: New User Signup (Standard Flow)

1. Clear browser storage (localStorage, sessionStorage, cookies)
2. Start the application
3. Navigate to signup page
4. Fill in email, password, and full name
5. Submit signup form
6. **Expected Result:**
   - User account is created
   - Profile is automatically created by database trigger
   - User is signed in
   - Profile loads successfully
   - 3 free tokens are awarded

### Test 2: New User Signup (Unlock Preview Flow)

1. Clear browser storage
2. Generate a preview message (as anonymous user)
3. Click "Unlock Message" button
4. Fill in signup form (email, password, full name)
5. Click "Sign Up & Unlock"
6. **Expected Result:**
   - User account is created
   - Profile is automatically created by database trigger
   - Profile verification succeeds
   - Preview is unlocked
   - User receives 3 free tokens
   - Full message is displayed

### Test 3: Existing User Sign In

1. Use an existing account
2. Sign in with email and password
3. **Expected Result:**
   - User signs in successfully
   - Profile loads (should exist already)
   - No errors in console

### Test 4: Profile Loading After Sign In

1. Sign in to an existing account
2. Check browser console for logs
3. **Expected Result:**
   - "Profile loaded successfully" message in console
   - Profile data is displayed correctly
   - No "Profile not found" errors

### Test 5: Edge Case - Slow Trigger (if applicable)

1. If database trigger is slow, verify retry logic works:
   - First attempt: Wait 500ms
   - If not found: Wait 1 second and retry
   - Should find profile on retry

### Test 6: Verify Profile in Database

1. After successful signup, check Supabase dashboard
2. Go to `profiles` table
3. **Expected Result:**
   - New row exists with user's email
   - `tokens` column shows `3`
   - `full_name` matches what was entered (if provided)
   - `created_at` timestamp is recent

## What Should NOT Happen

❌ No manual profile creation in the frontend
❌ No "failed to create session" errors after signup
❌ No duplicate profile creation attempts
❌ No RLS policy errors when reading profile

## Verification Checklist

- [ ] New user signup works without errors
- [ ] Profile appears in `profiles` table after signup
- [ ] Profile has 3 tokens after creation
- [ ] User can sign in immediately after signup
- [ ] Profile loads correctly after sign in
- [ ] No console errors related to profile creation
- [ ] Unlock preview flow works after signup
- [ ] Existing users can still sign in normally

