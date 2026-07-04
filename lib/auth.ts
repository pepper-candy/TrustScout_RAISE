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
 * Returns the current browser's profile, persisted in localStorage.
 * On first visit (or if the stored ID no longer exists), this browser is
 * treated as a brand-new person: `/api/profile?register=true` creates a
 * fresh profile row with a randomly-lettered username (just for the avatar
 * initial — the name itself is meaningless) and its ID is persisted so every
 * vote/post this browser makes afterwards is tied to that same, valid user.
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
      // Stored ID is stale (e.g. seed data reset) — fall through to register a new one.
    }
  }

  const profile = await fetchProfile("register=true");
  window.localStorage.setItem(STORAGE_KEY, profile.id);
  return profile;
}

/** Convenience wrapper for callers that only need the ID, not the full profile. */
export async function getCurrentUserId(): Promise<string> {
  const profile = await getCurrentUserProfile();
  return profile.id;
}

/**
 * Reassigns the browser to a different random EXISTING profile (excluding
 * the current one where possible). Not currently wired to any visible UI
 * control (per product decision, "shuffle user" is confusing since every
 * browser now gets its own real identity on first visit) — kept here only
 * so it's easy to re-enable for debugging reputation/weight differences.
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
