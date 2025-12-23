# OpenAI Request Tracking Report

## Issue Summary
When testing the message type AI generating feature on rekindle.ai, requests are not appearing in your OpenAI account dashboard.

## Root Cause Analysis

### Current Implementation Flow

1. **User fills out message type form** → Data is collected
2. **Prompt is rendered** → `renderPromptFromForm()` creates the prompt from template
3. **OpenAI API is called directly from browser** → `generateAIText()` in `src/services/openaiService.ts`
4. **API Key Source**: `VITE_OPENAI_API_KEY` from `.env.local` file

### Where Requests Are Going

**The requests are going to the OpenAI account that owns the API key stored in `VITE_OPENAI_API_KEY`.**

This means:
- ✅ Requests ARE being made to OpenAI API
- ❌ They appear in the account that owns the API key in `.env.local`, NOT your personal account
- ⚠️ If the API key is missing or invalid, requests will fail silently

## Code Path Analysis

### For Logged-In Users (Message Generation)

**File**: `src/App.tsx` (line 211)
```typescript
const generatedMessage = await generateAIText(prompt);
```

**File**: `src/services/openaiService.ts` (line 45)
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [...],
  // ...
});
```

**API Key Used**: `import.meta.env.VITE_OPENAI_API_KEY` (from `.env.local`)

**Request Destination**: `https://api.openai.com/v1/chat/completions`

### For Non-Logged-In Users (Preview)

**File**: `src/services/previewService.ts` (line 78)
```typescript
const fullContent = await generateAIText(prompt);
```

Same code path as above - uses the same API key.

## How to Verify Where Requests Are Going

### Step 1: Check Your API Key

1. Open `.env.local` file in project root
2. Find `VITE_OPENAI_API_KEY=sk-...`
3. Note the first 7 characters (e.g., `sk-proj`)

### Step 2: Check OpenAI Dashboard

1. Go to https://platform.openai.com/api-keys
2. Look for an API key that starts with the same 7 characters
3. **The account shown there is where your requests are appearing**

### Step 3: Check Usage Dashboard

1. Go to https://platform.openai.com/usage
2. Filter by the date/time you tested
3. Look for requests to `gpt-4o-mini` model
4. **These requests will be under the account that owns the API key**

### Step 4: Run Test Script

```bash
node scripts/test-openai-request-tracking.js
```

This script will:
- Show which API key is being used
- Make a test API call
- Tell you where to find the request in OpenAI dashboard

## Common Issues

### Issue 1: API Key Belongs to Different Account

**Symptom**: Requests don't appear in your account

**Solution**: 
- Replace `VITE_OPENAI_API_KEY` in `.env.local` with your own API key
- Get your key from: https://platform.openai.com/api-keys
- Restart the dev server after changing `.env.local`

### Issue 2: API Key Not Set

**Symptom**: Error message "OpenAI API key is missing"

**Solution**:
1. Create `.env.local` file in project root
2. Add: `VITE_OPENAI_API_KEY=sk-your-actual-key-here`
3. Restart dev server

### Issue 3: Invalid API Key

**Symptom**: 401 Unauthorized errors

**Solution**:
- Verify the API key is correct (no extra spaces, quotes, etc.)
- Check if the key has been revoked
- Generate a new key from OpenAI dashboard

### Issue 4: Insufficient Quota

**Symptom**: "insufficient_quota" error

**Solution**:
- Add credits to the OpenAI account that owns the API key
- Or use a different API key from an account with credits

## Enhanced Logging

I've added detailed logging to help track requests:

### In Browser Console

When you generate a message, you'll now see:
```
🔍 OpenAI Request Debug Info:
  - API Key Preview: sk-proj...xyz1
  - API Endpoint: https://api.openai.com/v1/chat/completions
  - Model: gpt-4o-mini
  - Request Source: Browser (direct client-side call)
  - Prompt Length: 1234 characters

✅ OpenAI Response Received:
  - Response ID: chatcmpl-abc123
  - Model Used: gpt-4o-mini
  - Tokens Used: 456
```

### What to Look For

1. **API Key Preview**: First 7 + last 4 characters of the key being used
2. **Response ID**: Unique ID for each request (can be searched in OpenAI dashboard)
3. **Tokens Used**: Confirms the request was successful

## Alternative Implementation (Not Currently Used)

There is a Supabase Edge Function (`supabase/functions/generate-message/index.ts`) that could proxy requests, but it's **not being used** in the current implementation.

The Edge Function would:
- Use `OPENAI_API_KEY` from Supabase environment (server-side)
- Make requests from the server instead of browser
- Requests would appear under the account that owns the Supabase environment's API key

**To use this instead**, you would need to:
1. Set up the Supabase Edge Function
2. Configure `OPENAI_API_KEY` in Supabase secrets
3. Modify `App.tsx` to call the Edge Function instead of `generateAIText()`

## Recommendations

### For Development
1. ✅ Use your own API key in `.env.local`
2. ✅ Check browser console for detailed request logs
3. ✅ Use the test script to verify API key

### For Production
⚠️ **Security Warning**: Currently, the API key is exposed in the browser bundle.

**Recommended**: Use Supabase Edge Functions to proxy requests:
- API key stays on server
- Better security
- Centralized request tracking
- Easier to monitor usage

## Next Steps

1. **Check your `.env.local` file** - Verify which API key is set
2. **Run the test script** - `node scripts/test-openai-request-tracking.js`
3. **Check OpenAI dashboard** - Look for requests under the account that owns the API key
4. **Update API key if needed** - Replace with your own key if different account

## Files Modified

- `src/services/openaiService.ts` - Added detailed logging
- `src/App.tsx` - Added logging for request tracking
- `scripts/test-openai-request-tracking.js` - New test script
- `OPENAI_REQUEST_TRACKING_REPORT.md` - This document

