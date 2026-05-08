import { supabase } from "../lib/supabase";
import type { DbQuestion } from "../lib/database.types";

export async function fetchQuestions(): Promise<DbQuestion[]> {
  const PAGE_SIZE = 1000;
  const all: DbQuestion[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return all;
}

export async function deleteAllQuestions(): Promise<void> {
  const { error } = await supabase
    .from("questions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows
  if (error)
    throw new Error(error.message || error.details || JSON.stringify(error));
}

export async function deleteQuestionsByDepartment(
  department: string,
): Promise<void> {
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("department", department);
  if (error)
    throw new Error(error.message || error.details || JSON.stringify(error));
}

export async function deleteNullDepartmentQuestions(): Promise<void> {
  const { error } = await supabase
    .from("questions")
    .delete()
    .is("department", null);
  if (error)
    throw new Error(error.message || error.details || JSON.stringify(error));
}

export async function fetchQuestionsByDepartments(
  departments: string[],
): Promise<DbQuestion[]> {
  if (departments.length === 0) return [];
  const PAGE_SIZE = 1000;
  const all: DbQuestion[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .in("department", departments)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return all;
}

export async function insertQuestions(
  questions: Omit<DbQuestion, "id">[],
): Promise<void> {
  // Supabase has a row limit per insert; batch in chunks of 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("questions").insert(batch);
    if (error)
      throw new Error(error.message || error.details || JSON.stringify(error));
  }
}

/**
 * Strict validated import: validates department and category against active DB
 * records before inserting. Throws with a user-facing error message on mismatch.
 */
export async function validateAndInsertQuestions(
  questions: Omit<DbQuestion, "id">[],
  activeDepartmentNames: string[],
  activeCategoryNames: string[],
): Promise<void> {
  const deptSet = new Set(activeDepartmentNames.map((d) => d.trim().toLowerCase()));
  const catSet = new Set(activeCategoryNames.map((c) => c.trim().toLowerCase()));

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (q.department !== null) {
      if (!deptSet.has(q.department.trim().toLowerCase())) {
        throw new Error(
          `Row ${i + 1}: Department "${q.department}" does not match any active department. ` +
            `Please check the Departments list.`,
        );
      }
    }
    if (!catSet.has(q.category.trim().toLowerCase())) {
      throw new Error(
        `Row ${i + 1}: Category "${q.category}" does not match any active category. ` +
          `Please check the Categories tab.`,
      );
    }
  }

  await insertQuestions(questions);
}
