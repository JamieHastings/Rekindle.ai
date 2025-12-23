# Testing Message Saving to generated_messages Table

## Overview

All message saving is done through Edge Functions using `service_role` (bypasses RLS), so **you do NOT need to change RLS policies**.

## Functions That Save Messages

### 1. `generate-message` Edge Function
- **File:** `supabase/functions/generate-message/index.ts`
- **Line:** 274-288
- **Uses:** `supabaseAdmin` (service_role) - **BYPASSES RLS**
- **When:** When logged-in user generates a message
- **Saves:** Full message to `generated_messages` table

### 2. `unlock-preview` Edge Function
- **File:** `supabase/functions/unlock-preview/index.ts`
- **Line:** 147-163
- **Uses:** `supabaseAdmin` (service_role) - **BYPASSES RLS**
- **When:** When user unlocks a preview after signup
- **Saves:** Unlocked preview message to `generated_messages` table

## Verification: Both Use service_role

Both functions use:
```typescript
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

// This uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS
const { data: savedMessage, error: saveError } = await supabaseAdmin
  .from("generated_messages")
  .insert({...})
```

**This means RLS policies are NOT blocking these inserts.**

## Testing Steps

### Test 1: Generate Message as Logged-In User

1. **Sign in** to your account
2. **Generate a message** (any type)
3. **Check browser console** for:
   ```
   ✅ Message generated via edge function: {
     messageId: "uuid-here",
     tokens_remaining: X,
     ...
   }
   ```
4. **Check Supabase Dashboard:**
   - Go to Table Editor → `generated_messages`
   - Filter by your user_id
   - Should see the new message row
   - Check `created_at` is recent

### Test 2: Unlock Preview Message

1. **Generate a preview** as anonymous user
2. **Unlock it** by creating an account
3. **Check browser console** for unlock success
4. **Check Supabase Dashboard:**
   - Go to Table Editor → `generated_messages`
   - Filter by your user_id
   - Should see the unlocked message
   - Check `was_preview` = true

### Test 3: Check Edge Function Logs

1. **Go to Supabase Dashboard**
2. **Navigate to:** Edge Functions → Logs
3. **Select:** `generate-message` function
4. **Look for:**
   - Successful inserts (status 200)
   - Any error messages about saving

## Expected Results

✅ **Messages should be saved** - Both functions use service_role
✅ **No RLS errors** - service_role bypasses RLS
✅ **Messages appear in dashboard** - Should be visible immediately

## If Messages Are NOT Being Saved

### Check 1: Edge Function Errors
Look in Supabase Dashboard → Edge Functions → Logs for:
- `generate-message` function errors
- `unlock-preview` function errors
- Look for "Failed to save message" in logs

### Check 2: Database Schema
Verify the `generated_messages` table exists:
```sql
SELECT * FROM generated_messages LIMIT 1;
```

### Check 3: Edge Function Deployment
Make sure edge functions are deployed:
```bash
supabase functions deploy generate-message
supabase functions deploy unlock-preview
```

### Check 4: Environment Variables
Verify in Supabase Dashboard → Settings → Edge Functions:
- `SUPABASE_SERVICE_ROLE_KEY` is set
- `OPENAI_API_KEY` is set (for generate-message)

## Current Implementation Status

✅ **No client-side inserts** - All inserts go through edge functions
✅ **Uses service_role** - Bypasses RLS automatically
✅ **Error handling** - Errors are logged but don't fail the request
✅ **Returns messageId** - For regeneration functionality

## RLS Policy Status

**You do NOT need to change RLS policies** because:
1. All inserts use `supabaseAdmin` (service_role)
2. service_role bypasses RLS automatically
3. No client-side code inserts directly

**Current RLS Policy (for reference):**
```sql
CREATE POLICY "Users can insert own messages"
  ON generated_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

This policy is fine - it's not being used because edge functions bypass RLS.

## Debugging Commands

### Check if messages are being saved:
```sql
-- In Supabase SQL Editor
SELECT 
  id,
  user_id,
  message_type,
  recipient_name,
  created_at,
  was_preview
FROM generated_messages
ORDER BY created_at DESC
LIMIT 10;
```

### Check for recent messages for a specific user:
```sql
-- Replace 'user-uuid-here' with actual user ID
SELECT * FROM generated_messages
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC;
```

### Check edge function logs:
```sql
-- Check if there are any errors in function execution
-- (This is done via Supabase Dashboard → Edge Functions → Logs)
```

