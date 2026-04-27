import { apiJson } from '@/lib/api/client';
import type { Flashcard } from '@/types';

export type ReviewSubmitResult = {
  log: {
    log_id: number;
    card_id: string;
    user_id: string;
    rating: number;
    elapsed_days: number;
    scheduled_days: number;
    review_at: string;
  };
  card: Flashcard;
};

const cardsApi = {
  listDue(params: { scope?: 'global' | 'note'; noteId?: string } = {}): Promise<Flashcard[]> {
    const q = new URLSearchParams();
    q.set('scope', params.scope ?? 'global');
    if (params.noteId) {
      q.set('note_id', params.noteId);
    }
    return apiJson<Flashcard[]>(`cards/due?${q.toString()}`);
  },

  submitReview(
    cardId: string,
    body: { rating: 1 | 2 | 3 | 4; reviewed_at?: string },
  ): Promise<ReviewSubmitResult> {
    return apiJson<ReviewSubmitResult>(`cards/${cardId}/review`, {
      method: 'POST',
      body: JSON.stringify({
        rating: body.rating,
        reviewed_at: body.reviewed_at,
      }),
    });
  },
};

export default cardsApi;
