import { getAccessToken } from '@/lib/api/getAccessToken';

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
    if (!token) {
      throw new ApiError(401, '未登录或缺少有效令牌');
    }
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (rest.body && !headers.has('Content-Type') && !(rest.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(apiUrl(path), { ...rest, headers });
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
  if (Array.isArray(j.detail) && j.detail[0] && typeof j.detail[0] === 'object') {
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
  if (!res.ok) {
    const msg = await readJsonError(res);
    throw new ApiError(res.status, msg);
  }
  return (await res.json()) as T;
}
