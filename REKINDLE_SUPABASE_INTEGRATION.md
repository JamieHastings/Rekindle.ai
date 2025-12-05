# Rekindle.ai to Supabase Integration Guide

This guide explains how to connect Rekindle.ai user creation to Supabase profiles table.

## Overview

When a new user is created on Rekindle.ai, their data needs to be transferred to Supabase:
1. **Supabase Auth User** - Created in `auth.users` table
2. **Profile Record** - Created in `profiles` table with user details

## Architecture

```
Rekindle.ai User Creation
         ↓
RekindleUserService.syncUserToSupabase()
         ↓
    ┌────┴────┐
    ↓         ↓
Supabase Auth  Profiles Table
(auth.users)   (profiles)
```

## Files Created

### 1. `src/services/rekindleUserService.ts`
Core service that handles user synchronization between Rekindle.ai and Supabase.

**Key Functions:**
- `syncUserToSupabase()` - Main function to sync user data
- `updateUserProfile()` - Update existing user profile
- `getUserByEmail()` - Fetch user by email

### 2. `src/utils/rekindleIntegration.ts`
Helper utilities for easy integration.

**Key Functions:**
- `createRekindleUser()` - Create new user and sync to Supabase
- `updateRekindleUserProfile()` - Update existing user
- `getRekindleUserByEmail()` - Get user by email
- `rekindleUserExists()` - Check if user exists

### 3. Updated `src/utils/supabase.ts`
Enhanced with proper error handling for missing environment variables.

## Usage Examples

### Example 1: Create New User on Rekindle.ai

```typescript
import { createRekindleUser } from './utils/rekindleIntegration';

// In your signup form handler
const handleSignup = async (formData: {
  email: string;
  password: string;
  fullName: string;
}) => {
  const result = await createRekindleUser({
    email: formData.email,
    password: formData.password,
    full_name: formData.fullName,
    tokens: 5, // Initial tokens for new users
  });

  if (result.success) {
    console.log('User created successfully!', result.userId);
    console.log('Profile:', result.profile);
    // Redirect to dashboard or show success message
  } else {
    console.error('Error creating user:', result.error);
    // Show error message to user
  }
};
```

### Example 2: Create User with Admin Privileges

```typescript
import { createRekindleUser } from './utils/rekindleIntegration';

const result = await createRekindleUser({
  email: 'admin@rekindle.ai',
  password: 'securePassword123',
  full_name: 'Admin User',
  tokens: 100,
  is_admin: true,
});
```

### Example 3: Update Existing User Profile

```typescript
import { updateRekindleUserProfile } from './utils/rekindleIntegration';

// Update user's token balance
const result = await updateRekindleUserProfile(userId, {
  tokens: 50,
});

// Update user's name
const result = await updateRekindleUserProfile(userId, {
  full_name: 'Updated Name',
});
```

### Example 4: Check if User Exists

```typescript
import { rekindleUserExists, getRekindleUserByEmail } from './utils/rekindleIntegration';

// Check if user exists
const exists = await rekindleUserExists('user@example.com');

if (exists) {
  const profile = await getRekindleUserByEmail('user@example.com');
  console.log('User profile:', profile);
}
```

### Example 5: Integration with React Component

```typescript
import { useState } from 'react';
import { createRekindleUser } from '../utils/rekindleIntegration';

function SignupForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    const result = await createRekindleUser({
      email,
      password,
      full_name: fullName,
      tokens: 5,
    });

    if (result.success) {
      // User created successfully
      // Redirect or show success message
      window.location.href = '/dashboard';
    } else {
      setError(result.error || 'Failed to create user');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <input name="fullName" type="text" required />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Sign Up'}
      </button>
    </form>
  );
}
```

## Integration with Existing AuthContext

The existing `AuthContext` already handles Supabase Auth signup. You can use the RekindleUserService as an alternative or complement:

### Option 1: Use RekindleUserService Instead of AuthContext.signUp

```typescript
import { createRekindleUser } from '../utils/rekindleIntegration';

// Instead of using AuthContext.signUp
const result = await createRekindleUser({
  email: 'user@example.com',
  password: 'password123',
  full_name: 'John Doe',
});
```

### Option 2: Use Both (Recommended)

Keep using `AuthContext.signUp` for the UI flow, but also call `createRekindleUser` when you need to ensure profile sync:

```typescript
import { useAuth } from '../contexts/AuthContext';
import { createRekindleUser } from '../utils/rekindleIntegration';

function MyComponent() {
  const { signUp } = useAuth();

  const handleSignup = async (email: string, password: string, fullName: string) => {
    // Option A: Use AuthContext (creates auth user + profile via trigger)
    const { error } = await signUp(email, password, fullName);
    
    // Option B: Use RekindleUserService (more control)
    const result = await createRekindleUser({
      email,
      password,
      full_name: fullName,
    });
  };
}
```

## Database Schema

The `profiles` table structure:

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  full_name text,
  tokens integer DEFAULT 0 NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

## Environment Variables

Ensure your `.env` file has:

```env
VITE_SUPABASE_URL=https://cxjigazdzujttcsyzatz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Error Handling

The service returns a `SyncUserResult` object with:

```typescript
{
  success: boolean;
  userId?: string;
  profile?: Profile;
  error?: string;
  message?: string;
}
```

Always check `result.success` before proceeding:

```typescript
const result = await createRekindleUser(userData);

if (!result.success) {
  // Handle error
  console.error(result.error);
  return;
}

// Use result.userId and result.profile
```

## Common Use Cases

### 1. User Signup Flow
```typescript
// User fills signup form → Create user → Redirect to dashboard
const result = await createRekindleUser({ email, password, full_name });
```

### 2. Admin User Creation
```typescript
// Admin creates user manually → Set is_admin flag
const result = await createRekindleUser({ 
  email, 
  password, 
  full_name, 
  is_admin: true 
});
```

### 3. Token Management
```typescript
// Award tokens to user → Update profile
await updateRekindleUserProfile(userId, { tokens: 10 });
```

### 4. Profile Updates
```typescript
// User updates their name → Update profile
await updateRekindleUserProfile(userId, { full_name: 'New Name' });
```

## Troubleshooting

### Issue: "Password is required to create a new user"
**Solution:** Make sure to provide a `password` field when creating new users.

### Issue: "Failed to create auth user"
**Solution:** Check that:
- Supabase URL and keys are correct in `.env`
- Email is valid and not already in use
- Password meets Supabase requirements (min 6 characters)

### Issue: "Profile already exists"
**Solution:** This is normal if the database trigger already created the profile. The service handles this gracefully.

### Issue: "Missing Supabase environment variables"
**Solution:** Ensure `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Next Steps

1. **Test the Integration:**
   ```typescript
   import { createRekindleUser } from './utils/rekindleIntegration';
   
   // Test with a sample user
   const result = await createRekindleUser({
     email: 'test@example.com',
     password: 'test123456',
     full_name: 'Test User',
   });
   ```

2. **Integrate with Your Signup Form:**
   - Replace or complement your existing signup logic
   - Add error handling and user feedback
   - Redirect to dashboard on success

3. **Monitor User Creation:**
   - Check Supabase dashboard for new users
   - Verify profiles are created correctly
   - Test token balance and admin flags

## Support

For issues or questions:
1. Check Supabase dashboard for errors
2. Review browser console for detailed error messages
3. Verify environment variables are set correctly
4. Check database triggers are working (profile auto-creation)

