import { supabase } from '@/lib/supabase';

/**
 * 优先返回 Supabase 会话令牌；仅在开发模式下无会话时退回 VITE_DEV_ACCESS_TOKEN，
 * 与后端 SUPABASE_JWT_SECRET / DEV_JWT_SECRET 对应。
 */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const sid = data.session?.access_token ?? null;
  if (sid) return sid;

  const raw = import.meta.env.VITE_DEV_ACCESS_TOKEN as string | undefined;
  const dev = raw?.trim();
  if (dev && import.meta.env.DEV) return dev;

  return null;
}

export function isApiEnabled(): boolean {
  const d = (import.meta.env.VITE_API_DISABLED as string | undefined) ?? '';
  return d !== 'true' && d !== '1';
}
