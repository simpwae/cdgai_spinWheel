import { supabase } from '../lib/supabase';
import type { DbDepartment } from '../lib/database.types';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** All departments visible to admin (active + inactive, excludes hard-deleted) */
export async function fetchDepartments(): Promise<DbDepartment[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .is('deleted_at', null)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

/** Only active, non-deleted departments (for registration dropdowns, CSV validation) */
export async function fetchActiveDepartments(): Promise<DbDepartment[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

/** Case-insensitive exact name lookup (for CSV validation) */
export async function getDepartmentByName(name: string): Promise<DbDepartment | null> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .ilike('name', name.trim())
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertDepartment(
  name: string,
): Promise<DbDepartment> {
  const trimmed = name.trim();
  const { data, error } = await supabase
    .from('departments')
    .insert({ name: trimmed, slug: toSlug(trimmed), is_active: true })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateDepartment(
  id: string,
  updates: Partial<Pick<DbDepartment, 'name' | 'is_active'>>,
): Promise<DbDepartment> {
  const patch: Record<string, unknown> = { ...updates };
  if (updates.name) patch.slug = toSlug(updates.name);
  const { data, error } = await supabase
    .from('departments')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function toggleDepartmentActive(id: string, isActive: boolean): Promise<DbDepartment> {
  return updateDepartment(id, { is_active: isActive });
}

/** Soft-delete: sets deleted_at instead of hard deleting */
export async function softDeleteDepartment(id: string): Promise<void> {
  const { error } = await supabase
    .from('departments')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id);
  if (error) throw error;
}

export interface DepartmentSafetyInfo {
  studentCount: number;
  questionCount: number;
  canHardDelete: boolean;
}

/** Check whether a department can be hard-deleted (no linked students or questions) */
export async function checkDepartmentDeletionSafety(
  departmentName: string,
): Promise<DepartmentSafetyInfo> {
  const [studentsResult, questionsResult] = await Promise.all([
    supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('department', departmentName),
    supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('department', departmentName),
  ]);
  const studentCount = studentsResult.count ?? 0;
  const questionCount = questionsResult.count ?? 0;
  return {
    studentCount,
    questionCount,
    canHardDelete: studentCount === 0 && questionCount === 0,
  };
}

/** Legacy alias kept for backward compatibility with AppContext */
export const deleteDepartment = softDeleteDepartment;
