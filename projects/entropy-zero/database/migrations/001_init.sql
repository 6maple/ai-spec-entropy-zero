-- Entropy Zero - Database Initialization Script
-- Phase 1: Core Tables + RLS Policies
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table: raw_knowledge
-- =====================================================
CREATE TABLE IF NOT EXISTS raw_knowledge (
    raw_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_raw_knowledge_user_id ON raw_knowledge(user_id);
CREATE INDEX idx_raw_knowledge_status ON raw_knowledge(status);
CREATE INDEX idx_raw_knowledge_user_created ON raw_knowledge(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE raw_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own raw knowledge"
    ON raw_knowledge FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own raw knowledge"
    ON raw_knowledge FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own raw knowledge"
    ON raw_knowledge FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own raw knowledge"
    ON raw_knowledge FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- Table: notes
-- =====================================================
CREATE TABLE IF NOT EXISTS notes (
    note_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    raw_id UUID REFERENCES raw_knowledge(raw_id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    abstract TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    content_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_raw_id ON notes(raw_id);
CREATE INDEX idx_notes_user_created ON notes(user_id, created_at DESC);
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);  -- For fast tag queries

-- RLS Policies
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes"
    ON notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
    ON notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
    ON notes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
    ON notes FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- Table: flashcards
-- =====================================================
CREATE TABLE IF NOT EXISTS flashcards (
    card_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(note_id) ON DELETE CASCADE,
    point_id VARCHAR(100) NOT NULL,  -- Logical reference to content_json[].p_id
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    fsrs_state JSONB NOT NULL DEFAULT '{"stability": 0.0, "difficulty": 0.0, "reps": 0}'::jsonb,
    next_review TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_review TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX idx_flashcards_note_id ON flashcards(note_id);
CREATE INDEX idx_flashcards_next_review ON flashcards(next_review);  -- Critical for "due today" queries
CREATE INDEX idx_flashcards_user_next_review ON flashcards(user_id, next_review);

-- RLS Policies
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own flashcards"
    ON flashcards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcards"
    ON flashcards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards"
    ON flashcards FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards"
    ON flashcards FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- Table: review_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS review_logs (
    log_id BIGSERIAL PRIMARY KEY,
    card_id UUID NOT NULL REFERENCES flashcards(card_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 4),  -- 1=Again, 2=Hard, 3=Good, 4=Easy
    elapsed_days INTEGER NOT NULL,
    scheduled_days INTEGER NOT NULL,
    review_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_review_logs_card_id ON review_logs(card_id);
CREATE INDEX idx_review_logs_user_id ON review_logs(user_id);
CREATE INDEX idx_review_logs_review_at ON review_logs(review_at DESC);

-- RLS Policies
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own review logs"
    ON review_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own review logs"
    ON review_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Triggers for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_raw_knowledge_updated_at
    BEFORE UPDATE ON raw_knowledge
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Completed
-- =====================================================
-- All tables created successfully with RLS enabled.
-- Remember to set up Supabase Auth and obtain API keys.
