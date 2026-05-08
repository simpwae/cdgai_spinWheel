-- ============================================================
-- Departments V2 Migration
-- Run AFTER supabase-setup.sql and supabase-departments-migration.sql
-- Idempotent: safe to run multiple times
-- ============================================================

-- 1. Add new columns to existing departments table
ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS slug          TEXT,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ;

-- 2. Remove question_categories column (categories are now a separate table)
--    Use DROP IF EXISTS to be safe if it was already removed
ALTER TABLE departments
  DROP COLUMN IF EXISTS question_categories;

-- 3. Backfill slugs for any existing rows that have none
UPDATE departments
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- 4. Make slug NOT NULL now that all rows have values
ALTER TABLE departments
  ALTER COLUMN slug SET NOT NULL;

-- 5. Unique index on slug (partial: excludes soft-deleted rows)
CREATE UNIQUE INDEX IF NOT EXISTS departments_slug_active_unique
  ON departments (slug)
  WHERE deleted_at IS NULL;

-- 6. Unique index on name (partial: excludes soft-deleted rows)
CREATE UNIQUE INDEX IF NOT EXISTS departments_name_active_unique
  ON departments (name)
  WHERE deleted_at IS NULL;

-- 7. Performance indexes
CREATE INDEX IF NOT EXISTS departments_is_active_idx  ON departments (is_active);
CREATE INDEX IF NOT EXISTS departments_deleted_at_idx ON departments (deleted_at);
CREATE INDEX IF NOT EXISTS departments_faculty_idx    ON departments (faculty);

-- 8. updated_at auto-trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS departments_updated_at ON departments;
CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 9. Seed the 12 built-in departments (idempotent)
INSERT INTO departments (name, faculty, is_active, slug) VALUES
  ('Civil',                     'Faculty of Engineering',                       true, 'civil'),
  ('Mechanical',                'Faculty of Engineering',                       true, 'mechanical'),
  ('Electrical',                'Faculty of Engineering',                       true, 'electrical'),
  ('Architecture',              'Faculty of Engineering',                       true, 'architecture'),
  ('Pharmacy',                  'Faculty of Life Sciences',                     true, 'pharmacy'),
  ('Bioscience',                'Faculty of Life Sciences',                     true, 'bioscience'),
  ('Allied Health Sciences',    'Faculty of Life Sciences',                     true, 'allied-health-sciences'),
  ('Nursing',                   'Faculty of Life Sciences',                     true, 'nursing'),
  ('Management of Science',     'Faculty of Computing and Management Sciences', true, 'management-of-science'),
  ('Basic Science & Humanities','Faculty of Computing and Management Sciences', true, 'basic-science-humanities'),
  ('Computer Sciences',         'Faculty of Computing and Management Sciences', true, 'computer-sciences'),
  ('Software Engineering',      'Faculty of Computing and Management Sciences', true, 'software-engineering')
ON CONFLICT DO NOTHING;

-- 10. Enable Realtime on departments table
ALTER PUBLICATION supabase_realtime ADD TABLE departments;

-- 11. RLS policies (anon can read active non-deleted; service role full access)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_anon_select" ON departments;
CREATE POLICY "departments_anon_select"
  ON departments FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "departments_service_all" ON departments;
CREATE POLICY "departments_service_all"
  ON departments FOR ALL
  USING (true)
  WITH CHECK (true);
