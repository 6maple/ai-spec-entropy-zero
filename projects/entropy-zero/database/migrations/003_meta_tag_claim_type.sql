-- Claim-type driven agent + 文档级 MetaTag
-- Apply after 002_*.sql

ALTER TABLE raw_knowledge
    ADD COLUMN IF NOT EXISTS meta_tag_json TEXT;

ALTER TABLE notes
    ADD COLUMN IF NOT EXISTS claim_type VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_notes_claim_type ON notes (claim_type);
CREATE INDEX IF NOT EXISTS idx_notes_user_claim_type ON notes (user_id, claim_type);
