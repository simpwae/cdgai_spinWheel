-- ============================================
-- CDGAI Career Fair — Supabase Database Setup
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  student_id text UNIQUE NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  faculty text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  score integer NOT NULL DEFAULT 0,
  spins_used integer NOT NULL DEFAULT 0,
  max_spins integer NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'active',
  spin_history text[] NOT NULL DEFAULT '{}',
  reward_claimed boolean NOT NULL DEFAULT false,
  awarded_prize text,
  pending_score integer,
  pending_feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1b. Awards table
CREATE TABLE IF NOT EXISTS awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  total_quantity integer NOT NULL DEFAULT 0,
  remaining_quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Segments table
CREATE TABLE IF NOT EXISTS segments (
  id text PRIMARY KEY,
  name text NOT NULL,
  color text NOT NULL
);

-- 3. Questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  department text,
  text text NOT NULL,
  options text[] NOT NULL,
  correct_answer_index integer NOT NULL
);

-- 4. Active session (singleton row for current student + spin result)
CREATE TABLE IF NOT EXISTS active_session (
  id text PRIMARY KEY DEFAULT 'singleton',
  current_student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  last_spin_segment_id text,
  last_spin_segment_name text,
  last_spin_timestamp bigint,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Settings (singleton row)
CREATE TABLE IF NOT EXISTS settings (
  id text PRIMARY KEY DEFAULT 'singleton',
  max_tries_default integer NOT NULL DEFAULT 3,
  event_name text NOT NULL DEFAULT 'CDGAI Career Fair 2025'
);

-- ============================================
-- Seed data
-- ============================================

-- Segments (7 wheel segments)
INSERT INTO segments (id, name, color) VALUES
  ('s1', 'Better Luck Next Time', '#6B7280'),
  ('s2', '3 Followers + Freebee', '#D97706'),
  ('s3', 'Question Bank', '#7C3AED'),
  ('s4', 'IQ Games', '#0D9488'),
  ('s5', 'Pitch & Communicate', '#EA580C'),
  ('s6', 'Career Questions', '#2563EB'),
  ('s7', 'Résumé Review', '#16A34A')
ON CONFLICT (id) DO NOTHING;

-- Questions (4 starter questions)
INSERT INTO questions (category, department, text, options, correct_answer_index) VALUES
  ('Question Bank', 'Computer Science', 'What does "HTTP" stand for?',
    ARRAY['HyperText Transfer Protocol', 'HyperText Transmission Protocol', 'Hyperlink Transfer Technology', 'HyperText Time Protocol'], 0),
  ('Question Bank', 'Architecture', 'Who designed the Guggenheim Museum in New York?',
    ARRAY['Frank Gehry', 'Frank Lloyd Wright', 'Le Corbusier', 'Zaha Hadid'], 1),
  ('IQ Games', NULL, 'If you rearrange the letters "CIFAIC", you would have the name of a(n):',
    ARRAY['City', 'Animal', 'Ocean', 'River'], 2),
  ('Career Questions', NULL, 'What is the most important section of a resume for a fresh graduate?',
    ARRAY['Hobbies', 'References', 'Education & Projects', 'Objective Statement'], 2);

-- Active session singleton
INSERT INTO active_session (id) VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;

-- Settings singleton
INSERT INTO settings (id) VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Row Level Security (RLS)
-- Allow anon read/write for event mode (no auth)
-- ============================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;

-- Students: full access for anon
CREATE POLICY "anon_students_select" ON students FOR SELECT TO anon USING (true);
CREATE POLICY "anon_students_insert" ON students FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_students_update" ON students FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_students_delete" ON students FOR DELETE TO anon USING (true);

-- Segments: read-only for anon
CREATE POLICY "anon_segments_select" ON segments FOR SELECT TO anon USING (true);

-- Questions: full access for anon (needed for import)
CREATE POLICY "anon_questions_select" ON questions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_questions_insert" ON questions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_questions_delete" ON questions FOR DELETE TO anon USING (true);

-- Active session: full access for anon
CREATE POLICY "anon_session_select" ON active_session FOR SELECT TO anon USING (true);
CREATE POLICY "anon_session_update" ON active_session FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Settings: read-only for anon
CREATE POLICY "anon_settings_select" ON settings FOR SELECT TO anon USING (true);

-- Awards: full access for anon
CREATE POLICY "anon_awards_select" ON awards FOR SELECT TO anon USING (true);
CREATE POLICY "anon_awards_insert" ON awards FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_awards_update" ON awards FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_awards_delete" ON awards FOR DELETE TO anon USING (true);

-- ============================================
-- Enable Realtime
-- ============================================

-- Enable realtime for students and active_session tables
-- (In Supabase Dashboard: Database > Replication > enable these tables)
-- Or via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE students;
ALTER PUBLICATION supabase_realtime ADD TABLE active_session;
ALTER PUBLICATION supabase_realtime ADD TABLE awards;

-- ============================================
-- RPC: Atomically claim a random available award
-- ============================================
CREATE OR REPLACE FUNCTION claim_random_award(p_student_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_award_id uuid;
  v_award_name text;
  v_existing text;
BEGIN
  -- Check if student already has an award
  SELECT awarded_prize INTO v_existing FROM students WHERE id = p_student_id;
  IF v_existing IS NOT NULL THEN
    RETURN NULL;
  END IF;

  -- Pick a random award with remaining quantity > 0, lock the row
  SELECT id, name INTO v_award_id, v_award_name
  FROM awards
  WHERE remaining_quantity > 0
  ORDER BY random()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_award_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Decrement remaining quantity
  UPDATE awards SET remaining_quantity = remaining_quantity - 1 WHERE id = v_award_id;

  -- Set the award on the student
  UPDATE students SET awarded_prize = v_award_name WHERE id = p_student_id;

  RETURN v_award_name;
END;
$$;

-- ============================================
-- Migration: Add email column (run if table already exists)
-- ============================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';

-- ============================================
-- Migration: Add guest extra fields
-- ============================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guest_type text NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS semester text NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS position text NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS organization text NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS field_of_interest text NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS follow_status text NOT NULL DEFAULT '';
