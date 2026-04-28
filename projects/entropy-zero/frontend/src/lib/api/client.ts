import { getAccessToken } from '@/lib/api/getAccessToken';
import { navigateToLoginForUnauthorized } from '@/lib/api/authRedirect';

import { supabase } from '@/lib/supabase';

const base = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

export function apiUrl(path: string): string {
  const p = path.replace(/^\//, '');
  return `${base}/${p}`;
}

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<Response> {
  const { auth = true, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (auth) {
    const token = await getAccessToken();
    // 非敏感调试：记录是否获取到 token（长度），便于排查 401 问题
    try {
      console.debug(
        '[apiFetch] hasToken=',
        !!token,
        'tokenLen=',
        token ? token.length : 0,
      );
    } catch (e) {
      /* ignore */
    }
    if (!token) {
      throw new ApiError(401, '未登录或缺少有效令牌');
    }
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (
    rest.body &&
    !headers.has('Content-Type') &&
    !(rest.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(apiUrl(path), { ...rest, headers });

  /** 避免「后端 401（多为 JWT 密钥不匹配）」触发跳转登录 → RequireGuest 拉回首页」的死循环闪烁。 */
  if (auth && res.status === 401) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      navigateToLoginForUnauthorized();
    }
  }

  return res;
}

export async function readJsonError(res: Response): Promise<string> {
  const t = await res.text();
  if (!t) return `请求失败（${res.status}）`;
  let j: { detail?: string | { msg?: string }[] };
  try {
    j = JSON.parse(t) as { detail?: string | { msg?: string }[] };
  } catch {
    return `请求失败（${res.status}）`;
  }
  if (typeof j.detail === 'string') return j.detail;
  if (
    Array.isArray(j.detail) &&
    j.detail[0] &&
    typeof j.detail[0] === 'object'
  ) {
    const o = j.detail[0] as { msg?: string };
    if (o.msg) return o.msg;
  }
  return `请求失败（${res.status}）`;
}

export async function apiJson<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const res = await apiFetch(path, init);
  const auth = init.auth !== false;
  if (!res.ok) {
    let msg = await readJsonError(res);
    if (res.status === 401 && auth) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        msg +=
          '（当前仍有 Supabase 会话：多为后端 SUPABASE_JWT_SECRET 与控制台 JWT Secret 不一致）';
      }
    }
    throw new ApiError(res.status, msg);
  }
  return (await res.json()) as T;
}
