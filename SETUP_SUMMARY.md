# Supabase Setup Summary

## ✅ What's Already Done

1. **Project Structure**
   - ✅ All migration files are in place (`supabase/migrations/`)
   - ✅ All Edge Functions are created (`supabase/functions/`)
   - ✅ Admin dashboard components created
   - ✅ Frontend code configured to use Supabase

2. **Environment File**
   - ✅ `.env` file exists in project root
   - ⚠️ **Action Required**: Verify `.env` contains correct values:
     - `VITE_SUPABASE_URL=https://cxjigazdzujttcsyzatz.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` (get from Supabase dashboard)
     - `SUPABASE_SERVICE_ROLE_KEY` (get from Supabase dashboard)

## 📋 What You Need To Do

### Step 1: Verify/Update Environment Variables

1. Open your `.env` file
2. Make sure it has these values (get from Supabase Dashboard > Settings > API):
   ```
   VITE_SUPABASE_URL=https://cxjigazdzujttcsyzatz.supabase.co
   VITE_SUPABASE_ANON_KEY=your-complete-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### Step 2: Install Supabase CLI (Optional but Recommended)

```bash
npm install -g supabase
```

### Step 3: Run Database Migrations

**Option A: Using Supabase CLI**
```bash
# Link your project
supabase link --project-ref cxjigazdzujttcsyzatz

# Push all migrations
supabase db push
```

**Option B: Manual via SQL Editor**
1. Go to https://supabase.com/dashboard/project/cxjigazdzujttcsyzatz/sql
2. Run each migration file in order:
   - `supabase/migrations/20251123005729_create_rekindle_schema.sql`
   - `supabase/migrations/20251123023340_fix_user_signup_rls.sql`
   - `supabase/migrations/20251123180513_add_n8n_integration_tables.sql`
   - `supabase/migrations/001_admin_schema.sql`

### Step 4: Deploy Edge Functions

```bash
supabase functions deploy generate-preview
supabase functions deploy unlock-preview
supabase functions deploy generate-message
supabase functions deploy admin_adjust_tokens
supabase functions deploy admin_generate_report
```

### Step 5: Make Your Account Admin

Run in Supabase SQL Editor:
```sql
UPDATE profiles 
SET is_admin = true 
WHERE email = 'hastings.jamie05@gmail.com';
```

### Step 6: Verify Setup

Run the verification script:
```bash
npm run verify-setup
```

Or test manually:
1. Start the app: `npm run dev`
2. Try generating a preview (anonymous)
3. Sign up for an account
4. Generate a full message
5. Check the dashboard

## 📚 Documentation Created

- `SUPABASE_SETUP.md` - Complete detailed setup guide
- `SETUP_INSTRUCTIONS.md` - Quick reference guide
- `scripts/setup-checklist.md` - Checklist for verification
- `scripts/verify-setup.js` - Automated verification script

## 🔍 Quick Verification

After completing the steps above, check:

1. **In Supabase Dashboard:**
   - ✅ Tables created (8 tables total)
   - ✅ Edge Functions deployed (5 functions)
   - ✅ RLS policies enabled

2. **In Your App:**
   - ✅ Can generate previews (anonymous)
   - ✅ Can sign up and receive tokens
   - ✅ Can generate messages
   - ✅ Dashboard works
   - ✅ Admin dashboard accessible (if admin)

## 🆘 Troubleshooting

If something doesn't work:
1. Check browser console for errors
2. Check Supabase dashboard logs
3. Run `npm run verify-setup` to check configuration
4. See `SUPABASE_SETUP.md` for detailed troubleshooting

## 🎯 Next Steps

Once setup is complete:
1. Customize AI prompts in Edge Functions
2. Configure email templates
3. Set up Stripe for payments (optional)
4. Deploy to production

---

**Need Help?** See `SUPABASE_SETUP.md` for detailed instructions.
