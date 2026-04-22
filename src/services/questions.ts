import { supabase } from '../lib/supabase';
import type { DbQuestion } from '../lib/database.types';

export async function fetchQuestions(): Promise<DbQuestion[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*');
  if (error) throw error;
  return data ?? [];
}

export async function deleteAllQuestions(): Promise<void> {
  const { error } = await supabase
    .from('questions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
}

export async function deleteQuestionsByDepartment(department: string): Promise<void> {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('department', department);
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
}

export async function deleteNullDepartmentQuestions(): Promise<void> {
  const { error } = await supabase
    .from('questions')
    .delete()
    .is('department', null);
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
}

export async function insertQuestions(
  questions: Omit<DbQuestion, 'id'>[]
): Promise<void> {
  // Supabase has a row limit per insert; batch in chunks of 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('questions')
      .insert(batch);
    if (error) throw new Error(error.message || error.details || JSON.stringify(error));
  }
}
