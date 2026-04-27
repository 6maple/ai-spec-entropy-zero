-- Phase 1 backend ingest: raw_knowledge extensions + processing_tasks
-- Apply after 001_init.sql (PostgreSQL / Supabase).

ALTER TABLE raw_knowledge
    ADD COLUMN IF NOT EXISTS error_summary TEXT,
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_raw_knowledge_user_status_created
    ON raw_knowledge (user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS processing_tasks (
    task_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    raw_id UUID NOT NULL REFERENCES raw_knowledge(raw_id) ON DELETE CASCADE,
    task_type VARCHAR(64) NOT NULL DEFAULT 'entropy_deconstruction',
    status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    current_step VARCHAR(64),
    progress_percent INTEGER NOT NULL DEFAULT 0,
    error_msg TEXT,
    note_id UUID,
    flashcard_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_tasks_user_created ON processing_tasks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processing_tasks_raw_id ON processing_tasks (raw_id);
CREATE INDEX IF NOT EXISTS idx_processing_tasks_status ON processing_tasks (status);

ALTER TABLE processing_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own processing tasks"
    ON processing_tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processing tasks"
    ON processing_tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processing tasks"
    ON processing_tasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE TRIGGER update_processing_tasks_updated_at
    BEFORE UPDATE ON processing_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
