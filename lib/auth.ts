import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "truthscout_user_id";

/**
 * Returns the current demo user's ID from localStorage.
 * On first visit, fetches all seed usernames from `profiles`, picks one at
 * random, and persists its ID — no login required for the MVP.
 */
export async function getCurrentUserId(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("getCurrentUserId can only be called in the browser");
  }

  const existingUserId = window.localStorage.getItem(STORAGE_KEY);
  if (existingUserId) {
    return existingUserId;
  }

  try {
    const supabase = createClient();
    const { data: profiles, error } = await supabase.from("profiles").select("id");

    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      throw new Error("No seed users found in the profiles table");
    }

    const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];
    window.localStorage.setItem(STORAGE_KEY, randomProfile.id);
    return randomProfile.id;
  } catch (err) {
    throw new Error(
      `Failed to assign a demo user: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }
}

/** Returns the stored user ID without triggering random assignment, or null. */
export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

/** Clears the demo user assignment (useful for testing different reputations). */
export function clearCurrentUser(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
