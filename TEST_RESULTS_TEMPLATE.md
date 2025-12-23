# Signup Test Results Template

## Test Information
- **Date**: _______________
- **Tester**: _______________
- **Test Email**: _______________
- **User ID**: _______________

## Test Steps Executed

### Step 1: Browser Console Test
- [ ] Opened browser console (F12)
- [ ] Pasted test script from `test-signup-browser-console.js`
- [ ] Ran the script
- [ ] Captured console output

### Step 2: Manual Signup Test
- [ ] Opened application signup form
- [ ] Entered test email: _______________
- [ ] Entered password: _______________
- [ ] Entered full name: _______________
- [ ] Clicked "Sign Up" button
- [ ] Checked console for logs

### Step 3: Supabase Verification
- [ ] Navigated to Supabase Dashboard
- [ ] Checked Authentication → Users
- [ ] Found test user: [ ] YES [ ] NO
- [ ] Copied User ID: _______________
- [ ] Checked Table Editor → profiles
- [ ] Found profile row: [ ] YES [ ] NO

## Results

### Console Output
```
Paste console output here:
```


### Supabase Authentication Table
- User exists: [ ] YES [ ] NO
- User ID: _______________
- Email: _______________
- Email Confirmed: [ ] YES [ ] NO

### Supabase Profiles Table
- Profile exists: [ ] YES [ ] NO
- Profile ID (matches User ID): [ ] YES [ ] NO
- Email matches: [ ] YES [ ] NO
- Full Name: _______________
- Tokens: _______________
- Is Admin: [ ] YES [ ] NO

## Issues Found

### Issue 1:
- Description: _______________
- Steps to reproduce: _______________
- Console errors: _______________
- Expected behavior: _______________
- Actual behavior: _______________

## Test Status
- [ ] ✅ PASSED - Account and profile created successfully
- [ ] ❌ FAILED - See issues above

## Notes
_______________
_______________
_______________

