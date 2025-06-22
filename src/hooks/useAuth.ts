import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session with proper error handling
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Clear any stale session data
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // Clear any stale session data
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        // Clear profile cache when signing out
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: null }));
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      
      setLoading(false);

      // Handle user sign up - ensure profile is created
      if (event === 'SIGNED_UP' && session?.user) {
        await ensureProfileExists(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const ensureProfileExists = async (user: User) => {
    try {
      // Check if profile exists
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
        }

        // Also create user progress
        const { error: progressError } = await supabase
          .from('user_progress')
          .insert({
            user_id: user.id,
          });

        if (progressError && progressError.code !== '23505') { // Ignore unique violation
          console.error('Error creating user progress:', progressError);
        }
      }
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      // If user is immediately confirmed, ensure profile exists
      if (data.user && !data.user.email_confirmed_at) {
        // User needs to confirm email
        return data;
      }

      return data;
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Ensure profile exists after sign in
      if (data.user) {
        await ensureProfileExists(data.user);
      }

      return data;
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };
}