# Testing Preview Generation for Anonymous Users

## Quick Diagnosis

Open your browser console (F12) and run these commands to check the current state:

```javascript
// Check current session state
const session = SessionManager.getOrCreateSession();
console.log('Current Session:', session);
console.log('Can Generate Preview:', session.canGeneratePreview);
console.log('Preview Count:', session.previewCount);
console.log('Max Previews:', 3);

// Check localStorage directly
console.log('LocalStorage Session ID:', localStorage.getItem('rekindle_session_id'));
console.log('LocalStorage Preview Count:', localStorage.getItem('rekindle_preview_count'));

// If preview count is >= 3, reset it:
SessionManager.resetPreviewCount();
console.log('Preview count reset. Try generating again.');
```

## Expected Behavior

1. **First Preview (Count = 0):**
   - Should allow generation
   - Shows preview (2-3 lines)
   - Displays "Unlock Full Message" button
   - Shows "2 previews remaining"

2. **Second Preview (Count = 1):**
   - Should allow generation
   - Shows preview
   - Shows "1 preview remaining"

3. **Third Preview (Count = 2):**
   - Should allow generation
   - Shows preview
   - Shows "0 previews remaining"

4. **Fourth Attempt (Count = 3):**
   - Should show auth modal
   - Error message: "You've used all 3 free previews..."

## Common Issues

### Issue 1: Preview Count Already at 3
**Symptom:** Auth modal appears immediately
**Solution:** Run `SessionManager.resetPreviewCount()` in console

### Issue 2: Corrupted localStorage
**Symptom:** Preview count is NaN or invalid
**Solution:** The code now auto-fixes this, but you can manually reset:
```javascript
localStorage.setItem('rekindle_preview_count', '0');
```

### Issue 3: OpenAI API Key Missing
**Symptom:** Error about missing API key
**Solution:** Check `.env.local` file has `VITE_OPENAI_API_KEY`

### Issue 4: User is Actually Logged In
**Symptom:** Full message shows instead of preview
**Solution:** Sign out first, then try again

## Testing Steps

1. **Clear browser data** (optional, for clean test):
   - Open DevTools → Application → Local Storage
   - Delete all `rekindle_*` keys
   - Or run: `localStorage.clear()`

2. **Verify you're logged out:**
   - Check if you see "Sign In" button in nav
   - If you see "Sign Out", click it first

3. **Open console** (F12) and watch for logs:
   - Look for: "🔍 Anonymous user preview check"
   - Should show: `canGeneratePreview: true` on first attempt

4. **Fill out message form** and click "Generate"

5. **Expected console output:**
   ```
   🔍 Anonymous user preview check: { sessionId: "...", previewCount: 0, canGeneratePreview: true, maxPreviews: 3 }
   ✅ Preview generation allowed, proceeding...
   Generating preview for message type: poem
   🔍 OpenAI Request Debug Info: ...
   ✅ OpenAI Response Received: ...
   ```

6. **Expected UI:**
   - Preview message appears (first 200 characters)
   - "Preview Mode" badge visible
   - "Unlock Full Message + Get 5 Free Tokens" button
   - "2 previews remaining" text

## If Still Not Working

Check the console for errors and share:
1. The console logs (especially the "Anonymous user preview check" log)
2. Any error messages
3. Whether the auth modal appears immediately or after an error

