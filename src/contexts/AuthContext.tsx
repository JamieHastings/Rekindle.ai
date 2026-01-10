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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
            console.error('Profile still missing after retry. This is a trigger issue.');
            // Don't show alert here - it would be too aggressive
            // The signup flow will handle user-facing errors
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

  // Initialize auth state - require explicit login (no auto-login)
  useEffect(() => {
    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        // Only process auth changes after initial clear is done
        // This prevents clearing newly created sessions from signup
        if (!initialClearDoneRef.current) {
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        // Load profile if user exists
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Clear any existing session on app start to prevent auto-login
    // This ensures users must explicitly sign in when the app starts
    const clearAutoLogin = async () => {
      // Check if there's an existing session first (from before app start)
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      // Only clear if there's an existing session (from before app start)
      if (existingSession) {
        console.log('Clearing existing session on app start to prevent auto-login');
        await supabase.auth.signOut();
      }
      
      // Clear state immediately
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      
      // Mark initial clear as done so new signups/signins work
      initialClearDoneRef.current = true;
    };

    // Clear existing session
    clearAutoLogin();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // -------- AUTH METHODS --------

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log('🔄 Starting signup process for:', email);
      
      // Step 1: Create the user account
      const { data, error } = await supabase.auth.signUp({ email, password });
      
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
