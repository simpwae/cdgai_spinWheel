-- Migration: Add available_categories to settings table
-- Run this in your Supabase SQL Editor.

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS available_categories TEXT[] NOT NULL
  DEFAULT ARRAY['Question Bank', 'IQ Games', 'Career Questions']::TEXT[];

-- Backfill existing row in case the default didn't apply
UPDATE settings
SET available_categories = ARRAY['Question Bank', 'IQ Games', 'Career Questions']::TEXT[]
WHERE id = 'singleton'
  AND (available_categories IS NULL OR array_length(available_categories, 1) = 0);
