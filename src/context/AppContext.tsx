import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
} from "react";
import { supabase } from "../lib/supabase";
import type {
  DbStudent,
  DbActiveSession,
  DbAward,
} from "../lib/database.types";
import {
  fetchStudents,
  fetchStudentByStudentId,
  fetchStudentById,
  insertStudent,
  updateStudent as updateStudentDb,
  deleteAllStudents,
  fetchStudentByNameFacultyDept,
  fetchStudentByEmail,
} from "../services/students";
import {
  fetchSession,
  setCurrentStudentId,
  setSpinResultAndClearStudent as setSpinResultAndClearStudentDb,
  clearSpinResult as clearSpinResultDb,
  resetSession,
} from "../services/session";
import { fetchQuestions } from "../services/questions";
import { fetchSegments } from "../services/segments";
import { fetchSettings, updateSettings } from "../services/settings";
import {
  fetchAwards as fetchAwardsDb,
  insertAward as insertAwardDb,
  deleteAward as deleteAwardDb,
  claimRandomAward,
  type ClaimAwardResult,
} from "../services/awards";

// --- Faculty / Department constants ---

export const FACULTY_DEPARTMENTS = {
  "Faculty of Engineering": [
    "Civil",
    "Mechanical",
    "Electrical",
    "Architecture",
  ] as const,
  "Faculty of Life Sciences": [
    "Pharmacy",
    "Bioscience",
    "Allied Health Sciences",
    "Nursing",
  ] as const,
  "Faculty of Computing and Management Sciences": [
    "Management of Science",
    "Basic Science & Humanities",
    "Computer Sciences",
    "Software Engineering",
  ] as const,
} as const;

export type Faculty = keyof typeof FACULTY_DEPARTMENTS;

export type Department = (typeof FACULTY_DEPARTMENTS)[Faculty][number] | "";

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
  participantType: string;
  score: number;
  spinsUsed: number;
  maxSpins: number;
  status: "active" | "locked" | "banned";
  spinHistory: string[];
  rewardClaimed?: boolean;
  awardedPrize?: string | null;
  pendingScore?: number | null;
  pendingFeedback?: string | null;
  // Guest extra fields
  isGuest: boolean;
  guestType: string; // 'student' | 'faculty' | 'other'
  semester: string;
  position: string;
  organization: string;
  fieldOfInterest: string;
  followStatus: string; // 'already_followed' | 'just_followed'
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
  segments: Segment[];
  questions: Question[];
  awards: Award[];
  maxTriesDefault: number;
  rewardPoints: number;
  eventName: string;
  registerStudent: (
    name: string,
    studentId: string,
    email: string,
    phone: string,
    faculty: string,
    department: Department,
    registrationType: "student" | "faculty" | "others",
    guestSubType?: "student" | "faculty" | "other",
  ) => Promise<{
    success: boolean;
    error?: string;
    student?: Student;
  }>;
  setCurrentStudent: (student: Student | null) => void;
  recordSpin: (studentId: string, segmentId: string, points: number) => void;
  updateScore: (studentId: string, points: number) => void;
  recordQuestionResult: (
    studentId: string,
    category: string,
    correct: boolean,
  ) => void;
  resetSessionData: () => void;
  markRewardClaimed: (studentId: string) => void;
  banStudent: (studentId: string) => Promise<void>;
  unbanStudent: (studentId: string) => Promise<void>;
  editTries: (studentId: string, newMaxSpins: number) => void;
  lastSpinResult: {
    segmentId: string;
    segmentName: string;
    timestamp: number;
  } | null;
  clearSpinResult: () => void;
  addAward: (name: string, quantity: number) => Promise<void>;
  removeAward: (id: string) => Promise<void>;
  claimAward: (studentId: string) => Promise<ClaimAwardResult | null>;
  refreshQuestions: () => Promise<void>;
  refreshAwards: () => Promise<void>;
  updateMaxTriesDefault: (value: number) => Promise<void>;
  updateRewardPoints: (value: number) => Promise<void>;
  updateEventName: (value: string) => Promise<void>;
  submitAdminScore: (
    studentId: string,
    score: number,
    feedback?: string,
  ) => void;
}

// --- Helpers to convert between DB rows and app models ---

function dbStudentToStudent(row: DbStudent): Student {
  return {
    id: row.id,
    name: row.name,
    email: row.email || "",
    phone: row.phone || "",
    faculty: row.faculty || "",
    department: (row.department || "") as Department,
    studentId: row.student_id,
    participantType: row.participant_type || "student",
    score: row.score,
    spinsUsed: row.spins_used,
    maxSpins: row.max_spins,
    status: row.status as Student["status"],
    spinHistory: row.spin_history ?? [],
    rewardClaimed: row.reward_claimed,
    awardedPrize: row.awarded_prize ?? null,
    pendingScore: row.pending_score ?? null,
    pendingFeedback: row.pending_feedback ?? null,
    isGuest: row.is_guest ?? false,
    guestType: row.guest_type ?? "",
    semester: row.semester ?? "",
    position: row.position ?? "",
    organization: row.organization ?? "",
    fieldOfInterest: row.field_of_interest ?? "",
    followStatus: row.follow_status ?? "",
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [currentStudent, setCurrentStudentState] = useState<Student | null>(
    null,
  );
  const [segments, setSegments] = useState<Segment[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [lastSpinResult, setLastSpinResult] = useState<{
    segmentId: string;
    segmentName: string;
    timestamp: number;
  } | null>(null);
  const [maxTriesDefault, setMaxTriesDefault] = useState(3);
  const [rewardPoints, setRewardPoints] = useState(5);
  const [eventName, setEventName] = useState("CDGAI Career Fair 2025");

  // Track the last spin timestamp we've already processed so we don't re-fire
  const lastProcessedSpinTs = useRef<number | null>(null);

  // --- Initial data load ---
  useEffect(() => {
    const load = async () => {
      try {
        const [dbStudents, dbSegments, dbSession, dbAwards, dbSettings] =
          await Promise.all([
            fetchStudents(),
            fetchSegments(),
            fetchSession(),
            fetchAwardsDb(),
            fetchSettings(),
          ]);
        setStudents(dbStudents.map(dbStudentToStudent));
        setSegments(
          dbSegments.map((s) => ({ id: s.id, name: s.name, color: s.color })),
        );
        // questions are served from static src/data/questions.ts — no DB fetch needed at startup.
        // Admin panel populates `questions` on demand via refreshQuestions().
        setAwards(dbAwards.map(dbAwardToAward));
        if (dbSettings?.max_tries_default != null) {
          setMaxTriesDefault(dbSettings.max_tries_default);
        }
        if (dbSettings?.reward_points != null) {
          setRewardPoints(dbSettings.reward_points);
        }
        if (dbSettings?.event_name) {
          setEventName(dbSettings.event_name);
        }
        // Restore current student from session
        if (dbSession?.current_student_id) {
          const match = dbStudents.find(
            (s) => s.id === dbSession.current_student_id,
          );
          if (match) setCurrentStudentState(dbStudentToStudent(match));
        }
        // Restore pending spin result
        if (dbSession?.last_spin_segment_id && dbSession?.last_spin_timestamp) {
          lastProcessedSpinTs.current = dbSession.last_spin_timestamp;
        }
      } catch (err) {
        console.error("Failed to load initial data from Supabase:", err);
      }
    };
    load();
  }, []);

  // --- Realtime subscription: students table ---
  useEffect(() => {
    const channel = supabase
      .channel("students-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newStudent = dbStudentToStudent(payload.new as DbStudent);
            setStudents((prev) => {
              if (prev.some((s) => s.id === newStudent.id)) return prev;
              return [...prev, newStudent];
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = dbStudentToStudent(payload.new as DbStudent);
            setStudents((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s)),
            );
            // Also update currentStudent if it matches
            setCurrentStudentState((prev) =>
              prev && prev.id === updated.id ? updated : prev,
            );
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setStudents((prev) => prev.filter((s) => s.id !== oldId));
            setCurrentStudentState((prev) =>
              prev && prev.id === oldId ? null : prev,
            );
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- Realtime subscription: awards table ---
  useEffect(() => {
    const channel = supabase
      .channel("awards-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "awards" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newAward = dbAwardToAward(payload.new as DbAward);
            setAwards((prev) => {
              if (prev.some((a) => a.id === newAward.id)) return prev;
              return [...prev, newAward];
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = dbAwardToAward(payload.new as DbAward);
            setAwards((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a)),
            );
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setAwards((prev) => prev.filter((a) => a.id !== oldId));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- Realtime subscription: active_session table ---
  useEffect(() => {
    const channel = supabase
      .channel("session-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "active_session" },
        (payload) => {
          const session = payload.new as DbActiveSession;

          // Detect whether a new spin result is arriving in this same event
          const isNewSpinResult =
            !!session.last_spin_segment_id &&
            !!session.last_spin_timestamp &&
            session.last_spin_timestamp !== lastProcessedSpinTs.current;

          // Update currentStudent — ALWAYS fetch fresh from DB.
          // Reading from local students array causes a race condition:
          // the array may still hold the old department value at the moment
          // this realtime event fires, even after registerStudent has called
          // updateStudentDb. Fetching directly from DB is always authoritative.
          if (session.current_student_id) {
            fetchStudentById(session.current_student_id)
              .then((dbStudent) => {
                if (!dbStudent) return;
                const student = dbStudentToStudent(dbStudent);
                // Upsert into local array so admin leaderboard stays in sync
                setStudents((p) =>
                  p.some((s) => s.id === student.id)
                    ? p.map((s) => (s.id === student.id ? student : s))
                    : [...p, student],
                );
                setCurrentStudentState(student);
              })
              .catch(console.error);
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
              segmentName: session.last_spin_segment_name || "",
              timestamp: session.last_spin_timestamp,
            });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // leaderboard removed — no longer displayed in UI

  // --- ID generation helpers ---
  const generateId = (prefix: "FAC" | "STD" | "GST"): string => {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${num}`;
  };

  // --- Context methods (write to Supabase, realtime updates local state) ---

  const registerStudent = useCallback(
    async (
      name: string,
      studentId: string,
      email: string,
      phone: string,
      faculty: string,
      department: Department,
      registrationType: "student" | "faculty" | "others" = "student",
      guestSubType: "student" | "faculty" | "other" = "other",
    ): Promise<{ success: boolean; error?: string; student?: Student }> => {
      try {
        // Faculty mode: look up by name + faculty + department
        if (registrationType === "faculty") {
          const existingFaculty = await fetchStudentByNameFacultyDept(
            name,
            faculty,
            department,
          );
          if (existingFaculty) {
            const student = dbStudentToStudent(existingFaculty);
            if (existingFaculty.spins_used >= existingFaculty.max_spins) {
              await setCurrentStudentId(existingFaculty.id);
              setCurrentStudentState(student);
              return { success: false, error: "max_spins", student };
            }
            await setCurrentStudentId(existingFaculty.id);
            setCurrentStudentState(student);
            return { success: true, student };
          }
          // No match — create new faculty record with auto-generated student_id
          const facStudentId = generateId("FAC");
          const dbRow = await insertStudent({
            name,
            student_id: facStudentId,
            email,
            phone,
            faculty,
            department,
            participant_type: "faculty",
            score: 0,
            spins_used: 0,
            max_spins: maxTriesDefault,
            status: "active",
            spin_history: [],
            reward_claimed: false,
            awarded_prize: null,
            pending_score: null,
            pending_feedback: null,
          });
          const student = dbStudentToStudent(dbRow);
          await setCurrentStudentId(dbRow.id);
          setCurrentStudentState(student);
          setStudents((prev) => {
            if (prev.some((s) => s.id === student.id)) return prev;
            return [...prev, student];
          });
          return { success: true, student };
        }

        // Student (CECOS) mode: look up by studentId (University ID)
        // Others / guest-student mode: look up by email first
        let existing = null;
        if (registrationType === "others") {
          existing = await fetchStudentByEmail(email);
        } else {
          existing = await fetchStudentByStudentId(studentId);
        }
        if (existing) {
          if (existing.name.toLowerCase() !== name.toLowerCase()) {
            return { success: false, error: "name_mismatch" };
          }
          // Always update faculty, department, and phone so that re-registration
          // reflects the department the person just selected on the form.
          const updatedRow = await updateStudentDb(existing.id, {
            faculty,
            department,
            phone,
          });
          const student = dbStudentToStudent(updatedRow);
          // CRITICAL: sync local students array BEFORE setCurrentStudentId fires
          // so the session-realtime handler finds the correct department.
          setStudents((prev) =>
            prev.map((s) => (s.id === student.id ? student : s)),
          );
          if (existing.spins_used >= existing.max_spins) {
            await setCurrentStudentId(existing.id);
            setCurrentStudentState(student);
            return { success: false, error: "max_spins", student };
          }
          await setCurrentStudentId(existing.id);
          setCurrentStudentState(student);
          return { success: true, student };
        }
        // New participant — generate proper prefixed ID for guests
        let finalStudentId = studentId;
        if (registrationType === "others") {
          finalStudentId =
            guestSubType === "student"
              ? generateId("STD")
              : generateId("GST");
        }
        // New student / others
        const dbRow = await insertStudent({
          name,
          student_id: finalStudentId,
          email,
          phone,
          faculty,
          department,
          participant_type: registrationType,
          score: 0,
          spins_used: 0,
          max_spins: maxTriesDefault,
          status: "active",
          spin_history: [],
          reward_claimed: false,
          awarded_prize: null,
          pending_score: null,
          pending_feedback: null,
        });
        const student = dbStudentToStudent(dbRow);
        // Add to local array BEFORE setCurrentStudentId so the session realtime
        // DB fetch can upsert it correctly even if realtime fires immediately.
        setStudents((prev) => {
          if (prev.some((s) => s.id === student.id)) return prev;
          return [...prev, student];
        });
        await setCurrentStudentId(dbRow.id);
        setCurrentStudentState(student);
        return { success: true, student };
      } catch (err) {
        console.error("registerStudent error:", err);
        return { success: false, error: "server_error" };
      }
    },
    [maxTriesDefault],
  );

  const setCurrentStudent = useCallback((student: Student | null) => {
    setCurrentStudentState(student);
    setCurrentStudentId(student?.id ?? null).catch(console.error);
  }, []);

  const recordSpin = useCallback(
    (studentId: string, segmentId: string) => {
      // Find the student to compute new values
      setStudents((prev) => {
        const target = prev.find(
          (s) => s.id === studentId || s.studentId === studentId,
        );
        if (!target) return prev;

        const newSpinsUsed = target.spinsUsed + 1;
        const newStatus =
          newSpinsUsed >= target.maxSpins ? "locked" : target.status;
        const segName =
          segments.find((seg) => seg.id === segmentId)?.name || "";

        // Fire async DB updates (don't block UI)
        updateStudentDb(target.id, {
          spins_used: newSpinsUsed,
          status: newStatus,
          spin_history: [...target.spinHistory, segmentId],
          reward_claimed: false,
          pending_score: null,
          pending_feedback: null,
        }).catch(console.error);

        // Single atomic update: sets spin result AND clears current_student_id together
        setSpinResultAndClearStudentDb(segmentId, segName).catch(console.error);

        // Optimistic local update
        const updated: Student = {
          ...target,
          spinsUsed: newSpinsUsed,
          status: newStatus as Student["status"],
          spinHistory: [...target.spinHistory, segmentId],
          rewardClaimed: false,
        };
        return prev.map((s) => (s.id === target.id ? updated : s));
      });
    },
    [segments],
  );

  const updateScore = useCallback((studentId: string, points: number) => {
    setStudents((prev) => {
      const target = prev.find(
        (s) => s.id === studentId || s.studentId === studentId,
      );
      if (!target) return prev;

      updateStudentDb(target.id, { score: target.score + points }).catch(
        console.error,
      );

      const updated = { ...target, score: target.score + points };
      setCurrentStudentState((curr) =>
        curr && curr.id === target.id ? updated : curr,
      );
      return prev.map((s) => (s.id === target.id ? updated : s));
    });
  }, []);

  // Records which category was spun and whether the answer was correct/wrong to spin_history in DB
  const recordQuestionResult = useCallback(
    (studentId: string, category: string, correct: boolean) => {
      setStudents((prev) => {
        const target = prev.find(
          (s) => s.id === studentId || s.studentId === studentId,
        );
        if (!target) return prev;
        const entry = `${category}:${correct ? "correct" : "wrong"}`;
        const newHistory = [...(target.spinHistory ?? []), entry];
        updateStudentDb(target.id, { spin_history: newHistory }).catch(
          console.error,
        );
        const updated = { ...target, spinHistory: newHistory };
        setCurrentStudentState((curr) =>
          curr && curr.id === target.id ? updated : curr,
        );
        return prev.map((s) => (s.id === target.id ? updated : s));
      });
    },
    [],
  );

  const markRewardClaimed = useCallback((studentId: string) => {
    setStudents((prev) => {
      const target = prev.find(
        (s) => s.id === studentId || s.studentId === studentId,
      );
      if (!target) return prev;

      updateStudentDb(target.id, { reward_claimed: true }).catch(console.error);

      const updated = { ...target, rewardClaimed: true };
      setCurrentStudentState((curr) =>
        curr && curr.id === target.id ? updated : curr,
      );
      return prev.map((s) => (s.id === target.id ? updated : s));
    });
  }, []);

  const submitAdminScore = useCallback(
    (studentId: string, score: number, feedback?: string) => {
      setStudents((prev) => {
        const target = prev.find(
          (s) => s.id === studentId || s.studentId === studentId,
        );
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
          curr && curr.id === target.id ? updated : curr,
        );
        return prev.map((s) => (s.id === target.id ? updated : s));
      });
    },
    [],
  );

  const resetSessionData = useCallback(() => {
    setStudents([]);
    setCurrentStudentState(null);
    setLastSpinResult(null);
    // Async DB cleanup
    (async () => {
      try {
        await resetSession();
        await deleteAllStudents();
      } catch (err) {
        console.error("resetSessionData error:", err);
      }
    })();
  }, []);

  const clearSpinResult = useCallback(() => {
    setLastSpinResult(null);
    clearSpinResultDb().catch(console.error);
  }, []);

  const banStudent = useCallback(
    async (studentId: string): Promise<void> => {
      const target = students.find(
        (s) => s.id === studentId || s.studentId === studentId,
      );
      if (!target) return;
      await updateStudentDb(target.id, { status: "banned" });
      setStudents((prev) =>
        prev.map((s) =>
          s.id === target.id ? { ...s, status: "banned" as const } : s,
        ),
      );
    },
    [students],
  );

  const unbanStudent = useCallback(
    async (studentId: string): Promise<void> => {
      const target = students.find(
        (s) => s.id === studentId || s.studentId === studentId,
      );
      if (!target) return;
      const newStatus =
        target.spinsUsed >= target.maxSpins ? "locked" : "active";
      await updateStudentDb(target.id, { status: newStatus });
      setStudents((prev) =>
        prev.map((s) =>
          s.id === target.id
            ? { ...s, status: newStatus as Student["status"] }
            : s,
        ),
      );
    },
    [students],
  );

  const editTries = useCallback((studentId: string, newMaxSpins: number) => {
    setStudents((prev) => {
      const target = prev.find(
        (s) => s.id === studentId || s.studentId === studentId,
      );
      if (!target) return prev;

      const newStatus =
        target.status === "banned"
          ? "banned"
          : target.spinsUsed >= newMaxSpins
            ? "locked"
            : "active";

      updateStudentDb(target.id, {
        max_spins: newMaxSpins,
        status: newStatus,
      }).catch(console.error);

      const updated = {
        ...target,
        maxSpins: newMaxSpins,
        status: newStatus as Student["status"],
      };
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

  const claimAward = useCallback(
    async (studentId: string): Promise<ClaimAwardResult | null> => {
      const result = await claimRandomAward(studentId);
      if (result?.awardName) {
        // Update local student state with the awarded prize
        setStudents((prev) =>
          prev.map((s) =>
            s.id === studentId ? { ...s, awardedPrize: result.awardName } : s,
          ),
        );
        setCurrentStudentState((prev) =>
          prev && prev.id === studentId
            ? { ...prev, awardedPrize: result.awardName }
            : prev,
        );
        // Decrement local award count (only for new awards)
        if (!result.alreadyAwarded) {
          setAwards((prev) =>
            prev.map((a) =>
              a.name === result.awardName
                ? {
                    ...a,
                    remainingQuantity: Math.max(0, a.remainingQuantity - 1),
                  }
                : a,
            ),
          );
        }
      }
      return result;
    },
    [],
  );

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
      })),
    );
  }, []);

  const refreshAwards = useCallback(async () => {
    const dbAwards = await fetchAwardsDb();
    setAwards(dbAwards.map(dbAwardToAward));
  }, []);

  const updateMaxTriesDefault = useCallback(async (value: number) => {
    await updateSettings({ max_tries_default: value });
    setMaxTriesDefault(value);
  }, []);

  const updateRewardPoints = useCallback(async (value: number) => {
    await updateSettings({ reward_points: value });
    setRewardPoints(value);
  }, []);

  const updateEventName = useCallback(async (value: string) => {
    await updateSettings({ event_name: value });
    setEventName(value);
  }, []);

  return (
    <AppContext.Provider
      value={{
        students,
        currentStudent,
        segments,
        questions,
        awards,
        maxTriesDefault,
        rewardPoints,
        eventName,
        registerStudent,
        setCurrentStudent,
        recordSpin,
        updateScore,
        recordQuestionResult,
        resetSessionData,
        markRewardClaimed,
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
        updateMaxTriesDefault,
        updateRewardPoints,
        updateEventName,
        submitAdminScore,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
