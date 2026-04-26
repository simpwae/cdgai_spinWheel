import { supabase } from '../lib/supabase';
import type { DbActiveSession } from '../lib/database.types';

const SESSION_ID = 'singleton';

export async function fetchSession(): Promise<DbActiveSession | null> {
  const { data, error } = await supabase
    .from('active_session')
    .select('*')
    .eq('id', SESSION_ID)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setCurrentStudentId(studentId: string | null): Promise<void> {
  const { error } = await supabase
    .from('active_session')
    .update({
      current_student_id: studentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', SESSION_ID);
  if (error) throw error;
}

export async function setSpinResult(segmentId: string, segmentName: string): Promise<void> {
  const { error } = await supabase
    .from('active_session')
    .update({
      last_spin_segment_id: segmentId,
      last_spin_segment_name: segmentName,
      last_spin_timestamp: Date.now(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', SESSION_ID);
  if (error) throw error;
}

// Atomically records the spin result AND clears the current student in one DB write
// to avoid the race where two separate updates cause stale currentStudent via realtime
export async function setSpinResultAndClearStudent(segmentId: string, segmentName: string): Promise<void> {
  const { error } = await supabase
    .from('active_session')
    .update({
      current_student_id: null,
      last_spin_segment_id: segmentId,
      last_spin_segment_name: segmentName,
      last_spin_timestamp: Date.now(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', SESSION_ID);
  if (error) throw error;
}

export async function clearSpinResult(): Promise<void> {
  const { error } = await supabase
    .from('active_session')
    .update({
      last_spin_segment_id: null,
      last_spin_segment_name: null,
      last_spin_timestamp: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', SESSION_ID);
  if (error) throw error;
}

export async function resetSession(): Promise<void> {
  const { error } = await supabase
    .from('active_session')
    .update({
      current_student_id: null,
      last_spin_segment_id: null,
      last_spin_segment_name: null,
      last_spin_timestamp: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', SESSION_ID);
  if (error) throw error;
}
