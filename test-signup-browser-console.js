/**
 * Signup Test Script for Browser Console
 * 
 * Instructions:
 * 1. Open your rekindle.ai application in browser
 * 2. Open Developer Console (F12)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to run
 * 5. Check the results below
 */

(async function testSignup() {
  console.log('🧪 Starting Signup Test...\n');
  
  // Generate unique test email
  const timestamp = Date.now();
  const testEmail = `test-${timestamp}@test-rekindle.ai`;
  const testPassword = 'TestPassword123!';
  const testFullName = 'Test User';
  
  console.log('📧 Test Email:', testEmail);
  console.log('🔑 Test Password:', testPassword);
  console.log('👤 Test Name:', testFullName);
  console.log('\n---\n');
  
  try {
    // Step 1: Import Supabase client (adjust if needed)
    // This assumes supabase is available globally or you need to import it
    let supabase;
    
    if (typeof window.supabase !== 'undefined') {
      supabase = window.supabase;
    } else if (typeof window.supabaseClient !== 'undefined') {
      supabase = window.supabaseClient;
    } else {
      // Try to get it from the app context
      console.error('❌ Could not find Supabase client in window object');
      console.log('💡 Make sure you are on a page where Supabase is loaded');
      return;
    }
    
    console.log('✅ Supabase client found\n');
    
    // Step 2: Create user account
    console.log('🔄 Step 1: Creating user account...');
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: testFullName,
        },
      },
    });
    
    if (signupError) {
      console.error('❌ Signup Error:', signupError.message);
      return;
    }
    
    if (!signupData.user) {
      console.error('❌ No user data returned from signup');
      return;
    }
    
    const userId = signupData.user.id;
    console.log('✅ User created successfully!');
    console.log('   User ID:', userId);
    console.log('   Email:', signupData.user.email);
    console.log('');
    
    // Step 3: Handle session if needed
    if (!signupData.session) {
      console.log('⏳ No session after signup, attempting auto sign-in...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
      
      if (signInError) {
        console.error('❌ Auto sign-in failed:', signInError.message);
        console.log('⚠️  User account created but needs manual sign-in');
      } else {
        console.log('✅ Auto sign-in successful');
      }
    } else {
      console.log('✅ Session created during signup');
    }
    
    console.log('');
    
    // Step 4: Wait for profile creation
    console.log('⏳ Step 2: Waiting for profile creation (checking every 500ms)...');
    let profileFound = false;
    let attempts = 0;
    const maxAttempts = 10; // 5 seconds total
    
    while (!profileFound && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profile && !profileError) {
        profileFound = true;
        console.log(`✅ Profile found after ${attempts * 500}ms`);
        console.log('');
        console.log('📊 Profile Data:');
        console.log('   ID:', profile.id);
        console.log('   Email:', profile.email);
        console.log('   Full Name:', profile.full_name);
        console.log('   Tokens:', profile.tokens);
        console.log('   Is Admin:', profile.is_admin);
        console.log('');
        break;
      }
    }
    
    if (!profileFound) {
      console.error('❌ Profile not found after', maxAttempts * 500, 'ms');
      console.log('');
      console.log('⚠️  Attempting to create profile manually...');
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: testEmail,
          full_name: testFullName,
          tokens: 5,
        })
        .select()
        .single();
      
      if (createError) {
        if (createError.code === '23505') {
          console.log('✅ Profile already exists (race condition)');
          // Try to fetch it again
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (existingProfile) {
            console.log('📊 Profile Data:', existingProfile);
            profileFound = true;
          }
        } else {
          console.error('❌ Failed to create profile:', createError.message);
          console.error('   Error Code:', createError.code);
          console.error('   Error Details:', createError);
        }
      } else {
        console.log('✅ Profile created manually');
        console.log('📊 Profile Data:', newProfile);
        profileFound = true;
      }
    }
    
    console.log('\n---\n');
    console.log('📋 TEST SUMMARY');
    console.log('---');
    console.log('Email:', testEmail);
    console.log('User ID:', userId);
    console.log('Profile Created:', profileFound ? '✅ YES' : '❌ NO');
    
    if (profileFound) {
      console.log('');
      console.log('✅ TEST PASSED - Account and profile created successfully!');
      console.log('');
      console.log('🔍 Next Steps:');
      console.log('1. Go to Supabase Dashboard → Table Editor → profiles');
      console.log('2. Search for User ID:', userId);
      console.log('3. Verify the profile row exists with correct data');
    } else {
      console.log('');
      console.log('❌ TEST FAILED - Profile not created');
      console.log('');
      console.log('🔍 Troubleshooting:');
      console.log('1. Check Supabase Dashboard → Authentication → Users');
      console.log('2. Look for the email:', testEmail);
      console.log('3. Check if database trigger exists');
      console.log('4. Check RLS policies on profiles table');
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error);
    console.error('Stack:', error.stack);
  }
})();

