// Script to verify Supabase setup
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifySetup() {
  console.log('🔍 Verifying Supabase setup...\n');

  // Check 1: Connection
  console.log('1. Testing connection...');
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.error('   ❌ Connection failed:', error.message);
      return false;
    }
    console.log('   ✅ Connected to Supabase\n');
  } catch (err) {
    console.error('   ❌ Connection error:', err.message);
    return false;
  }

  // Check 2: Required tables
  console.log('2. Checking required tables...');
  const tables = [
    'profiles',
    'generated_messages',
    'token_transactions',
    'email_logs',
    'stripe_payments',
    'n8n_webhook_logs',
    'message_templates',
    'admin_actions'
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error) {
        console.error(`   ❌ Table "${table}" missing or not accessible:`, error.message);
        return false;
      }
      console.log(`   ✅ Table "${table}" exists`);
    } catch (err) {
      console.error(`   ❌ Error checking table "${table}":`, err.message);
      return false;
    }
  }
  console.log('');

  // Check 3: Edge Functions (check if they respond)
  console.log('3. Checking Edge Functions...');
  const functions = [
    'generate-preview',
    'unlock-preview',
    'generate-message'
  ];

  for (const func of functions) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/${func}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({})
      });
      
      // 400/401/422 are OK (function exists, just wrong request)
      // 404 means function doesn't exist
      if (response.status === 404) {
        console.error(`   ❌ Function "${func}" not deployed (404)`);
        return false;
      }
      console.log(`   ✅ Function "${func}" is deployed`);
    } catch (err) {
      console.error(`   ❌ Error checking function "${func}":`, err.message);
      return false;
    }
  }
  console.log('');

  console.log('✅ All checks passed! Your Supabase setup is complete.\n');
  return true;
}

verifySetup().then(success => {
  process.exit(success ? 0 : 1);
});
