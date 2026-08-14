/**
 * End-to-end check for signup enumeration protection.
 * Usage: node --env-file=.env scripts/test-double-signup.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, anonKey);
const email = `bonus-test-${Date.now()}@example.com`;
const password = 'TestPass123!';

function indicatesExistingAccount(user, session) {
  if (!user) return false;
  if (user.identities && user.identities.length === 0) return true;
  if (session) return false;
  const createdAt = user.created_at ? Date.parse(user.created_at) : NaN;
  if (!Number.isFinite(createdAt)) return false;
  return Date.now() - createdAt > 15_000;
}

async function signUpOnce() {
  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${new URL(url).origin}/auth/confirm` },
  });
}

console.log('1) Fresh signup:', email);
const first = await signUpOnce();

if (first.error) {
  console.error('FAIL first signup:', first.error.message);
  process.exit(1);
}

const firstIdentities = first.data.user?.identities?.length ?? null;
console.log('   user id:', first.data.user?.id);
console.log('   created_at:', first.data.user?.created_at);
console.log('   identities.length:', firstIdentities);
console.log('   session:', first.data.session ? 'present' : 'null (email confirm likely required)');

if (indicatesExistingAccount(first.data.user, first.data.session)) {
  console.error('FAIL: fresh signup looked like an existing account');
  process.exit(1);
}

if (first.data.user?.id) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tokens, signup_bonus_awarded')
    .eq('id', first.data.user.id)
    .maybeSingle();

  if (profileError) {
    console.log('   profile read:', profileError.message, '(anon RLS may block unconfirmed users)');
  } else if (!profile) {
    console.log('   profile: not visible yet (trigger may still have created it server-side)');
  } else {
    console.log('   tokens:', profile.tokens, 'signup_bonus_awarded:', profile.signup_bonus_awarded);
  }
}

console.log('2) Second signup with same email');
let second = await signUpOnce();

if (second.error?.message?.includes('you can only request this after')) {
  const waitMatch = second.error.message.match(/after (\d+) seconds?/i);
  const waitSec = Math.max(Number(waitMatch?.[1] || 60) + 2, 5);
  console.log(`   rate limited; waiting ${waitSec}s then retrying`);
  await new Promise((r) => setTimeout(r, waitSec * 1000));
  second = await signUpOnce();
}

if (second.error) {
  console.log('   supabase error (also acceptable):', second.error.message);
} else {
  const secondIdentities = second.data.user?.identities?.length ?? null;
  console.log('   user id:', second.data.user?.id);
  console.log('   created_at:', second.data.user?.created_at);
  console.log('   identities.length:', secondIdentities);
  console.log('   same auth row:', second.data.user?.id === first.data.user?.id);

  if (indicatesExistingAccount(second.data.user, second.data.session)) {
    console.log('PASS: UI already-exists path (identities empty or unconfirmed retry)');
  } else {
    console.error('FAIL: second signup did not look like an existing account');
    process.exit(1);
  }

  if (second.data.user?.id !== first.data.user?.id) {
    console.error('FAIL: second signup created a different auth.users row');
    process.exit(1);
  }
}

console.log('Done. Apply migration in SQL editor if award_signup_bonus RPC tests are still pending.');
