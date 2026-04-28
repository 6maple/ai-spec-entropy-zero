// Database types matching the schema in requirements

export interface RawKnowledge {
  raw_id: string;
  user_id: string;
  file_name: string;
  content: string;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  created_at: string;
  updated_at: string;
}

/** 与 raw_knowledge.meta_tag_json 对齐的文档级语义标签 */
export interface DocMetaTag {
  domain: string;
  topics: string[];
}

export interface Note {
  note_id: string;
  user_id: string;
  raw_id: string;
  title: string;
  abstract: string;
  tags: string[];
  content_json: Point[];
  created_at: string;
  flashcards_count?: number;
  /** 来自关联原始知识的 meta_tag_json */
  meta_tag?: DocMetaTag | null;
}

export interface Point {
  p_id: string;
  title: string;
  body: string; // Markdown content
}

export interface Flashcard {
  card_id: string;
  user_id: string;
  note_id: string;
  point_id: string;
  question: string;
  answer: string;
  fsrs_state: FSRSState;
  next_review: string;
  last_review: string | null;
  created_at: string;
}

export interface FSRSState {
  stability: number;
  difficulty: number;
  reps: number;
}

export interface ReviewLog {
  log_id: number;
  card_id: string;
  user_id: string;
  rating: 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
  elapsed_days: number;
  scheduled_days: number;
  review_at: string;
}

// UI-specific types
export type ReviewRating = 1 | 2 | 3 | 4;

export interface ReviewSession {
  cards: Flashcard[];
  currentIndex: number;
  completedCount: number;
}
