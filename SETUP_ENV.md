# Environment Setup Guide

## ✅ Issue 1: Missing OpenAI API Key

### Step 1: Create `.env.local` file

Create a file named `.env.local` in the **root of your project** (same directory as `package.json`).

**Important:**
- File must be named exactly: `.env.local` (not `.env`, not `.env.local.txt`)
- Must be in project root, NOT in `/src/` folder
- Must be at the same level as `package.json`

### Step 2: Add your OpenAI API Key

Open `.env.local` and add:

```env
VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
```

Replace `sk-your-actual-api-key-here` with your actual OpenAI API key.

### Step 3: Restart Dev Server

**⚠️ CRITICAL:** Vite does NOT reload environment variables while running.

You MUST:
1. Stop your dev server (Ctrl+C)
2. Run `npm run dev` again
3. Reload your browser

### Step 4: Verify

After restarting, check the browser console. You should NOT see:
```
❌ Missing OpenAI API Key. Add VITE_OPENAI_API_KEY to .env.local file
```

If you still see the error:
- ✅ Check filename is exactly `.env.local`
- ✅ Check file is in project root (beside `package.json`)
- ✅ Check you restarted the dev server
- ✅ Check there are no extra spaces in the file

## ✅ Issue 2: Profile Not Loading

### For Admin Users

If you're an admin and `hasProfile: false`, you need to ensure your profile exists in Supabase.

#### Option A: Auto-Creation (Recommended)

The app will automatically create a profile when you sign in if one doesn't exist. Just sign in and the profile will be created.

#### Option B: Manual Creation

1. Go to Supabase Dashboard → Authentication → Users
2. Find your user and copy the **UUID** (User ID)
3. Go to Table Editor → `profiles` table
4. Click "Insert row"
5. Fill in:
   - `id`: Paste the UUID from step 2
   - `email`: Your email address
   - `tokens`: `0` (or any starting amount)
   - `is_admin`: `true` (for admin users)
6. Click "Save"

**If you get "Duplicate key" error:**
- The profile already exists
- Go to Table Editor → `profiles`
- Find your row and update it instead of inserting

### For Regular Users

Profiles are created automatically when users sign up. If a profile is missing:

1. Sign out and sign back in
2. The app will auto-create the profile
3. If it still doesn't work, check Supabase logs for errors

## ✅ Issue 3: CORS Errors (Fixed)

The app no longer calls Supabase Edge Functions for preview generation. It now uses OpenAI directly.

If you still see CORS errors:
- Clear your browser cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Restart the dev server

## File Structure

Your project root should look like this:

```
project/
├── .env.local          ← Create this file here
├── package.json
├── src/
├── prompt-templates/
└── ...
```

## Security Notes

✅ `.env.local` is already in `.gitignore` - your API key will NOT be committed to git.

⚠️ **Never commit `.env.local` to version control!**

## Troubleshooting

### "Still seeing API key error after restart"
1. Check file is named exactly `.env.local` (case-sensitive)
2. Check file is in project root
3. Check no typos in variable name: `VITE_OPENAI_API_KEY`
4. Check no quotes around the value (should be: `VITE_OPENAI_API_KEY=sk-...` not `VITE_OPENAI_API_KEY="sk-..."`)

### "Profile still not loading"
1. Check browser console for errors
2. Check Supabase Dashboard → Table Editor → `profiles` table
3. Verify your user UUID matches the profile `id`
4. Try signing out and back in

### "Preview generation still fails"
1. Make sure `.env.local` has the API key
2. Restart dev server
3. Check browser console for specific error messages

