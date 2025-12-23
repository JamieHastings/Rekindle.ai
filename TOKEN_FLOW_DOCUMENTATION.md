# Token Flow Documentation

## Overview

This document describes the token flow for new users and message generation.

## New User Token Flow

### Initial State
- **New users receive:** 3 free tokens when account is created
- **Token source:** `create-profile` edge function or database trigger

### First Message Generation
- **Cost:** FREE (0 tokens)
- **User still has:** 3 tokens after first generation
- **Implementation:** The `generate-message` edge function checks if this is the user's first message (count = 0) and makes it free

### First Regeneration
- **Cost:** 2 tokens
- **User has after regeneration:** 1 token remaining (3 - 2 = 1)
- **Implementation:** The `regenerate-message` edge function always costs 2 tokens

### Subsequent Actions
- **New message type:** Requires tokens (5 for most types, 15 for giftcard/love_letter)
- **Additional regenerations:** Cost 2 tokens each
- **User must purchase tokens** if they don't have enough

## Token Costs

### Message Generation Costs
| Message Type | Cost |
|-------------|------|
| Poem | 5 tokens |
| Apology | 5 tokens |
| Voice Note (text) | 5 tokens |
| Letter | 5 tokens |
| Gift Card | 15 tokens |
| Love Letter | 15 tokens |

### Regeneration Cost
- **All regenerations:** 2 tokens (regardless of message type)

## Flow Diagram

```
New User (3 tokens)
    ↓
Generate First Message
    ↓
FREE (0 tokens deducted)
    ↓
User still has: 3 tokens
    ↓
Regenerate First Message
    ↓
Cost: 2 tokens
    ↓
User has: 1 token remaining
    ↓
Generate New Message Type
    ↓
Cost: 5-15 tokens (depending on type)
    ↓
User needs to purchase tokens
```

## Implementation Details

### `generate-message` Edge Function

**File:** `supabase/functions/generate-message/index.ts`

**Logic:**
1. Check if user has any existing messages
2. If `messageCount === 0`: First message is FREE (0 tokens)
3. If `messageCount > 0`: Deduct normal token cost (5-15 tokens)
4. Check token balance before deducting (only for non-first messages)

**Code:**
```typescript
// Check if this is the user's first message generation
const { count: messageCount } = await supabaseAdmin
  .from("generated_messages")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id);

const isFirstMessage = (messageCount || 0) === 0;
const actualTokenCost = isFirstMessage ? 0 : tokenCost;
```

### `regenerate-message` Edge Function

**File:** `supabase/functions/regenerate-message/index.ts`

**Logic:**
- Always costs 2 tokens
- Checks token balance before regenerating
- Updates existing message with new content

## Testing Scenarios

### Scenario 1: New User First Message
1. User signs up → Gets 3 tokens
2. User generates first message → FREE (still has 3 tokens)
3. User regenerates → Costs 2 tokens (now has 1 token)
4. User tries to generate new message type → Needs 5 tokens (only has 1) → Must purchase

### Scenario 2: Existing User
1. User has 10 tokens
2. User generates message → Costs 5 tokens (now has 5 tokens)
3. User regenerates → Costs 2 tokens (now has 3 tokens)
4. User generates another message → Costs 5 tokens (now has -2) → Error: Insufficient tokens

## Database Schema

### `profiles` Table
- `tokens` (integer) - Current token balance
- Default: 3 for new users

### `generated_messages` Table
- `id` (uuid) - Message ID
- `user_id` (uuid) - User who generated the message
- `message_type` (text) - Type of message
- `generated_content` (text) - Full message content
- `created_at` (timestamptz) - Generation timestamp

### `token_transactions` Table
- `user_id` (uuid) - User ID
- `transaction_type` (text) - "credit" or "debit"
- `amount` (integer) - Token amount (positive for credit, negative for debit)
- `description` (text) - Transaction description
- `metadata` (jsonb) - Additional transaction data

## Edge Cases

### Edge Case 1: User Deletes All Messages
- If user deletes all messages, their next generation will be FREE again
- **Solution:** Consider tracking "first_message_generated" flag in profiles table instead of counting messages

### Edge Case 2: Multiple Tabs/Devices
- User generates first message in tab 1 (FREE)
- User tries to generate in tab 2 simultaneously
- Both might be counted as first message
- **Solution:** Database transaction ensures atomicity, only one will be free

### Edge Case 3: Regeneration Before First Message
- User regenerates a message that doesn't exist
- **Solution:** Edge function checks message exists and belongs to user

## Future Improvements

1. **Track first message flag:** Add `first_message_generated` boolean to profiles table
2. **Free regeneration limit:** Allow one free regeneration per message
3. **Token packages:** Different pricing tiers
4. **Subscription model:** Unlimited messages for subscribers

