import { supabase } from '../lib/supabase';
import type { DbCategory } from '../lib/database.types';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** All categories visible to admin (active + inactive, excludes hard-deleted) */
export async function fetchCategories(): Promise<DbCategory[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .is('deleted_at', null)
    .order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Only active, non-deleted categories (for CSV validation, question filtering) */
export async function fetchActiveCategories(): Promise<DbCategory[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Case-insensitive exact name lookup (for CSV validation) */
export async function getCategoryByName(name: string): Promise<DbCategory | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .ilike('name', name.trim())
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function insertCategory(name: string): Promise<DbCategory> {
  const trimmed = name.trim();
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: trimmed, slug: toSlug(trimmed), is_active: true })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCategory(
  id: string,
  updates: Partial<Pick<DbCategory, 'name' | 'is_active'>>,
): Promise<DbCategory> {
  const patch: Record<string, unknown> = { ...updates };
  if (updates.name) patch.slug = toSlug(updates.name);
  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function toggleCategoryActive(id: string, isActive: boolean): Promise<DbCategory> {
  return updateCategory(id, { is_active: isActive });
}

/** Soft-delete: sets deleted_at instead of hard deleting */
export async function softDeleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export interface CategorySafetyInfo {
  questionCount: number;
  canHardDelete: boolean;
}

/** Check how many questions are linked to this category */
export async function checkCategoryDeletionSafety(
  categoryName: string,
): Promise<CategorySafetyInfo> {
  const { count, error } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('category', categoryName);
  if (error) throw new Error(error.message);
  const questionCount = count ?? 0;
  return { questionCount, canHardDelete: questionCount === 0 };
}
