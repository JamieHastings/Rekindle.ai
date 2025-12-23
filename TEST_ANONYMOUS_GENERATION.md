# Testing Anonymous Message Generation

## Quick Test Steps

1. **Clear browser data** (to start fresh):
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```
   Then refresh the page (F5)

2. **Verify you're logged out**:
   - Check that no user is signed in
   - You should see "Sign In" button in nav (NOT "Dashboard" or "Sign Out")
   - If you see "Sign Out", click it first

3. **Navigate to generator**:
   - Click "Create My Message Now" button on home page
   - Should navigate to generator view (no login required)
   - If it asks you to login, there's a problem

4. **Open Browser Console** (F12):
   - Go to Console tab
   - Watch for any errors

5. **Fill out form**:
   - Select a message type (e.g., "Poem")
   - Fill in required fields (name, tone, etc.)
   - Click "Generate" button

6. **Check console logs**:
   You should see logs like:
   ```
   🔍 Anonymous user preview check: { sessionId: "...", previewCount: 0, canGeneratePreview: true, maxPreviews: 3 }
   ✅ Preview generation allowed, proceeding...
   🔄 Starting preview generation for anonymous user
   📝 Message type: poem
   📋 Form data: {...}
   ✅ Form data mapped to backend format: {...}
   🚀 Calling PreviewService.generatePreview()...
   🔍 OpenAI Request Debug Info: ...
   ✅ OpenAI Response Received: ...
   ✅ Preview generated successfully: { previewId: "...", partialContentLength: 200, remainingPreviews: 2 }
   ✅ Preview displayed to user
   ```

7. **Expected result**:
   - Preview message should appear (2-3 lines with "..." at end)
   - "Unlock Full Message + Get 3 Free Tokens" button should appear
   - NO login prompt should appear (unless preview limit reached)

## Common Issues and Solutions

### Issue 1: "OpenAI API key is missing"
**Symptom:** Error message about missing API key
**Solution:** 
1. Check `.env.local` file exists in project root
2. Add: `VITE_OPENAI_API_KEY=sk-your-key-here`
3. Restart dev server (stop and start again)

### Issue 2: "Preview limit reached"
**Symptom:** Shows auth modal immediately
**Solution:** Reset preview count:
```javascript
SessionManager.resetPreviewCount()
```
Then try again

### Issue 3: Redirected to login/home
**Symptom:** Can't access generator view without login
**Possible Causes:**
- Check browser console for errors
- Check if `currentView` is being reset
- Verify `handleViewChange` function isn't blocking anonymous users

### Issue 4: Form won't submit
**Symptom:** Clicking Generate does nothing
**Check:**
- Are all required fields filled?
- Check browser console for validation errors
- Check if `handleGenerate` function is being called

### Issue 5: Error appears but unclear
**Check console** for detailed error logs:
- Look for errors starting with 🔄, ✅, or ❌
- Check for red error messages
- Look for network errors in Network tab

## Debugging Commands

Run these in browser console (F12):

```javascript
// Check session status
SessionManager.getOrCreateSession()

// Check preview count
SessionManager.getPreviewCount()

// Reset preview count (for testing)
SessionManager.resetPreviewCount()

// Clear all session data
SessionManager.clearSession()
localStorage.clear()
sessionStorage.clear()

// Check if user is logged in
// (should be null for anonymous)
window.location.reload()
```

## Expected Console Output (Success)

```
🔍 Anonymous user preview check: {
  sessionId: "session_1234567890_abc123",
  previewCount: 0,
  canGeneratePreview: true,
  maxPreviews: 3
}
✅ Preview generation allowed, proceeding...
🔄 Starting preview generation for anonymous user
📝 Message type: poem
📋 Form data: { messageType: "poem", loverName: "John", ... }
✅ Form data mapped to backend format: { messageType: "rekindling", name: "John", ... }
🚀 Calling PreviewService.generatePreview()...
🔍 OpenAI Request Debug Info:
  - API Key Preview: sk-proj...xyz1
  - API Endpoint: https://api.openai.com/v1/chat/completions
  - Model: gpt-4o-mini
  - Request Source: Browser (direct client-side call)
  - Prompt Length: 456 characters
✅ OpenAI Response Received:
  - Response ID: chatcmpl-abc123...
  - Model Used: gpt-4o-mini
  - Tokens Used: 123
✅ Preview generated successfully: {
  previewId: "preview_1234567890_xyz123",
  partialContentLength: 200,
  remainingPreviews: 2
}
✅ Preview displayed to user
```

## What Should NOT Happen

❌ Auth modal appearing immediately (unless preview limit reached)
❌ Redirect to home page
❌ "Please sign in" message
❌ Error about RLS policies
❌ Blank screen
❌ Form not submitting

## Verification Checklist

- [ ] Can access generator view without login
- [ ] Form submits successfully
- [ ] Preview message appears (2-3 lines)
- [ ] "Unlock Full Message" button appears
- [ ] No auth modal (unless limit reached)
- [ ] Console shows success logs
- [ ] No errors in console

## If Still Not Working

1. **Share console logs** - Copy all console output
2. **Share error messages** - Any red errors
3. **Check Network tab** - Any failed requests?
4. **Verify environment variables** - Is VITE_OPENAI_API_KEY set?
5. **Check browser** - Try incognito/private mode
6. **Check React DevTools** - Are there any React errors?

