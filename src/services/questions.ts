import { supabase } from '../lib/supabase';
import type { DbQuestion } from '../lib/database.types';

export async function fetchQuestions(): Promise<DbQuestion[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*');
  if (error) throw error;
  return data ?? [];
}
