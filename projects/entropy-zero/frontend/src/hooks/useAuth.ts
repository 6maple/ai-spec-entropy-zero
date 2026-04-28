import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then((res: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
      if (!mounted) return;
      setUser(res.data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
      setAuthError(null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);
    await supabase.auth.signOut();
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      setAuthError('MISSING_SUPABASE');
      return false;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      return false;
    }
    return true;
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      setAuthError('MISSING_SUPABASE');
      return false;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthError(error.message);
      return false;
    }
    return true;
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return {
    user,
    loading,
    signOut,
    signIn,
    signUp,
    authError,
    clearAuthError,
    isSupabaseConfigured,
  };
}
