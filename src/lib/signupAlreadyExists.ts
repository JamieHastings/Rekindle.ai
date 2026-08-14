import type { Session, User } from '@supabase/supabase-js';

export const EXISTING_ACCOUNT_MESSAGE =
  'An account with this email already exists. Try signing in or resetting your password.';

const UNCONFIRMED_RETRY_MS = 15_000;

/**
 * GoTrue returns identities: [] for confirmed existing emails (enumeration protection).
 * Unconfirmed re-signup returns the same auth.users row with identities still present
 * and no session — detect that via created_at rather than treating it as a new signup.
 */
export function signupIndicatesExistingAccount(
  user: User | null | undefined,
  session: Session | null | undefined
): boolean {
  if (!user) return false;
  if (user.identities && user.identities.length === 0) return true;
  if (session) return false;
  const createdAt = user.created_at ? Date.parse(user.created_at) : NaN;
  if (!Number.isFinite(createdAt)) return false;
  return Date.now() - createdAt > UNCONFIRMED_RETRY_MS;
}
