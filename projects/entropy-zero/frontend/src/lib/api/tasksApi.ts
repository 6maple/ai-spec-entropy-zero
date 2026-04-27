import { apiJson } from '@/lib/api/client';

export type TaskStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type TaskListItem = {
  task_id: string;
  raw_id: string;
  task_type: string;
  status: TaskStatus;
  current_step: string | null;
  progress_percent: number;
  error_msg: string | null;
  result_summary: string | null;
  created_at: string;
};

export type TaskDetail = {
  task_id: string;
  raw_id: string;
  current_step: string | null;
  progress_percent: number;
  status: TaskStatus;
  error_msg: string | null;
  note_id: string | null;
  flashcard_count: number | null;
};

const tasksApi = {
  list(params: {
    page?: number;
    pageSize?: number;
    status?: TaskStatus;
    rawId?: string;
  } = {}): Promise<TaskListItem[]> {
    const sp = new URLSearchParams();
    if (params.page) sp.set('page', String(params.page));
    if (params.pageSize) sp.set('page_size', String(params.pageSize));
    if (params.status) sp.set('status', params.status);
    if (params.rawId) sp.set('raw_id', params.rawId);
    const q = sp.toString();
    return apiJson<TaskListItem[]>(`tasks${q ? `?${q}` : ''}`);
  },

  get(taskId: string): Promise<TaskDetail> {
    return apiJson<TaskDetail>(`tasks/${encodeURIComponent(taskId)}`);
  },
};

export default tasksApi;
