# Quick Setup Instructions

## Step 1: Create Your `.env` File

Create a file named `.env` in the project root directory with the following content:

```env
VITE_SUPABASE_URL=https://cxjigazdzujttcsyzatz.supabase.co
VITE_SUPABASE_ANON_KEY=your-complete-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**To get your keys:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** > **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

## Step 2: Install Supabase CLI

```bash
npm install -g supabase
```

Or use npx (no global install needed):
```bash
npx supabase --version
```

## Step 3: Run Database Migrations

### Option A: Using Supabase CLI

```bash
# Link your project
supabase link --project-ref cxjigazdzujttcsyzatz

# Push migrations
supabase db push
```

### Option B: Manual via SQL Editor

1. Go to Supabase Dashboard > SQL Editor
2. Run each migration file in order:
   - `supabase/migrations/20251123005729_create_rekindle_schema.sql`
   - `supabase/migrations/20251123023340_fix_user_signup_rls.sql`
   - `supabase/migrations/20251123180513_add_n8n_integration_tables.sql`
   - `supabase/migrations/001_admin_schema.sql`

## Step 4: Deploy Edge Functions

```bash
supabase functions deploy generate-preview
supabase functions deploy unlock-preview
supabase functions deploy generate-message
supabase functions deploy admin_adjust_tokens
supabase functions deploy admin_generate_report
```

## Step 5: Set Up Admin Account

Run in Supabase SQL Editor:
```sql
UPDATE profiles 
SET is_admin = true 
WHERE email = 'hastings.jamie05@gmail.com';
```

## Step 6: Start the App

```bash
npm run dev
```

For detailed instructions, see `SUPABASE_SETUP.md`
