# Edge Functions Implementation Guide

## Overview

This document describes the improved edge functions architecture that eliminates RLS pain and centralizes all database operations.

## Core Principle

**The frontend never inserts, updates, or deletes database rows directly.**

All database mutations go through Edge Functions using `service_role` to bypass RLS.

## Edge Functions

### 1. `create-profile`

**Purpose:** Auto-creates user profile after signup

**When it runs:** Immediately after signup (called from frontend)

**What it does:**
- Uses service_role to bypass RLS
- Inserts profile safely
- Sets initial tokens to **3** (not 5)
- Prevents duplicates

**Input:** None (uses auth context from Authorization header)

**Output:**
```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "tokens": 3
  }
}
```

**Usage:**
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/create-profile`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});
```

### 2. `generate-message`

**Purpose:** Generate full messages for authenticated users

**When it runs:** When user clicks "Generate" button

**What it does:**
- Validates message type
- Checks token balance
- Calls OpenAI
- Stores full output
- Deducts tokens atomically
- Returns preview and full message

**Token Costs:**
- Poems: **5 tokens**
- Apology: **5 tokens**
- Voice Note (text): **5 tokens**
- Letter: **5 tokens**
- Love Letter + Design: **15 tokens**
- Gift Card + Design: **15 tokens**

**Input:**
```json
{
  "messageType": "poem",
  "promptData": {
    "name": "John",
    "tone": "romantic",
    "relationshipLength": "2 years",
    "characterLength": "medium",
    "additionalDetails": "..."
  },
  "preview": false
}
```

**Output:**
```json
{
  "preview": "First 2-3 lines...",
  "full": "Full message content...",
  "messageId": "uuid",
  "tokens_remaining": 0
}
```

### 3. `regenerate-message`

**Purpose:** Regenerate existing message

**When it runs:** User clicks "Regenerate" button

**What it does:**
- Charges **2 tokens**
- Re-calls OpenAI
- Updates existing message
- Returns new message

**Input:**
```json
{
  "messageId": "uuid"
}
```

**Output:**
```json
{
  "success": true,
  "newMessage": "Regenerated message...",
  "tokens_remaining": 1
}
```

### 4. `get-user-messages`

**Purpose:** Fetch user's past messages for dashboard

**When it runs:** Dashboard load

**What it does:**
- Fetches user's messages
- Supports pagination
- Returns preview and full content
- No direct table access from client

**Input:**
```json
{
  "limit": 50,
  "offset": 0,
  "messageType": "poem" // optional filter
}
```

**Output:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "type": "poem",
      "tone": "romantic",
      "recipient_name": "John",
      "created_at": "2024-01-01T00:00:00Z",
      "preview": "First 200 chars...",
      "full_content": "Full message...",
      "is_favorite": false
    }
  ],
  "count": 10,
  "limit": 50,
  "offset": 0
}
```

### 5. `purchase-tokens`

**Purpose:** Handle Stripe webhook for token purchases

**When it runs:** Stripe webhook (server-to-server)

**What it does:**
- Verifies Stripe event
- Adds tokens atomically
- Logs transaction
- Updates user balance

**Token Packages:**
- 1 token: $1
- 5 tokens: $3
- 25 tokens: $22
- 50 tokens: $40
- 100 tokens: $75

**Input:** Stripe webhook payload

**Output:**
```json
{
  "success": true,
  "tokens_awarded": 5,
  "tokens_remaining": 8
}
```

## Shared Utilities

### `_shared/supabaseAdmin.ts`
- Creates Supabase client with `service_role` key
- Bypasses RLS for all operations

### `_shared/openai.ts`
- Centralized OpenAI API calls
- Handles errors consistently

### `_shared/tokens.ts`
- Token cost definitions
- `getTokenCost()` function
- `adjustUserTokens()` atomic function

### `_shared/cors.ts`
- CORS headers for all functions

## Frontend Changes

### Token Costs Updated

**File:** `src/services/tokenService.ts`

```typescript
export const TOKEN_COSTS = {
  poem: 5,        // was 2
  letter: 5,      // was 2
  apology: 5,     // was 2
  text: 5,        // was 2
  giftcard: 15,   // was 2
  love_letter: 15, // new
};
```

### Signup Bonus Updated

**File:** `src/contexts/AuthContext.tsx`

- Changed from **5 tokens** to **3 tokens**

**Files updated:**
- `src/contexts/AuthContext.tsx`
- `src/components/UnlockPreviewModal.tsx`
- `src/components/PreviewMessageDisplay.tsx`
- `src/services/previewService.ts`

### Database Migration

**File:** `supabase/migrations/20251201000000_update_signup_tokens_to_3.sql`

- Updates `handle_new_user()` function to give **3 tokens** instead of 5

## Migration Steps

1. **Deploy edge functions:**
   ```bash
   supabase functions deploy create-profile
   supabase functions deploy generate-message
   supabase functions deploy regenerate-message
   supabase functions deploy get-user-messages
   supabase functions deploy purchase-tokens
   ```

2. **Run database migration:**
   ```sql
   -- Run supabase/migrations/20251201000000_update_signup_tokens_to_3.sql
   ```

3. **Update frontend:**
   - Token costs already updated
   - Signup bonus already updated
   - Update API calls to use new edge functions

4. **Update frontend API calls:**
   - Replace direct database writes with edge function calls
   - Use `create-profile` after signup
   - Use `generate-message` for message generation
   - Use `regenerate-message` for regeneration
   - Use `get-user-messages` for dashboard

## Benefits

✅ **No more RLS insert failures**
✅ **No more schema mismatch bugs**
✅ **No more auth race conditions**
✅ **No more token desync**
✅ **Centralized token logic**
✅ **Better security (service_role only in edge functions)**
✅ **Easier debugging (all DB operations in one place)**

## What NOT To Do

❌ Client `.insert()` on profiles
❌ Client `.update()` on profiles
❌ Client `.insert()` on generated_messages
❌ Client token math
❌ Client profile creation

## What To Do Instead

✅ Call `create-profile` edge function after signup
✅ Call `generate-message` edge function for generation
✅ Call `regenerate-message` edge function for regeneration
✅ Call `get-user-messages` edge function for dashboard
✅ Let Stripe webhook call `purchase-tokens` automatically

