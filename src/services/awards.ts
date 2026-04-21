import { supabase } from '../lib/supabase';
import type { DbAward } from '../lib/database.types';

export async function fetchAwards(): Promise<DbAward[]> {
  const { data, error } = await supabase
    .from('awards')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function insertAward(name: string, quantity: number): Promise<DbAward> {
  const { data, error } = await supabase
    .from('awards')
    .insert({ name, total_quantity: quantity, remaining_quantity: quantity })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAward(id: string): Promise<void> {
  const { error } = await supabase
    .from('awards')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function claimRandomAward(studentId: string): Promise<string | null> {
  const { data, error } = await supabase
    .rpc('claim_random_award', { p_student_id: studentId });
  if (error) throw error;
  return data as string | null;
}
