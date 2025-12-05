# Supabase Setup Checklist

Use this checklist to verify your Supabase setup is complete.

## Prerequisites
- [ ] Supabase account created
- [ ] Project created with ref: `cxjigazdzujttcsyzatz`
- [ ] Node.js and npm installed

## Environment Setup
- [ ] `.env` file created in project root
- [ ] `VITE_SUPABASE_URL` set to your project URL
- [ ] `VITE_SUPABASE_ANON_KEY` set (full key from Supabase dashboard)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (optional, for admin scripts)

## Database Migrations
- [ ] Migration 1: `20251123005729_create_rekindle_schema.sql` - Core schema
- [ ] Migration 2: `20251123023340_fix_user_signup_rls.sql` - RLS fixes
- [ ] Migration 3: `20251123180513_add_n8n_integration_tables.sql` - Integration tables
- [ ] Migration 4: `001_admin_schema.sql` - Admin features

## Database Tables (Verify in Supabase Dashboard > Table Editor)
- [ ] `profiles` table exists
- [ ] `generated_messages` table exists
- [ ] `token_transactions` table exists
- [ ] `email_logs` table exists
- [ ] `stripe_payments` table exists
- [ ] `n8n_webhook_logs` table exists
- [ ] `message_templates` table exists
- [ ] `admin_actions` table exists

## Edge Functions (Verify in Supabase Dashboard > Edge Functions)
- [ ] `generate-preview` deployed
- [ ] `unlock-preview` deployed
- [ ] `generate-message` deployed
- [ ] `admin_adjust_tokens` deployed (optional)
- [ ] `admin_generate_report` deployed (optional)

## RLS Policies (Verify in Supabase Dashboard > Authentication > Policies)
- [ ] Profiles table has RLS enabled
- [ ] Generated messages table has RLS enabled
- [ ] Token transactions table has RLS enabled
- [ ] All tables have appropriate policies

## Admin Setup
- [ ] Admin schema migration run (`001_admin_schema.sql`)
- [ ] Admin account created (set `is_admin = true` for your email)
- [ ] Admin dashboard accessible when logged in as admin

## Testing
- [ ] App starts without errors (`npm run dev`)
- [ ] Can generate preview as anonymous user
- [ ] Can sign up new account
- [ ] Receives 5 free tokens on signup
- [ ] Can generate full message (costs 2 tokens)
- [ ] Dashboard shows message history
- [ ] Admin dashboard accessible (if admin account)

## Optional Features
- [ ] n8n webhooks configured (if using)
- [ ] Stripe keys configured (if using payments)
- [ ] Email templates set up

## Verification Script
Run the verification script to check everything automatically:
```bash
node scripts/verify-setup.js
```

Or check manually using the Supabase dashboard and test your app functionality.
