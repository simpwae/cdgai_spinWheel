import { supabase } from "../lib/supabase";
import type { DbAward } from "../lib/database.types";

export async function fetchAwards(): Promise<DbAward[]> {
  const { data, error } = await supabase
    .from("awards")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function insertAward(
  name: string,
  quantity: number,
): Promise<DbAward> {
  const { data, error } = await supabase
    .from("awards")
    .insert({ name, total_quantity: quantity, remaining_quantity: quantity })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAward(id: string): Promise<void> {
  const { error } = await supabase.from("awards").delete().eq("id", id);
  if (error) throw error;
}

// Client-side fallback used when the claim_random_award RPC is not configured.
// Not atomic — suitable for low-concurrency booth usage.
async function claimAwardClientSide(studentId: string): Promise<string | null> {
  // 1. Fetch all awards with stock remaining
  const { data: available, error: fetchErr } = await supabase
    .from("awards")
    .select("id, name, remaining_quantity")
    .gt("remaining_quantity", 0);
  if (fetchErr || !available || available.length === 0) return null;

  // 2. Pick a random one
  const award = available[Math.floor(Math.random() * available.length)] as {
    id: string;
    name: string;
    remaining_quantity: number;
  };

  // 3. Decrement remaining_quantity (only if still > 0 to guard basic races)
  const { error: decrErr } = await supabase
    .from("awards")
    .update({ remaining_quantity: award.remaining_quantity - 1 })
    .eq("id", award.id)
    .gt("remaining_quantity", 0);
  if (decrErr) return null;

  // 4. Store the prize on the student (only if not already awarded)
  const { error: studentErr } = await supabase
    .from("students")
    .update({ awarded_prize: award.name })
    .eq("id", studentId)
    .is("awarded_prize", null);
  if (studentErr) return null;

  return award.name;
}

export async function claimRandomAward(
  studentId: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("claim_random_award", {
      p_student_id: studentId,
    });
    if (error) throw error;
    return data as string | null;
  } catch {
    // RPC not configured in this Supabase project — fall back to client-side claim.
    return claimAwardClientSide(studentId);
  }
}
