// src/contexts/AuthContext.tsx

import {
  createContext,
  useContext,
  useEffect,
  useState,
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

  // Load profile from database
  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist, try to create it
        if (error.code === 'PGRST116') {
          // Profile not found - create it
          const { data: userData } = await supabase.auth.getUser();
          
          if (userData?.user) {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email: userData.user.email || '',
                full_name: userData.user.user_metadata?.full_name || null,
                tokens: 0,
              })
              .select()
              .single();

            if (createError) {
              console.error('Error creating profile:', createError);
              setProfile(null);
              return;
            }

            setProfile(newProfile as Profile);
            return;
          }
        }
        
        console.error('Error loading profile:', error);
        setProfile(null);
        return;
      }

      console.log('Profile loaded:', { 
        id: data.id, 
        email: data.email, 
        is_admin: data.is_admin,
        tokens: data.tokens 
      });
      setProfile(data as Profile);
    } catch (err) {
      console.error('Error loading profile:', err);
      setProfile(null);
    }
  };

  // Refresh profile function
  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  // Load initial session
  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setUser(session?.user ?? null);
      
      // Load profile if user exists
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    };

    loadSession();

    // Listen for authentication changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
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
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
      // State will be cleared by onAuthStateChange listener
      setProfile(null);
      setUser(null);
      setSession(null);
    } catch (err) {
      console.error('Error signing out:', err);
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
