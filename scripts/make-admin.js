// Script to make a user an admin
// Run with: node scripts/make-admin.js

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function makeAdmin(email) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_admin: true })
      .eq('email', email)
      .select();

    if (error) {
      console.error('Error updating profile:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log(`✅ Successfully made ${email} an admin!`);
      console.log('Updated profile:', data[0]);
    } else {
      console.log(`❌ No user found with email: ${email}`);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

const email = 'hastings.jamie05@gmail.com';
makeAdmin(email);
