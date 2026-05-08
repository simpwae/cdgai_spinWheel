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
  DbDepartment,
  DbCategory,
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
import { fetchQuestions, fetchQuestionsByDepartments } from "../services/questions";
import {
  fetchDepartments,
  fetchActiveDepartments,
  insertDepartment as insertDepartmentDb,
  updateDepartment as updateDepartmentDb,
  toggleDepartmentActive as toggleDepartmentActiveDb,
  softDeleteDepartment as softDeleteDepartmentDb,
  checkDepartmentDeletionSafety,
  type DepartmentSafetyInfo,
} from "../services/departments";
import {
  fetchCategories,
  fetchActiveCategories,
  insertCategory as insertCategoryDb,
  updateCategory as updateCategoryDb,
  toggleCategoryActive as toggleCategoryActiveDb,
  softDeleteCategory as softDeleteCategoryDb,
  checkCategoryDeletionSafety,
  type CategorySafetyInfo,
} from "../services/categories";
export type { DepartmentSafetyInfo, CategorySafetyInfo };
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

// Built-in canonical department names (the 12 shipped departments)
export const KNOWN_DEPARTMENTS = [
  "Civil",
  "Mechanical",
  "Electrical",
  "Architecture",
  "Pharmacy",
  "Bioscience",
  "Allied Health Sciences",
  "Nursing",
  "Management of Science",
  "Basic Science & Humanities",
  "Computer Sciences",
  "Software Engineering",
] as const;

// Department is now a string to accommodate dynamic custom departments
export type Department = string;

export interface CustomDepartment {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

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
  spinsUsed: number;
  maxSpins: number;
  status: "active" | "locked" | "banned";
  spinHistory: string[];
  rewardClaimed?: boolean;
  awardedPrize?: string | null;
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
  department?: string;
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
  recordSpin: (studentId: string, segmentId: string) => void;
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
  availableCategories: string[];
  /** @deprecated Use categories instead — kept for SettingsTab CSV upload compat */
  addAvailableCategory: (name: string) => Promise<void>;
  removeAvailableCategory: (name: string) => Promise<void>;
  renameAvailableCategory: (oldName: string, newName: string) => Promise<void>;
  /** Full Category objects from the categories table */
  categories: Category[];
  refreshCategories: () => Promise<void>;
  addCategory: (name: string) => Promise<Category>;
  updateCategoryItem: (id: string, updates: Partial<Pick<Category, 'name' | 'isActive'>>) => Promise<void>;
  removeCategoryItem: (id: string) => Promise<void>;
  toggleCategoryActiveItem: (id: string, isActive: boolean) => Promise<void>;
  checkCategoryDeletion: (categoryName: string) => Promise<CategorySafetyInfo>;
  customDepartments: CustomDepartment[];
  refreshCustomDepartments: () => Promise<void>;
  addCustomDepartment: (name: string, _questionCategories?: string[]) => Promise<CustomDepartment>;
  updateCustomDepartment: (id: string, updates: Partial<Pick<CustomDepartment, 'name' | 'isActive'>>) => Promise<void>;
  removeCustomDepartment: (id: string) => Promise<void>;
  toggleDepartmentActiveItem: (id: string, isActive: boolean) => Promise<void>;
  checkDepartmentDeletion: (departmentName: string) => Promise<DepartmentSafetyInfo>;
  getDepartmentsForFaculty: (faculty: string) => string[];
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
    spinsUsed: row.spins_used,
    maxSpins: row.max_spins,
    status: row.status as Student["status"],
    spinHistory: row.spin_history ?? [],
    rewardClaimed: row.reward_claimed,
    awardedPrize: row.awarded_prize ?? null,
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

const DEFAULT_QUESTION_CATEGORIES = ['Question Bank', 'IQ Games', 'Career Questions'];

function dbDepartmentToCustomDepartment(row: DbDepartment): CustomDepartment {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function dbCategoryToCategory(row: DbCategory): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
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
  const [eventName, setEventName] = useState("EduWheel");
  const [availableCategories, setAvailableCategories] = useState<string[]>(DEFAULT_QUESTION_CATEGORIES);
  const [customDepartments, setCustomDepartments] = useState<CustomDepartment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Track the last spin timestamp we've already processed so we don't re-fire
  const lastProcessedSpinTs = useRef<number | null>(null);

  // --- Initial data load ---
  useEffect(() => {
    const load = async () => {
      try {
        const [dbStudents, dbSegments, dbSession, dbAwards, dbSettings, dbDepts, dbCats] =
          await Promise.all([
            fetchStudents(),
            fetchSegments(),
            fetchSession(),
            fetchAwardsDb(),
            fetchSettings(),
            fetchDepartments(),
            fetchCategories(),
          ]);
        setStudents(dbStudents.map(dbStudentToStudent));
        setSegments(
          dbSegments.map((s) => ({ id: s.id, name: s.name, color: s.color })),
        );

        // Load all departments (active + inactive) for admin management
        const mapped = dbDepts.map(dbDepartmentToCustomDepartment);
        setCustomDepartments(mapped);

        // Load categories from DB — this becomes the primary source of truth
        const mappedCats = dbCats.map(dbCategoryToCategory);
        setCategories(mappedCats);
        // Sync availableCategories string[] for backward-compat with SettingsTab CSV upload
        const activeCatNames = mappedCats.filter((c) => c.isActive && !c.deletedAt).map((c) => c.name);
        if (activeCatNames.length > 0) {
          setAvailableCategories(activeCatNames);
        }

        // Pre-fetch questions for active departments from Supabase
        const activeDeptNames = mapped
          .filter((d) => d.isActive && !d.deletedAt)
          .map((d) => d.name);
        if (activeDeptNames.length > 0) {
          try {
            const dbQs = await fetchQuestionsByDepartments(activeDeptNames);
            setQuestions(
              dbQs.map((q) => ({
                id: q.id,
                category: q.category,
                department: q.department ?? undefined,
                text: q.text,
                options: q.options,
                correctAnswerIndex: q.correct_answer_index,
              })),
            );
          } catch (err) {
            console.error("Failed to load department questions:", err);
          }
        }

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
            // still have access to the student.
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

  // --- Realtime subscription: departments table ---
  useEffect(() => {
    const channel = supabase
      .channel("departments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "departments" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newDept = dbDepartmentToCustomDepartment(
              payload.new as DbDepartment,
            );
            setCustomDepartments((prev) => {
              if (prev.some((d) => d.id === newDept.id)) return prev;
              return [...prev, newDept];
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = dbDepartmentToCustomDepartment(
              payload.new as DbDepartment,
            );
            setCustomDepartments((prev) =>
              prev.map((d) => (d.id === updated.id ? updated : d)),
            );
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setCustomDepartments((prev) =>
              prev.filter((d) => d.id !== oldId),
            );
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- Realtime subscription: categories table ---
  useEffect(() => {
    const channel = supabase
      .channel("categories-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newCat = dbCategoryToCategory(payload.new as DbCategory);
            setCategories((prev) => {
              if (prev.some((c) => c.id === newCat.id)) return prev;
              return [...prev, newCat];
            });
            setAvailableCategories((prev) => {
              if (newCat.isActive && !prev.includes(newCat.name)) {
                return [...prev, newCat.name];
              }
              return prev;
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = dbCategoryToCategory(payload.new as DbCategory);
            setCategories((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c)),
            );
            // Sync availableCategories string[] mirror
            setCategories((cats) => {
              const active = cats
                .filter((c) => c.isActive && !c.deletedAt)
                .map((c) => c.name);
              setAvailableCategories(active.length > 0 ? active : DEFAULT_QUESTION_CATEGORIES);
              return cats;
            });
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setCategories((prev) => prev.filter((c) => c.id !== oldId));
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
            spins_used: 0,
            max_spins: maxTriesDefault,
            status: "active",
            spin_history: [],
            reward_claimed: false,
            awarded_prize: null,
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
          ...(registrationType === "others"
            ? { guest_type: guestSubType, is_guest: true }
            : {}),
          spins_used: 0,
          max_spins: maxTriesDefault,
          status: "active",
          spin_history: [],
          reward_claimed: false,
          awarded_prize: null,
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
        department: q.department ?? undefined,
        text: q.text,
        options: q.options,
        correctAnswerIndex: q.correct_answer_index,
      })),
    );
  }, []);

  const refreshCustomDepartments = useCallback(async () => {
    const dbDepts = await fetchDepartments();
    const mapped = dbDepts.map(dbDepartmentToCustomDepartment);
    setCustomDepartments(mapped);
    // Re-fetch questions for all currently active departments
    const activeNames = mapped.filter((d) => d.isActive && !d.deletedAt).map((d) => d.name);
    if (activeNames.length > 0) {
      try {
        const dbQs = await fetchQuestionsByDepartments(activeNames);
        setQuestions(
          dbQs.map((q) => ({
            id: q.id,
            category: q.category,
            department: q.department ?? undefined,
            text: q.text,
            options: q.options,
            correctAnswerIndex: q.correct_answer_index,
          })),
        );
      } catch (err) {
        console.error("Failed to refresh dept questions:", err);
      }
    } else {
      setQuestions([]);
    }
  }, []);

  const addCustomDepartment = useCallback(
    async (name: string, _questionCategories?: string[]): Promise<CustomDepartment> => {
      const row = await insertDepartmentDb(name);
      const dept = dbDepartmentToCustomDepartment(row);
      setCustomDepartments((prev) => {
        if (prev.some((d) => d.id === dept.id)) return prev;
        return [...prev, dept];
      });
      return dept;
    },
    [],
  );

  const updateCustomDepartment = useCallback(
    async (
      id: string,
      updates: Partial<Pick<CustomDepartment, "name" | "isActive">>,
    ): Promise<void> => {
      const row = await updateDepartmentDb(id, {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.isActive !== undefined && { is_active: updates.isActive }),
      });
      const updated = dbDepartmentToCustomDepartment(row);
      setCustomDepartments((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d)),
      );
    },
    [],
  );

  const removeCustomDepartment = useCallback(async (id: string): Promise<void> => {
    await softDeleteDepartmentDb(id);
    setCustomDepartments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const toggleDepartmentActiveItem = useCallback(async (id: string, isActive: boolean): Promise<void> => {
    const row = await toggleDepartmentActiveDb(id, isActive);
    const updated = dbDepartmentToCustomDepartment(row);
    setCustomDepartments((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d)),
    );
  }, []);

  const checkDepartmentDeletion = useCallback(
    (departmentName: string) => checkDepartmentDeletionSafety(departmentName),
    [],
  );

  const getDepartmentsForFaculty = useCallback(
    (faculty: string): string[] => {
      // Primary: DB departments (active, non-deleted)
      const fromDb = customDepartments
        .filter((d) => d.isActive && !d.deletedAt)
        .map((d) => d.name);
      if (fromDb.length > 0) return fromDb;
      // Fallback: hardcoded constants (if DB is empty or loading)
      return [...((FACULTY_DEPARTMENTS as Record<string, readonly string[]>)[faculty] ?? [])];
    },
    [customDepartments],
  );

  // --- Category methods ---

  const refreshCategories = useCallback(async () => {
    const dbCats = await fetchCategories();
    const mapped = dbCats.map(dbCategoryToCategory);
    setCategories(mapped);
    const active = mapped.filter((c) => c.isActive && !c.deletedAt).map((c) => c.name);
    setAvailableCategories(active.length > 0 ? active : DEFAULT_QUESTION_CATEGORIES);
  }, []);

  const addCategory = useCallback(async (name: string): Promise<Category> => {
    const row = await insertCategoryDb(name);
    const cat = dbCategoryToCategory(row);
    setCategories((prev) => {
      if (prev.some((c) => c.id === cat.id)) return prev;
      return [...prev, cat];
    });
    setAvailableCategories((prev) => {
      if (!prev.includes(cat.name)) return [...prev, cat.name];
      return prev;
    });
    return cat;
  }, []);

  const updateCategoryItem = useCallback(async (id: string, updates: Partial<Pick<Category, 'name' | 'isActive'>>): Promise<void> => {
    const row = await updateCategoryDb(id, {
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.isActive !== undefined && { is_active: updates.isActive }),
    });
    const updated = dbCategoryToCategory(row);
    setCategories((prev) => {
      const next = prev.map((c) => (c.id === updated.id ? updated : c));
      const active = next.filter((c) => c.isActive && !c.deletedAt).map((c) => c.name);
      setAvailableCategories(active.length > 0 ? active : DEFAULT_QUESTION_CATEGORIES);
      return next;
    });
  }, []);

  const removeCategoryItem = useCallback(async (id: string): Promise<void> => {
    await softDeleteCategoryDb(id);
    setCategories((prev) => {
      const next = prev.filter((c) => c.id !== id);
      const active = next.filter((c) => c.isActive && !c.deletedAt).map((c) => c.name);
      setAvailableCategories(active.length > 0 ? active : DEFAULT_QUESTION_CATEGORIES);
      return next;
    });
  }, []);

  const toggleCategoryActiveItem = useCallback(async (id: string, isActive: boolean): Promise<void> => {
    const row = await toggleCategoryActiveDb(id, isActive);
    const updated = dbCategoryToCategory(row);
    setCategories((prev) => {
      const next = prev.map((c) => (c.id === updated.id ? updated : c));
      const active = next.filter((c) => c.isActive && !c.deletedAt).map((c) => c.name);
      setAvailableCategories(active.length > 0 ? active : DEFAULT_QUESTION_CATEGORIES);
      return next;
    });
  }, []);

  const checkCategoryDeletion = useCallback(
    (categoryName: string) => checkCategoryDeletionSafety(categoryName),
    [],
  );

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

  // Legacy string-based category methods (kept for SettingsTab CSV backward compat)
  // They now delegate to the DB-backed category service.
  const addAvailableCategory = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Check not already in categories
    const exists = categories.some(
      (c) => !c.deletedAt && c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!exists) {
      await addCategory(trimmed);
    }
  }, [categories, addCategory]);

  const removeAvailableCategory = useCallback(async (name: string) => {
    const cat = categories.find((c) => !c.deletedAt && c.name === name);
    if (cat) await removeCategoryItem(cat.id);
  }, [categories, removeCategoryItem]);

  const renameAvailableCategory = useCallback(async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const cat = categories.find((c) => !c.deletedAt && c.name === oldName);
    if (cat) await updateCategoryItem(cat.id, { name: trimmed });
  }, [categories, updateCategoryItem]);

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
        availableCategories,
        addAvailableCategory,
        removeAvailableCategory,
        renameAvailableCategory,
        categories,
        refreshCategories,
        addCategory,
        updateCategoryItem,
        removeCategoryItem,
        toggleCategoryActiveItem,
        checkCategoryDeletion,
        customDepartments,
        refreshCustomDepartments,
        addCustomDepartment,
        updateCustomDepartment,
        removeCustomDepartment,
        toggleDepartmentActiveItem,
        checkDepartmentDeletion,
        getDepartmentsForFaculty,
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
