-- Phase 2: flashcards fields for AI Agent outputs
ALTER TABLE flashcards
    ADD COLUMN IF NOT EXISTS card_type VARCHAR(20) NOT NULL DEFAULT 'qa',
    ADD COLUMN IF NOT EXISTS explanation TEXT,
    ADD COLUMN IF NOT EXISTS claim_ref VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_flashcards_claim_ref ON flashcards(claim_ref);
