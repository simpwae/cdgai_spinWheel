export interface DbStudent {
  id: string;
  name: string;
  student_id: string;
  department: string;
  score: number;
  spins_used: number;
  max_spins: number;
  status: 'active' | 'locked' | 'banned';
  spin_history: string[];
  reward_claimed: boolean;
  pending_score: number | null;
  pending_feedback: string | null;
  created_at: string;
}

export interface DbSegment {
  id: string;
  name: string;
  color: string;
}

export interface DbQuestion {
  id: string;
  category: string;
  department: string | null;
  text: string;
  options: string[];
  correct_answer_index: number;
}

export interface DbActiveSession {
  id: string;
  current_student_id: string | null;
  last_spin_segment_id: string | null;
  last_spin_segment_name: string | null;
  last_spin_timestamp: number | null;
  updated_at: string;
}

export interface DbSettings {
  id: string;
  max_tries_default: number;
  event_name: string;
}
