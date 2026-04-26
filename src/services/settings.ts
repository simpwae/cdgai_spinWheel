import { supabase } from "../lib/supabase";
import type { DbSettings } from "../lib/database.types";

export async function fetchSettings(): Promise<DbSettings | null> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", "singleton")
    .single();
  if (error) {
    // Row may not exist in older setups – return null silently
    console.warn("Could not load settings:", error.message);
    return null;
  }
  return data as DbSettings;
}

export async function updateSettings(
  patch: Partial<Omit<DbSettings, "id">>,
): Promise<void> {
  const { error } = await supabase
    .from("settings")
    .upsert({ id: "singleton", ...patch }, { onConflict: "id" });
  if (error) throw error;
}
