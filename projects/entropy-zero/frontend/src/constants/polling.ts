export const POLL_INTERVAL_MS = 3_000;
export const POLL_MAX_MS = 5 * 60 * 1000;

export function isRawPendingPoll(status: string): boolean {
  return status === 'pending' || status === 'processing';
}

export function isTaskPendingPoll(status: string): boolean {
  return status === 'queued' || status === 'processing';
}
