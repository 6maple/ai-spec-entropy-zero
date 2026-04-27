import { supabase } from '@/lib/supabase';

/**
 * 与 CLAUDE.md 一致：开发环境可用 VITE_DEV_ACCESS_TOKEN 对应后端 DEV_JWT_SECRET。
 */
export async function getAccessToken(): Promise<string | null> {
  const dev = import.meta.env.VITE_DEV_ACCESS_TOKEN as string | undefined;
  if (dev && import.meta.env.DEV) return dev;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function isApiEnabled(): boolean {
  const d = (import.meta.env.VITE_API_DISABLED as string | undefined) ?? '';
  return d !== 'true' && d !== '1';
}
