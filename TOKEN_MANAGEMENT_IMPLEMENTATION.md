# Token Management System Implementation

## Overview

A secure, atomic token management system has been implemented using Supabase Edge Functions and SQL functions. This replaces the previous direct database updates with a secure, server-side approach.

## ✅ What Was Implemented

### 1. SQL Function: `adjust_user_tokens`

**File:** `supabase/migrations/20251125000000_create_adjust_user_tokens_function.sql`

- **Purpose:** Atomically adjusts user tokens with proper error handling
- **Features:**
  - Validates inputs (user ID, delta value)
  - Checks for insufficient tokens before deducting
  - Updates tokens atomically
  - Records transaction in `token_transactions` table
  - Returns new token balance
  - Raises specific exceptions for error handling

**Usage:**
```sql
SELECT adjust_user_tokens(
  p_user_id := 'user-uuid',
  p_delta := -2,  -- Negative to deduct, positive to add
  p_reason := 'generate_message'
);
```

### 2. Edge Function: `deduct_tokens`

**File:** `supabase/functions/deduct_tokens/index.ts`

- **Purpose:** Secure server-side token deduction
- **Features:**
  - Validates user authentication via JWT
  - Calls `adjust_user_tokens` SQL function
  - Handles errors gracefully (insufficient tokens, profile not found)
  - Returns remaining token balance

**Endpoint:** `POST /functions/v1/deduct_tokens`

**Request:**
```json
{
  "cost": 2,
  "reason": "generate_message",
  "messageType": "poem"
}
```

**Response:**
```json
{
  "success": true,
  "tokens_remaining": 8,
  "tokens_deducted": 2
}
```

### 3. Edge Function: `add_tokens`

**File:** `supabase/functions/add_tokens/index.ts`

- **Purpose:** Secure server-side token addition (for purchases)
- **Features:**
  - Validates user authentication via JWT
  - Calls `adjust_user_tokens` SQL function
  - Supports payment tracking via `paymentId`
  - Records transaction with metadata

**Endpoint:** `POST /functions/v1/add_tokens`

**Request:**
```json
{
  "amount": 25,
  "reason": "purchase",
  "paymentId": "stripe_payment_123",
  "metadata": { "package": "popular" }
}
```

**Response:**
```json
{
  "success": true,
  "tokens_remaining": 27,
  "tokens_added": 25
}
```

### 4. Frontend Service: `tokenService.ts`

**File:** `src/services/tokenService.ts`

- **Purpose:** Client-side service to interact with token Edge Functions
- **Features:**
  - `deductTokens()` - Deduct tokens with error handling
  - `addTokens()` - Add tokens (for purchases)
  - `getTokenCost()` - Get token cost for message type
  - `hasEnoughTokens()` - Check if user has enough tokens
  - Token cost mapping for different message types

**Token Costs:**
- All message types: 2 tokens (currently)
- Can be easily extended for different costs per type

### 5. Updated App.tsx

**Changes:**
- ✅ Checks tokens **BEFORE** generating (prevents wasted API calls)
- ✅ Uses `deductTokens()` Edge Function instead of direct DB update
- ✅ Uses `addTokens()` Edge Function for purchases
- ✅ Proper error handling for insufficient tokens
- ✅ Shows token modal when tokens are insufficient
- ✅ Updated `handleRegenerate()` to use token service

## 🔄 Flow Comparison

### Before (Insecure - Direct DB Update)
```
1. Generate message (expensive API call)
2. Update tokens directly in frontend
3. Record transaction
❌ Race conditions possible
❌ No atomic operations
❌ Can generate without sufficient tokens
```

### After (Secure - Edge Functions)
```
1. Check tokens
2. Deduct tokens FIRST (atomic operation)
3. Generate message (only if deduction succeeded)
4. Save message
✅ Atomic operations
✅ Prevents wasted API calls
✅ Secure server-side validation
```

## 🚀 Usage Examples

### Deduct Tokens (Message Generation)

```typescript
import { deductTokens, getTokenCost } from './services/tokenService';

// Check tokens first
const cost = getTokenCost('poem');
if (currentTokens < cost) {
  // Show token purchase modal
  return;
}

// Deduct tokens
try {
  const result = await deductTokens(cost, 'generate_message', 'poem');
  console.log(`Remaining tokens: ${result.tokens_remaining}`);
  
  // Now generate message
  const message = await generateAIText(prompt);
} catch (error) {
  if (error.message.includes('Insufficient tokens')) {
    // Show purchase modal
  }
}
```

### Add Tokens (Purchase)

```typescript
import { addTokens } from './services/tokenService';

try {
  const result = await addTokens(
    25,
    'purchase',
    'stripe_payment_123',
    { package: 'popular' }
  );
  console.log(`New balance: ${result.tokens_remaining}`);
} catch (error) {
  console.error('Failed to add tokens:', error);
}
```

## 📋 Deployment Steps

### 1. Run SQL Migration

```bash
# Apply the migration to create adjust_user_tokens function
supabase migration up
```

Or manually run:
```sql
-- Run supabase/migrations/20251125000000_create_adjust_user_tokens_function.sql
```

### 2. Deploy Edge Functions

```bash
# Deploy deduct_tokens function
supabase functions deploy deduct_tokens

# Deploy add_tokens function
supabase functions deploy add_tokens
```

### 3. Verify Environment Variables

Ensure these are set in Supabase:
- `SUPABASE_URL` (automatically available)
- `SUPABASE_SERVICE_ROLE_KEY` (automatically available)

### 4. Test the Functions

```bash
# Test deduct_tokens
curl -X POST https://your-project.supabase.co/functions/v1/deduct_tokens \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cost": 2, "reason": "test", "messageType": "poem"}'

# Test add_tokens
curl -X POST https://your-project.supabase.co/functions/v1/add_tokens \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 25, "reason": "test"}'
```

## 🔒 Security Improvements

1. **Server-Side Validation:** All token operations happen server-side
2. **Atomic Operations:** SQL function ensures atomic updates
3. **Authentication Required:** Edge Functions validate JWT tokens
4. **Error Handling:** Proper error messages without exposing internals
5. **Transaction Logging:** All operations are logged in `token_transactions`

## 🐛 Error Handling

### Insufficient Tokens
```json
{
  "error": "insufficient_tokens",
  "message": "Insufficient tokens. Current: 1, Required: 2"
}
```

### Profile Not Found
```json
{
  "error": "profile_not_found",
  "message": "User profile not found"
}
```

### Invalid Token
```json
{
  "error": "invalid_token",
  "message": "Invalid authentication token"
}
```

## 📊 Token Cost Configuration

Currently all message types cost 2 tokens. To change costs, update `src/services/tokenService.ts`:

```typescript
export const TOKEN_COSTS = {
  poem: 2,
  letter: 2,
  apology: 2,
  text: 2,
  giftcard: 2,
  // Future costs:
  // love_letter_template: 15,
  // gift_card_template: 15,
} as const;
```

## 🔄 Migration from Old System

The old system used direct database updates:
```typescript
// OLD (insecure)
await supabase
  .from('profiles')
  .update({ tokens: currentTokens - TOKEN_COST })
  .eq('id', user.id);
```

The new system uses Edge Functions:
```typescript
// NEW (secure)
await deductTokens(TOKEN_COST, 'generate_message', messageType);
```

## ✅ Benefits

1. **Security:** Server-side validation prevents manipulation
2. **Atomicity:** SQL function ensures consistent state
3. **Efficiency:** Check tokens before expensive API calls
4. **Auditability:** All transactions logged
5. **Error Handling:** Clear error messages for users
6. **Scalability:** Easy to add new token costs or features

## 📝 Notes

- Token deduction happens **BEFORE** message generation to prevent wasted API calls
- If generation fails after deduction, tokens are already deducted (by design)
- For refunds, you can call `addTokens()` with negative amount (or create a refund function)
- All operations are logged in `token_transactions` table for audit trail

## 🎯 Next Steps (Optional Enhancements)

1. **Refund Function:** Create `refund_tokens` Edge Function for failed generations
2. **Token Packages:** Different costs for different message types
3. **Token Expiry:** Add expiration dates for purchased tokens
4. **Usage Analytics:** Track token usage patterns
5. **Admin Dashboard:** View token transactions and balances

