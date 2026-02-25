// src/contexts/AuthContext.tsx

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../lib/supabase";
import { getTokenCost } from "../services/tokenService";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Link anonymous messages to the given user; optional charge for existing users (sign-in). */
  linkAnonymousMessages: (userId: string, options?: { chargeForLinkedMessages?: boolean }) => Promise<any[] | undefined>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialClearDoneRef = useRef(false);

  // Load profile from database
  const loadProfile = async (userId: string) => {
    try {
      // Wait a moment for trigger to complete (if just signed up)
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading profile:', error);

        // If profile doesn't exist after 500ms, wait and retry once
        if (error.code === 'PGRST116') {
          console.log('Profile not found, retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));

          const { data: retryData, error: retryError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (retryError) {
            // Fallback: create profile for returning users whose profile row is missing
            console.log('Profile missing after retry, attempting to create...');
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser?.id === userId) {
              const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: userId,
                  email: authUser.email ?? '',
                  full_name: authUser.user_metadata?.full_name ?? '',
                  tokens: 3,
                })
                .select()
                .single();
              if (!insertError) {
                const { data: newProfile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', userId)
                  .single();
                if (newProfile) {
                  console.log('Profile created for returning user:', userId);
                  setProfile(newProfile as Profile);
                  return;
                }
              }
            }
            setProfile(null);
            return;
          }

          console.log('Profile loaded after retry:', { 
            id: retryData.id, 
            email: retryData.email, 
            is_admin: retryData.is_admin,
            tokens: retryData.tokens 
          });
          setProfile(retryData as Profile);
          return;
        }

        setProfile(null);
        return;
      }

      console.log('Profile loaded successfully:', { 
        id: data.id, 
        email: data.email, 
        is_admin: data.is_admin,
        tokens: data.tokens 
      });
      setProfile(data as Profile);
    } catch (err) {
      console.error('Exception loading profile:', err);
      setProfile(null);
    }
  };

  // Refresh profile function
  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  // Link anonymous messages (stored with anonymous_session_id in input_data) to the given user
  const linkAnonymousMessages = async (
    newUserId: string,
    options?: { chargeForLinkedMessages?: boolean }
  ) => {
    const anonymousSessionId = typeof localStorage !== 'undefined' ? localStorage.getItem('anonymous_session_id') : null;

    console.log('🔗 LINKING DEBUG:', {
      newUserId,
      anonymousSessionId,
      hasSession: !!anonymousSessionId,
      chargeForLinkedMessages: options?.chargeForLinkedMessages,
    });

    if (!anonymousSessionId) {
      console.log('ℹ️ No anonymous session to link');
      return;
    }

    try {
      // Check what messages exist to link (unclaimed, with matching session)
      const { data: candidates, error: checkError } = await supabase
        .from('generated_messages')
        .select('id, user_id, is_preview, input_data')
        .is('user_id', null)
        .contains('input_data', { anonymous_session_id: anonymousSessionId });

      console.log('📋 Candidate messages to link:', {
        count: candidates?.length || 0,
        messages: candidates,
        checkError: checkError ?? null,
      });

      const { data: linked, error } = await supabase
        .from('generated_messages')
        .update({
          user_id: newUserId,
          is_preview: false,
        })
        .is('user_id', null)
        .contains('input_data', { anonymous_session_id: anonymousSessionId })
        .select('id, message_type');

      console.log('✅ LINKING RESULT:', {
        linkedCount: linked?.length || 0,
        linked,
        error: error ?? null,
      });

      if (error) {
        console.error('❌ Linking error:', error);
        return;
      }

      if (linked && linked.length > 0) {
        console.log(`✅ Successfully linked ${linked.length} messages`);
        try {
          localStorage.removeItem('anonymous_session_id');
        } catch {
          // ignore
        }

        // Charge existing user for linked messages when requested (sign-in path)
        if (options?.chargeForLinkedMessages && linked.length > 0) {
          const totalCost = linked.reduce(
            (sum, row) => sum + getTokenCost(row.message_type ?? 'poem'),
            0
          );
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('tokens')
            .eq('id', newUserId)
            .single();

          if (profileError || profile == null) {
            console.warn('⚠️ Could not fetch profile for token deduction:', profileError);
            return linked;
          }

          const currentTokens = profile.tokens ?? 0;
          if (currentTokens >= totalCost) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ tokens: currentTokens - totalCost })
              .eq('id', newUserId);

            if (updateError) {
              console.error('❌ Failed to deduct tokens for linked messages:', updateError);
              return linked;
            }

            for (const row of linked) {
              const cost = getTokenCost(row.message_type ?? 'poem');
              const { error: txError } = await supabase.from('token_transactions').insert({
                user_id: newUserId,
                transaction_type: 'usage',
                amount: -cost,
                description: `Generated ${row.message_type ?? 'message'}`,
              });
              if (txError) {
                console.warn('Token transaction log failed for linked message:', txError.message);
              }
            }
            console.log(`✅ Deducted ${totalCost} tokens for ${linked.length} linked message(s)`);
          } else {
            console.warn(
              `⚠️ Insufficient tokens (have ${currentTokens}, need ${totalCost}); linked messages not charged.`
            );
          }
        }
      } else {
        console.warn('⚠️ No messages were linked');
      }

      return linked;
    } catch (err) {
      console.error('❌ Exception in linkAnonymousMessages:', err);
    }
  };

  // Initialize auth state: run initial session + profile load first, then subscribe to auth changes
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const initializeAuth = async () => {
      try {
        const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          initialClearDoneRef.current = true;
          return;
        }

        if (existingSession?.user) {
          console.log('✅ Existing session found on app start:', existingSession.user.id);
          setSession(existingSession);
          setUser(existingSession.user);
          // Load profile and wait for it before marking loading done (avoids race with listener)
          await loadProfile(existingSession.user.id);
        } else {
          console.log('No existing session found');
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
        initialClearDoneRef.current = true;
      }
    };

    // Run initial auth first so we have one source of truth; then subscribe for sign in/out/refresh
    (async () => {
      await initializeAuth();
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (_event: AuthChangeEvent, session: Session | null) => {
          // Skip if this is the same state we just set in initializeAuth (avoids duplicate loadProfile)
          if (initialClearDoneRef.current) {
            console.log('Auth state changed:', { event: _event, hasSession: !!session });
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
              await loadProfile(session.user.id);
            } else {
              setProfile(null);
            }
          }
        }
      );
      subscription = sub;
    })();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // -------- AUTH METHODS --------

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔄 Attempting to sign in:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        return { error: error.message };
      }

      if (!data.session) {
        console.error('❌ No session returned from sign in');
        return { error: 'Sign in failed: No session created' };
      }

      console.log('✅ Sign in successful:', data.user.id);

      // Link any anonymous messages and charge existing user for them
      await linkAnonymousMessages(data.user.id, { chargeForLinkedMessages: true });
      
      // Wait a moment for auth state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Load profile
      if (data.user) {
        await loadProfile(data.user.id);
      }
      
      return { error: null };
    } catch (err) {
      console.error('❌ Sign in exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in';
      return { error: errorMessage };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log('🔄 Starting signup process for:', email);

      const anonymousSessionId = typeof localStorage !== 'undefined' ? localStorage.getItem('anonymous_session_id') : null;

      // Step 1: Create the user account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            anonymous_session_id: anonymousSessionId ?? undefined,
          },
        },
      });
      
      if (error) {
        console.error('❌ Signup error:', error);
        return { error: error.message };
      }

      // Step 2: Check if user was created
      if (!data.user) {
        console.error('❌ No user data returned from signup');
        return { error: 'Failed to create user account' };
      }

      const userId = data.user.id;
      console.log('✅ User created:', userId);

      // Link any anonymous messages to the new user (no charge for new sign-up)
      await linkAnonymousMessages(userId);

      // Step 3: Ensure we have a session (sign in if needed)
      let hasSession = !!data.session;
      
      if (!data.session) {
        console.log('⏳ No session after signup, automatically signing in...');
        
        // Wait a moment for the user to be fully created in the system
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Automatically sign in with the credentials to establish a session
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error('❌ Auto sign-in after signup failed:', signInError);
          // Still return success since account was created
          // User can manually sign in later
          console.log('✅ Account created, user can sign in manually');
          return { error: null };
        }

        hasSession = !!signInData?.session;
        console.log('✅ Successfully signed in after signup');
      }

      // Step 4: Wait for database trigger to create profile, then verify it exists
      // Only check if we have a session (needed for RLS)
      if (hasSession) {
        console.log('⏳ Waiting for profile creation (trigger)...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for trigger

        try {
          // Verify profile exists
          const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (profileError || !existingProfile) {
            console.error('❌ Profile not created by trigger');
            // Return error - the signup component will handle showing the alert
            return { error: 'Account created but profile setup failed. Please try logging in or contact support.' };
          }

          console.log('✅ Profile confirmed (created by trigger):', existingProfile.id);
        } catch (profileCheckError) {
          console.error('❌ Error checking profile:', profileCheckError);
          return { error: 'Account created but profile verification failed. Please try logging in.' };
        }
      }

      // Step 5: Profile will be loaded by onAuthStateChange listener
      console.log('✅ Signup complete');

      // Reload to show linked messages
      window.location.reload();

      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      console.error('❌ Signup error:', err);
      return { error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      // Clear state immediately for better UX
      setProfile(null);
      setUser(null);
      setSession(null);
      setLoading(false);

      // Clear any cached data in localStorage/sessionStorage
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('supabase')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();
      } catch (storageError) {
        console.warn('Error clearing storage:', storageError);
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out from Supabase:', error);
      }

      console.log('User signed out successfully');
      // State will also be cleared by onAuthStateChange listener as a backup
    } catch (err) {
      console.error('Error signing out:', err);
      // Even if there's an error, clear local state
      setProfile(null);
      setUser(null);
      setSession(null);
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    linkAnonymousMessages,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
