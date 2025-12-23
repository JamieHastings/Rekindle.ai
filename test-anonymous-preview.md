# Testing Anonymous User Preview Generation

## Quick Test Steps

1. **Clear browser data** (to start fresh):
   - Open browser console (F12)
   - Run: `localStorage.clear()` and `sessionStorage.clear()`
   - Refresh the page

2. **Verify you're logged out**:
   - Check that no user is signed in
   - You should see "Sign In" button in nav (not "Dashboard" or "Sign Out")

3. **Navigate to generator**:
   - Click "Create My Message Now" button
   - Should navigate to generator view (no login required)

4. **Fill out form**:
   - Select a message type (e.g., "Poem")
   - Fill in required fields
   - Click "Generate"

5. **Check console logs**:
   You should see logs like:
   ```
   🔍 Anonymous user preview check: { sessionId: "...", previewCount: 0, canGeneratePreview: true }
   ✅ Preview generation allowed, proceeding...
   🔄 Starting preview generation for anonymous user
   📝 Message type: poem
   🚀 Calling PreviewService.generatePreview()...
   ✅ Preview generated successfully
   ```

6. **Expected result**:
   - Preview message should appear (2-3 lines)
   - "Unlock Full Message + Get 5 Free Tokens" button should appear
   - NO login prompt should appear (unless preview limit reached)

## Common Issues

### Issue 1: "OpenAI API key is missing"
**Solution**: Add `VITE_OPENAI_API_KEY` to `.env.local` file and restart dev server

### Issue 2: "Preview limit reached"
**Solution**: Reset preview count in console:
```javascript
SessionManager.resetPreviewCount()
```

### Issue 3: Error appears but unclear
**Check console** for detailed error logs starting with 🔄, ✅, or ❌

### Issue 4: Form won't submit
**Check**: Make sure all required fields are filled

## Debugging Commands

Run these in browser console:

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
```

