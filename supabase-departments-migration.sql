-- ============================================
-- EduWheel — Custom Departments Table Migration
-- Run this in the Supabase SQL Editor (one time).
-- ============================================

-- 1. Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  faculty text NOT NULL DEFAULT 'Custom',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon full access to departments" ON departments;
CREATE POLICY "Allow anon full access to departments"
  ON departments
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 3. Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE departments;

-- 4. Add question_categories column (safe to re-run)
ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS question_categories TEXT[]
  NOT NULL DEFAULT ARRAY['Question Bank','IQ Games','Career Questions'];
