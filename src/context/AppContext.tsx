import React, { useMemo, useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import type { DbStudent, DbActiveSession, DbAward } from '../lib/database.types';
import { fetchStudents, fetchStudentByStudentId, fetchStudentById, insertStudent, updateStudent as updateStudentDb, deleteAllStudents } from '../services/students';
import { fetchSession, setCurrentStudentId, setSpinResultAndClearStudent as setSpinResultAndClearStudentDb, clearSpinResult as clearSpinResultDb, resetSession } from '../services/session';
import { fetchQuestions } from '../services/questions';
import { fetchSegments } from '../services/segments';
import { fetchAwards as fetchAwardsDb, insertAward as insertAwardDb, deleteAward as deleteAwardDb, claimRandomAward } from '../services/awards';

// --- Faculty / Department constants ---

export const FACULTY_DEPARTMENTS = {
  'Faculty of Engineering': ['Civil', 'Mechanical', 'Electrical', 'Architecture'] as const,
  'Faculty of Life Sciences': ['Pharmacy', 'Bioscience', 'Allied Health Sciences', 'Nursing'] as const,
  'Faculty of Computing and Management Sciences': ['Management of Science', 'Basic Science & Humanities', 'Computer Sciences', 'Software Engineering'] as const,
} as const;

export type Faculty = keyof typeof FACULTY_DEPARTMENTS;

export type Department =
  | typeof FACULTY_DEPARTMENTS[Faculty][number]
  | '';

export interface Award {
  id: string;
  name: string;
  totalQuantity: number;
  remainingQuantity: number;
}
export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  faculty: string;
  department: Department;
  studentId: string;
  score: number;
  spinsUsed: number;
  maxSpins: number;
  status: 'active' | 'locked' | 'banned';
  spinHistory: string[];
  rewardClaimed?: boolean;
  awardedPrize?: string | null;
  pendingScore?: number;
  pendingFeedback?: string;
}
export interface Segment {
  id: string;
  name: string;
  color: string;
}
export interface Question {
  id: string;
  category: string;
  department?: Department;
  text: string;
  options: string[];
  correctAnswerIndex: number;
}
interface AppContextType {
  students: Student[];
  currentStudent: Student | null;
  leaderboard: Student[];
  segments: Segment[];
  questions: Question[];
  awards: Award[];
  maxTriesDefault: number;
  registerStudent: (
    name: string,
    studentId: string,
    email: string,
    phone: string,
    faculty: string,
    department: Department
  ) => Promise<{
    success: boolean;
    error?: string;
    student?: Student;
  }>;
  setCurrentStudent: (student: Student | null) => void;
  recordSpin: (studentId: string, segmentId: string, points: number) => void;
  updateScore: (studentId: string, points: number) => void;
  resetLeaderboard: () => void;
  markRewardClaimed: (studentId: string) => void;
  submitAdminScore: (
    studentId: string,
    score: number,
    feedback?: string
  ) => void;
  banStudent: (studentId: string) => void;
  unbanStudent: (studentId: string) => void;
  editTries: (studentId: string, newMaxSpins: number) => void;
  lastSpinResult: { segmentId: string; segmentName: string; timestamp: number } | null;
  clearSpinResult: () => void;
  addAward: (name: string, quantity: number) => Promise<void>;
  removeAward: (id: string) => Promise<void>;
  claimAward: (studentId: string) => Promise<string | null>;
  refreshQuestions: () => Promise<void>;
  refreshAwards: () => Promise<void>;
}

// --- Helpers to convert between DB rows and app models ---

function dbStudentToStudent(row: DbStudent): Student {
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    faculty: row.faculty || '',
    department: (row.department || '') as Department,
    studentId: row.student_id,
    score: row.score,
    spinsUsed: row.spins_used,
    maxSpins: row.max_spins,
    status: row.status as Student['status'],
    spinHistory: row.spin_history ?? [],
    rewardClaimed: row.reward_claimed,
    awardedPrize: row.awarded_prize ?? null,
    pendingScore: row.pending_score ?? undefined,
    pendingFeedback: row.pending_feedback ?? undefined,
  };
}

function dbAwardToAward(row: DbAward): Award {
  return {
    id: row.id,
    name: row.name,
    totalQuantity: row.total_quantity,
    remainingQuantity: row.remaining_quantity,
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [currentStudent, setCurrentStudentState] = useState<Student | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [lastSpinResult, setLastSpinResult] = useState<{
    segmentId: string;
    segmentName: string;
    timestamp: number;
  } | null>(null);
  const maxTriesDefault = 3;

  // Track the last spin timestamp we've already processed so we don't re-fire
  const lastProcessedSpinTs = useRef<number | null>(null);

  // --- Initial data load ---
  useEffect(() => {
    const load = async () => {
      try {
        const [dbStudents, dbSegments, dbQuestions, dbSession, dbAwards] = await Promise.all([
          fetchStudents(),
          fetchSegments(),
          fetchQuestions(),
          fetchSession(),
          fetchAwardsDb(),
        ]);
        setStudents(dbStudents.map(dbStudentToStudent));
        setSegments(dbSegments.map((s) => ({ id: s.id, name: s.name, color: s.color })));
        setQuestions(
          dbQuestions.map((q) => ({
            id: q.id,
            category: q.category,
            department: (q.department || undefined) as Department | undefined,
            text: q.text,
            options: q.options,
            correctAnswerIndex: q.correct_answer_index,
          }))
        );
        setAwards(dbAwards.map(dbAwardToAward));
        // Restore current student from session
        if (dbSession.current_student_id) {
          const match = dbStudents.find((s) => s.id === dbSession.current_student_id);
          if (match) setCurrentStudentState(dbStudentToStudent(match));
        }
        // Restore pending spin result
        if (dbSession.last_spin_segment_id && dbSession.last_spin_timestamp) {
          lastProcessedSpinTs.current = dbSession.last_spin_timestamp;
        }
      } catch (err) {
        console.error('Failed to load initial data from Supabase:', err);
      }
    };
    load();
  }, []);

  // --- Realtime subscription: students table ---
  useEffect(() => {
    const channel = supabase
      .channel('students-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newStudent = dbStudentToStudent(payload.new as DbStudent);
            setStudents((prev) => {
              if (prev.some((s) => s.id === newStudent.id)) return prev;
              return [...prev, newStudent];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = dbStudentToStudent(payload.new as DbStudent);
            setStudents((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s))
            );
            // Also update currentStudent if it matches
            setCurrentStudentState((prev) =>
              prev && prev.id === updated.id ? updated : prev
            );
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id: string }).id;
            setStudents((prev) => prev.filter((s) => s.id !== oldId));
            setCurrentStudentState((prev) =>
              prev && prev.id === oldId ? null : prev
            );
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- Realtime subscription: active_session table ---
  useEffect(() => {
    const channel = supabase
      .channel('session-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'active_session' },
        (payload) => {
          const session = payload.new as DbActiveSession;

          // Detect whether a new spin result is arriving in this same event
          const isNewSpinResult =
            !!session.last_spin_segment_id &&
            !!session.last_spin_timestamp &&
            session.last_spin_timestamp !== lastProcessedSpinTs.current;

          // Update currentStudent
          if (session.current_student_id) {
            setStudents((prev) => {
              const match = prev.find((s) => s.id === session.current_student_id);
              if (match) {
                setCurrentStudentState(match);
              } else {
                // Student not yet in local state (INSERT event may not have arrived) — fetch from DB
                fetchStudentById(session.current_student_id!).then((dbStudent) => {
                  if (dbStudent) {
                    const student = dbStudentToStudent(dbStudent);
                    setStudents((p) => {
                      if (p.some((s) => s.id === student.id)) return p;
                      return [...p, student];
                    });
                    setCurrentStudentState(student);
                  }
                }).catch(console.error);
              }
              return prev;
            });
          } else if (!isNewSpinResult) {
            // Only clear currentStudent if there's no spin result arriving simultaneously.
            // When a spin is registered, current_student_id is cleared in the same DB write
            // as the spin result. We skip clearing here so result screens on the student page
            // still have access to the student (e.g. ResultPitch waiting for pendingScore).
            // The admin page already clears it locally via setCurrentStudentState(null)
            // inside recordSpin(), so it won't show a stale student.
            setCurrentStudentState(null);
          }

          // Update spin result (only if timestamp is new)
          if (
            session.last_spin_segment_id &&
            session.last_spin_timestamp &&
            session.last_spin_timestamp !== lastProcessedSpinTs.current
          ) {
            lastProcessedSpinTs.current = session.last_spin_timestamp;
            setLastSpinResult({
              segmentId: session.last_spin_segment_id,
              segmentName: session.last_spin_segment_name || '',
              timestamp: session.last_spin_timestamp,
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const leaderboard = useMemo(() => {
    return [...students].sort((a, b) => b.score - a.score);
  }, [students]);

  // --- Context methods (write to Supabase, realtime updates local state) ---

  const registerStudent = useCallback(async (
    name: string,
    studentId: string,
    email: string,
    phone: string,
    faculty: string,
    department: Department
  ): Promise<{ success: boolean; error?: string; student?: Student }> => {
    try {
      const existing = await fetchStudentByStudentId(studentId);
      if (existing) {
        const student = dbStudentToStudent(existing);
        if (existing.name.toLowerCase() !== name.toLowerCase()) {
          return { success: false, error: 'name_mismatch' };
        }
        if (existing.spins_used >= existing.max_spins) {
          await setCurrentStudentId(existing.id);
          setCurrentStudentState(student);
          return { success: false, error: 'max_spins', student };
        }
        await setCurrentStudentId(existing.id);
        setCurrentStudentState(student);
        return { success: true, student };
      }
      // New student
      const dbRow = await insertStudent({
        name,
        student_id: studentId,
        email,
        phone,
        faculty,
        department,
        score: 0,
        spins_used: 0,
        max_spins: maxTriesDefault,
        status: 'active',
        spin_history: [],
        reward_claimed: false,
        awarded_prize: null,
        pending_score: null,
        pending_feedback: null,
      });
      const student = dbStudentToStudent(dbRow);
      await setCurrentStudentId(dbRow.id);
      setCurrentStudentState(student);
      // Optimistically add to local list (realtime will also fire)
      setStudents((prev) => {
        if (prev.some((s) => s.id === student.id)) return prev;
        return [...prev, student];
      });
      return { success: true, student };
    } catch (err) {
      console.error('registerStudent error:', err);
      return { success: false, error: 'server_error' };
    }
  }, [maxTriesDefault]);

  const setCurrentStudent = useCallback((student: Student | null) => {
    setCurrentStudentState(student);
    setCurrentStudentId(student?.id ?? null).catch(console.error);
  }, []);

  const recordSpin = useCallback((studentId: string, segmentId: string, points: number) => {
    // Find the student to compute new values
    setStudents((prev) => {
      const target = prev.find((s) => s.id === studentId || s.studentId === studentId);
      if (!target) return prev;

      const newSpinsUsed = target.spinsUsed + 1;
      const newStatus = newSpinsUsed >= target.maxSpins ? 'locked' : target.status;
      const segName = segments.find((seg) => seg.id === segmentId)?.name || '';

      // Fire async DB updates (don't block UI)
      updateStudentDb(target.id, {
        score: target.score + points,
        spins_used: newSpinsUsed,
        status: newStatus,
        spin_history: [...target.spinHistory, segmentId],
        reward_claimed: false,
        pending_score: null,
        pending_feedback: null,
      }).catch(console.error);

      // Single atomic update: sets spin result AND clears current_student_id together
      // Prevents the race where two separate updates cause stale currentStudent via realtime
      setSpinResultAndClearStudentDb(segmentId, segName).catch(console.error);

      // Optimistic local update (do NOT touch currentStudentState here — cleared below)
      const updated: Student = {
        ...target,
        score: target.score + points,
        spinsUsed: newSpinsUsed,
        status: newStatus as Student['status'],
        spinHistory: [...target.spinHistory, segmentId],
        rewardClaimed: false,
        pendingScore: undefined,
        pendingFeedback: undefined,
      };
      return prev.map((s) => (s.id === target.id ? updated : s));
    });
    // Clear current student outside the setStudents updater to avoid nested-setState ordering issues
    setCurrentStudentState(null);
  }, [segments]);

  const updateScore = useCallback((studentId: string, points: number) => {
    setStudents((prev) => {
      const target = prev.find((s) => s.id === studentId || s.studentId === studentId);
      if (!target) return prev;

      updateStudentDb(target.id, { score: target.score + points }).catch(console.error);

      const updated = { ...target, score: target.score + points };
      setCurrentStudentState((curr) =>
        curr && curr.id === target.id ? updated : curr
      );
      return prev.map((s) => (s.id === target.id ? updated : s));
    });
  }, []);

  const markRewardClaimed = useCallback((studentId: string) => {
    setStudents((prev) => {
      const target = prev.find((s) => s.id === studentId || s.studentId === studentId);
      if (!target) return prev;

      updateStudentDb(target.id, { reward_claimed: true }).catch(console.error);

      const updated = { ...target, rewardClaimed: true };
      setCurrentStudentState((curr) =>
        curr && curr.id === target.id ? updated : curr
      );
      return prev.map((s) => (s.id === target.id ? updated : s));
    });
  }, []);

  const submitAdminScore = useCallback((studentId: string, score: number, feedback?: string) => {
    setStudents((prev) => {
      const target = prev.find((s) => s.id === studentId || s.studentId === studentId);
      if (!target) return prev;

      updateStudentDb(target.id, {
        score: target.score + score,
        pending_score: score,
        pending_feedback: feedback ?? null,
      }).catch(console.error);

      const updated: Student = {
        ...target,
        score: target.score + score,
        pendingScore: score,
        pendingFeedback: feedback,
      };
      setCurrentStudentState((curr) =>
        curr && curr.id === target.id ? updated : curr
      );
      return prev.map((s) => (s.id === target.id ? updated : s));
    });
  }, []);

  const resetLeaderboard = useCallback(() => {
    setStudents([]);
    setCurrentStudentState(null);
    setLastSpinResult(null);
    // Async DB cleanup
    (async () => {
      try {
        await resetSession();
        await deleteAllStudents();
      } catch (err) {
        console.error('resetLeaderboard error:', err);
      }
    })();
  }, []);

  const clearSpinResult = useCallback(() => {
    setLastSpinResult(null);
    clearSpinResultDb().catch(console.error);
  }, []);

  const banStudent = useCallback((studentId: string) => {
    setStudents((prev) => {
      const target = prev.find((s) => s.id === studentId || s.studentId === studentId);
      if (!target) return prev;

      updateStudentDb(target.id, { status: 'banned' }).catch(console.error);

      const updated = { ...target, status: 'banned' as const };
      return prev.map((s) => (s.id === target.id ? updated : s));
    });
  }, []);

  const unbanStudent = useCallback((studentId: string) => {
    setStudents((prev) => {
      const target = prev.find((s) => s.id === studentId || s.studentId === studentId);
      if (!target) return prev;

      const newStatus = target.spinsUsed >= target.maxSpins ? 'locked' : 'active';
      updateStudentDb(target.id, { status: newStatus }).catch(console.error);

      const updated = { ...target, status: newStatus as Student['status'] };
      return prev.map((s) => (s.id === target.id ? updated : s));
    });
  }, []);

  const editTries = useCallback((studentId: string, newMaxSpins: number) => {
    setStudents((prev) => {
      const target = prev.find((s) => s.id === studentId || s.studentId === studentId);
      if (!target) return prev;

      const newStatus =
        target.status === 'banned'
          ? 'banned'
          : target.spinsUsed >= newMaxSpins
            ? 'locked'
            : 'active';

      updateStudentDb(target.id, { max_spins: newMaxSpins, status: newStatus }).catch(console.error);

      const updated = { ...target, maxSpins: newMaxSpins, status: newStatus as Student['status'] };
      return prev.map((s) => (s.id === target.id ? updated : s));
    });
  }, []);

  // --- Award methods ---

  const addAward = useCallback(async (name: string, quantity: number) => {
    const dbRow = await insertAwardDb(name, quantity);
    setAwards((prev) => [...prev, dbAwardToAward(dbRow)]);
  }, []);

  const removeAward = useCallback(async (id: string) => {
    await deleteAwardDb(id);
    setAwards((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const claimAward = useCallback(async (studentId: string): Promise<string | null> => {
    const prizeName = await claimRandomAward(studentId);
    if (prizeName) {
      // Update local student state with the awarded prize
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId ? { ...s, awardedPrize: prizeName } : s
        )
      );
      setCurrentStudentState((prev) =>
        prev && prev.id === studentId ? { ...prev, awardedPrize: prizeName } : prev
      );
      // Decrement local award count
      setAwards((prev) =>
        prev.map((a) =>
          a.name === prizeName
            ? { ...a, remainingQuantity: Math.max(0, a.remainingQuantity - 1) }
            : a
        )
      );
    }
    return prizeName;
  }, []);

  const refreshQuestions = useCallback(async () => {
    const dbQuestions = await fetchQuestions();
    setQuestions(
      dbQuestions.map((q) => ({
        id: q.id,
        category: q.category,
        department: (q.department || undefined) as Department | undefined,
        text: q.text,
        options: q.options,
        correctAnswerIndex: q.correct_answer_index,
      }))
    );
  }, []);

  const refreshAwards = useCallback(async () => {
    const dbAwards = await fetchAwardsDb();
    setAwards(dbAwards.map(dbAwardToAward));
  }, []);

  return (
    <AppContext.Provider
      value={{
        students,
        currentStudent,
        leaderboard,
        segments,
        questions,
        awards,
        maxTriesDefault,
        registerStudent,
        setCurrentStudent,
        recordSpin,
        updateScore,
        resetLeaderboard,
        markRewardClaimed,
        submitAdminScore,
        banStudent,
        unbanStudent,
        editTries,
        lastSpinResult,
        clearSpinResult,
        addAward,
        removeAward,
        claimAward,
        refreshQuestions,
        refreshAwards,
      }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};