import { supabase } from "../lib/supabase";

/**
 * Sends the EduWheel thank-you email to a participant via the
 * send-thankyou-email Supabase Edge Function (which proxies to Resend).
 *
 * Fire-and-forget: this function logs failures but never throws, so it
 * cannot block or break any UI transition.
 */
export async function sendThankYouEmail(
  name: string,
  email: string,
): Promise<void> {
  if (!name || !email) return;

  try {
    const { error } = await supabase.functions.invoke("send-thankyou-email", {
      body: { name, email },
    });

    if (error) {
      console.error("[EduWheel] Failed to send thank-you email:", error);
    }
  } catch (err) {
    console.error("[EduWheel] Unexpected error sending thank-you email:", err);
  }
}
