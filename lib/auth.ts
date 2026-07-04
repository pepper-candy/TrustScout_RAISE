import type { ProfileRow } from "@/types/database";

const STORAGE_KEY = "truthscout_user_id";

export type CurrentUserProfile = Pick<ProfileRow, "id" | "username" | "accuracy_score">;

/**
 * All profile lookups go through `/api/profile` (service-role client on the
 * server) rather than querying Supabase directly from the browser — the
 * anon key has no grants on any table, so a client-side `.from("profiles")`
 * call would fail with "permission denied for table profiles".
 */
async function fetchProfile(query: string): Promise<CurrentUserProfile> {
  const response = await fetch(`/api/profile?${query}`);
  if (!response.ok) {
    const { error } = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(error ?? "Failed to fetch profile");
  }

  const { profile } = (await response.json()) as { profile: CurrentUserProfile };
  return profile;
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

/**
 * Returns the current demo user's full profile from localStorage.
 * On first visit (or if the stored ID no longer exists), picks a random
 * seed user via `/api/profile?random=true` and persists its ID — no login
 * required for the MVP.
 */
export async function getCurrentUserProfile(): Promise<CurrentUserProfile> {
  if (typeof window === "undefined") {
    throw new Error("getCurrentUserProfile can only be called in the browser");
  }

  const existingUserId = getStoredUserId();
  if (existingUserId) {
    try {
      return await fetchProfile(`id=${existingUserId}`);
    } catch {
      // Stored ID is stale (e.g. seed data reset) — fall through to reassign.
    }
  }

  const profile = await fetchProfile("random=true");
  window.localStorage.setItem(STORAGE_KEY, profile.id);
  return profile;
}

/** Convenience wrapper for callers that only need the ID, not the full profile. */
export async function getCurrentUserId(): Promise<string> {
  const profile = await getCurrentUserProfile();
  return profile.id;
}

/**
 * Reassigns the browser to a different random demo user (excluding the
 * current one where possible) — used by the "shuffle user" control so the
 * demo can showcase how different reputations (weights) affect voting.
 */
export async function switchToRandomUser(): Promise<CurrentUserProfile> {
  if (typeof window === "undefined") {
    throw new Error("switchToRandomUser can only be called in the browser");
  }

  const currentUserId = getStoredUserId();
  const query = currentUserId ? `random=true&exclude=${currentUserId}` : "random=true";
  const profile = await fetchProfile(query);

  window.localStorage.setItem(STORAGE_KEY, profile.id);
  return profile;
}
