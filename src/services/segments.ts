import { supabase } from '../lib/supabase';
import type { DbSegment } from '../lib/database.types';

export async function fetchSegments(): Promise<DbSegment[]> {
  const { data, error } = await supabase
    .from('segments')
    .select('*')
    .order('id');
  if (error) throw error;
  return data ?? [];
}
