import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/** 同时具备 URL 与 anon key 才可使用 Supabase Auth。 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

async function noopSession() {
  return { data: { session: null }, error: null };
}

async function noopReject() {
  return {
    data: { user: null, session: null },
    error: Object.assign(new Error('Supabase 未配置'), { name: 'NotConfiguredError' }),
  };
}

const noopAuth = {
  getSession: noopSession,
  signInWithPassword: noopReject,
  signUp: noopReject,
  onAuthStateChange: (_event: unknown, _session: unknown) => ({
    data: { subscription: { unsubscribe: () => undefined } },
  }),
  signOut: async () => ({ error: null }),
};

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase credentials not found. Using local fallback auth stub for development.',
  );
}

/** 未配置时 auth.signUp/signIn 会被拒绝（登录页禁用提交时需配合说明文案）。 */
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({ auth: noopAuth } as unknown as SupabaseClient);
