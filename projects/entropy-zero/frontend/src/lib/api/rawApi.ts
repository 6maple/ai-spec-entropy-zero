import { apiJson, apiUrl, ApiError } from '@/lib/api/client';
import { getAccessToken } from '@/lib/api/getAccessToken';

export type RawStatus = 'pending' | 'processing' | 'processed' | 'failed';

export type RawListItem = {
  raw_id: string;
  user_id: string;
  file_name: string;
  status: RawStatus;
  created_at: string;
  updated_at: string;
  error_summary: string | null;
  processed_at: string | null;
};

export type RawDetail = {
  raw_id: string;
  file_name: string;
  content: string;
  status: RawStatus;
  created_at: string;
  updated_at: string;
  error_summary: string | null;
  processed_at: string | null;
  notes_count: number;
  flashcards_count: number;
};

export type RawUploadResult = { raw_id: string; status: 'pending'; created_at: string };

const rawApi = {
  list(params: {
    page?: number;
    pageSize?: number;
    status?: RawStatus;
    keyword?: string;
  } = {}): Promise<RawListItem[]> {
    const sp = new URLSearchParams();
    if (params.page) sp.set('page', String(params.page));
    if (params.pageSize) sp.set('page_size', String(params.pageSize));
    if (params.status) sp.set('status', params.status);
    if (params.keyword) sp.set('keyword', params.keyword);
    const q = sp.toString();
    return apiJson<RawListItem[]>(`raw${q ? `?${q}` : ''}`);
  },

  get(rawId: string): Promise<RawDetail> {
    return apiJson<RawDetail>(`raw/${encodeURIComponent(rawId)}`);
  },

  process(rawId: string, body: { force_retry: boolean } = { force_retry: false }) {
    return apiJson<{
      raw_id: string;
      status: 'processing';
      task_id: string;
      message: string;
    }>(`raw/${encodeURIComponent(rawId)}/process`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * XHR 上传以支持 onprogress
   */
  uploadFile(
    file: File,
    onProgress: (p: number) => void,
  ): Promise<RawUploadResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', apiUrl('raw/upload'));
      void (async () => {
        const token = await getAccessToken();
        if (!token) {
          reject(new ApiError(401, '未登录或缺少有效令牌'));
          return;
        }
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(e.loaded / e.total);
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText) as RawUploadResult);
            } catch {
              reject(new ApiError(xhr.status, '响应解析失败'));
            }
            return;
          }
          let detail = `请求失败（${xhr.status}）`;
          try {
            const j = JSON.parse(xhr.responseText) as { detail?: string };
            if (j.detail) detail = j.detail;
          } catch {
            if (xhr.responseText) detail = xhr.responseText;
          }
          reject(new ApiError(xhr.status, detail));
        };
        xhr.onerror = () => reject(new ApiError(0, '网络错误'));
        const fd = new FormData();
        fd.append('file', file);
        xhr.send(fd);
      })();
    });
  },
};

export default rawApi;
