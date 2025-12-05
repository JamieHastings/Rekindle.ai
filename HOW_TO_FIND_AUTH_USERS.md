# How to Find auth.users in Supabase

## Important: `auth.users` is NOT in Table Editor

The `auth.users` table is **automatically created by Supabase Auth** and is located in the `auth` schema, not the `public` schema.

## Where to Find Users

### In Supabase Dashboard:

1. **Go to Authentication section** (left sidebar)
2. Click on **"Users"** tab
3. You'll see all users who have signed up

**NOT in Table Editor** - The `auth.users` table is hidden from the Table Editor for security reasons.

## To See Profiles Table

1. Go to **Table Editor** (left sidebar)
2. Look for **`profiles`** table in the `public` schema
3. This is where user profiles are stored

## If Profiles Table Has 0 Rows

This means either:
- No users have signed up yet
- The signup process isn't working
- The database trigger isn't creating profiles

Let's test the signup process!

