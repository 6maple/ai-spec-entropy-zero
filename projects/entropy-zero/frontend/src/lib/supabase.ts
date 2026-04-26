import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const noopAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: (_event: any, _session: any) => ({
    data: { subscription: { unsubscribe: () => undefined } },
  }),
  signOut: async () => ({ error: null }),
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Using local fallback auth stub for development.',
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : ({ auth: noopAuth } as any);
