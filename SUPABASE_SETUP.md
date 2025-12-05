# Supabase Setup Guide for Rekindle.ai

This guide will walk you through connecting your Rekindle.ai application to your Supabase account.

## Prerequisites

- ✅ Supabase account created at [supabase.com](https://supabase.com)
- ✅ Node.js and npm installed
- Supabase CLI installed (optional but recommended)

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project (project ref: `cxjigazdzujttcsyzatz`)
3. Go to **Settings** > **API**
4. Copy the following values:
   - **Project URL** → This is your `VITE_SUPABASE_URL`
   - **anon public** key → This is your `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → This is your `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

## Step 2: Create Environment File

Create a `.env` file in the project root with your credentials:

```env
VITE_SUPABASE_URL=https://cxjigazdzujttcsyzatz.supabase.co
VITE_SUPABASE_ANON_KEY=your-complete-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

⚠️ **Important:** 
- Replace `your-complete-anon-key-here` with the full anon key from Supabase dashboard
- The `.env` file is already added to `.gitignore` to keep your keys safe
- Never commit your `.env` file to git!

## Step 3: Install Supabase CLI (Recommended)

```bash
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

## Step 4: Link Your Project to Supabase

```bash
supabase link --project-ref cxjigazdzujttcsyzatz
```

You'll be prompted to:
1. Enter your database password (set when creating the project)
2. Or use your access token (get from Supabase dashboard > Settings > Access Tokens)

## Step 5: Run Database Migrations

All migration files are in `supabase/migrations/`. Run them in order:

### Option A: Using Supabase CLI (Recommended)

```bash
supabase db push
```

This will run all migrations automatically.

### Option B: Manual Migration via SQL Editor

If you prefer to run migrations manually:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Run each migration file **in this exact order**:

#### Migration 1: Core Schema
Copy and paste contents of:
- `supabase/migrations/20251123005729_create_rekindle_schema.sql`

#### Migration 2: Fix RLS Policies
Copy and paste contents of:
- `supabase/migrations/20251123023340_fix_user_signup_rls.sql`

#### Migration 3: Integration Tables
Copy and paste contents of:
- `supabase/migrations/20251123180513_add_n8n_integration_tables.sql`

#### Migration 4: Admin Schema
Copy and paste contents of:
- `supabase/migrations/001_admin_schema.sql`

## Step 6: Deploy Edge Functions

Deploy all Edge Functions to Supabase:

```bash
# Deploy core functions
supabase functions deploy generate-preview
supabase functions deploy unlock-preview
supabase functions deploy generate-message

# Deploy admin functions (optional)
supabase functions deploy admin_adjust_tokens
supabase functions deploy admin_generate_report
```

### Edge Functions Overview

1. **generate-preview**
   - Generates partial message previews for anonymous users
   - Allows 3 free previews per session
   - Location: `supabase/functions/generate-preview/index.ts`

2. **unlock-preview**
   - Unlocks full message when user signs up
   - Awards 5 free tokens to new users
   - Location: `supabase/functions/unlock-preview/index.ts`

3. **generate-message**
   - Generates full AI messages for authenticated users
   - Deducts 2 tokens per generation
   - Location: `supabase/functions/generate-message/index.ts`

## Step 7: Set Up Admin Account (Optional)

To make your account an admin:

1. Run the SQL migration:
   ```sql
   UPDATE profiles 
   SET is_admin = true 
   WHERE email = 'your-email@example.com';
   ```

Or use the provided script:
```bash
node scripts/make-admin.js
```

(Make sure to update the email in the script first)

## Step 8: Verify Setup

### Check Database Tables

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - ✅ profiles
   - ✅ generated_messages
   - ✅ token_transactions
   - ✅ email_logs
   - ✅ stripe_payments
   - ✅ n8n_webhook_logs
   - ✅ message_templates
   - ✅ admin_actions

### Check Edge Functions

1. Go to **Edge Functions** in Supabase dashboard
2. You should see:
   - ✅ generate-preview
   - ✅ unlock-preview
   - ✅ generate-message

### Check RLS Policies

1. Go to **Authentication** > **Policies**
2. Verify RLS is enabled on all tables
3. Policies should allow:
   - Users to access their own data
   - Admins to access all data

## Step 9: Test the Connection

Start your development server:

```bash
npm run dev
```

### Test Checklist

1. **Anonymous Preview Generation**
   - Open the app without signing in
   - Click "Create My Message Now"
   - Fill out the form and generate a message
   - You should see a blurred preview
   - You get 3 free previews

2. **User Signup**
   - Click the "Unlock" button on a preview
   - Sign up with email and password
   - Verify you receive 5 free tokens
   - Preview should unlock automatically

3. **Full Message Generation**
   - Sign in to your account
   - Generate a new message (costs 2 tokens)
   - Verify token balance decreases
   - Message should appear in full

4. **Dashboard Access**
   - Click "Dashboard" button in navigation
   - You should see your message history
   - Try favoriting, copying, and downloading messages
   - Test search and filter functionality

5. **Admin Dashboard** (if admin account)
   - Click "Admin" button in navigation
   - Should see users, payments, and templates tables

## Troubleshooting

### Issue: "Missing Supabase environment variables" error

**Solution:** 
1. Make sure `.env` file exists in project root
2. Verify both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. Restart your dev server after creating/updating `.env`

### Issue: User signup fails

**Solutions:**
1. Verify all migration files were run in order
2. Check Supabase logs in dashboard under **Logs** > **Postgres Logs**
3. Ensure email confirmation is disabled in **Authentication** > **Providers** > **Email**

### Issue: Edge Functions return 404

**Solutions:**
1. Verify functions are deployed: check **Edge Functions** in dashboard
2. Redeploy functions: `supabase functions deploy <function-name>`
3. Check function logs in Supabase dashboard

### Issue: RLS policy errors

**Solutions:**
1. Verify all migration files were run in order
2. Check policies exist in **Authentication** > **Policies**
3. Ensure you're authenticated when testing (JWT token present)

### Issue: Preview generation fails

**Solutions:**
1. Check browser console for errors
2. Verify Edge Function `generate-preview` is deployed
3. Check Edge Function logs in Supabase dashboard
4. Ensure CORS headers are properly configured

## Next Steps

1. **Customize AI Prompts** - Edit Edge Function prompts for better messages
2. **Set Up Email Templates** - Configure email automation (see `email-templates/`)
3. **Enable Payments** - Connect Stripe for token purchases
4. **Deploy to Production** - Build and deploy your app
5. **Monitor Usage** - Track metrics in Supabase dashboard

## Support

- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Supabase Discord:** [discord.supabase.com](https://discord.supabase.com)
- **Project Documentation:** See `IMPLEMENTATION_SUMMARY.md` for technical details

---

**Your Supabase project is ready to go!** Follow the steps above and you'll have a fully functional Rekindle.ai application connected to your database.
