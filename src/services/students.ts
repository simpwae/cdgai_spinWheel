import { supabase } from '../lib/supabase';
import type { DbStudent } from '../lib/database.types';

export async function fetchStudents(): Promise<DbStudent[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('score', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchStudentByStudentId(studentId: string): Promise<DbStudent | null> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertStudent(student: Omit<DbStudent, 'id' | 'created_at'>): Promise<DbStudent> {
  const { data, error } = await supabase
    .from('students')
    .insert(student)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStudent(id: string, fields: Partial<DbStudent>): Promise<DbStudent> {
  const { data, error } = await supabase
    .from('students')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAllStudents(): Promise<void> {
  const { error } = await supabase
    .from('students')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows
  if (error) throw error;
}
