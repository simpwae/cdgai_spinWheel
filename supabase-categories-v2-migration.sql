-- ============================================================
-- Categories V2 Migration
-- Run AFTER supabase-departments-v2-migration.sql
-- Idempotent: safe to run multiple times
-- ============================================================

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 2. Unique index on name (partial: excludes soft-deleted rows)
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_active_unique
  ON categories (name)
  WHERE deleted_at IS NULL;

-- 3. Unique index on slug (partial: excludes soft-deleted rows)
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_active_unique
  ON categories (slug)
  WHERE deleted_at IS NULL;

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS categories_is_active_idx  ON categories (is_active);
CREATE INDEX IF NOT EXISTS categories_deleted_at_idx ON categories (deleted_at);

-- 5. updated_at auto-trigger (reuse set_updated_at function from departments migration)
DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. Seed the 3 built-in categories (idempotent)
INSERT INTO categories (name, slug, is_active) VALUES
  ('Question Bank',    'question-bank',    true),
  ('IQ Games',         'iq-games',         true),
  ('Career Questions', 'career-questions', true)
ON CONFLICT DO NOTHING;

-- 7. Enable Realtime on categories table
ALTER PUBLICATION supabase_realtime ADD TABLE categories;

-- 8. RLS policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_anon_select" ON categories;
CREATE POLICY "categories_anon_select"
  ON categories FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "categories_service_all" ON categories;
CREATE POLICY "categories_service_all"
  ON categories FOR ALL
  USING (true)
  WITH CHECK (true);

-- 9. Migrate existing available_categories from settings into categories table
--    (backfill any extra categories that were added via the old settings mechanism)
DO $$
DECLARE
  cat_name TEXT;
BEGIN
  -- Only run if settings table has available_categories column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'available_categories'
  ) THEN
    FOR cat_name IN
      SELECT UNNEST(available_categories) FROM settings WHERE id = 'singleton'
    LOOP
      INSERT INTO categories (name, slug, is_active)
      VALUES (
        cat_name,
        lower(regexp_replace(regexp_replace(cat_name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')),
        true
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;
