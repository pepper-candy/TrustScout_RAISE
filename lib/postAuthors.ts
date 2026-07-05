import type { PostRow, ProfileRow } from "@/types/database";

const POST_AUTHORS_STORAGE_KEY = "trustscout_post_authors";

type ProfileUsername = Pick<ProfileRow, "id" | "username">;

/** Stable demo author for seed posts when `posts.user_id` is not stored yet. */
export function assignDemoAuthor(postId: string, profiles: ProfileUsername[]): string {
  if (profiles.length === 0) return "guest";
  let hash = 0;
  for (let i = 0; i < postId.length; i++) {
    hash = (hash * 31 + postId.charCodeAt(i)) >>> 0;
  }
  return profiles[hash % profiles.length].username;
}

export function resolveAuthorUsername(
  post: PostRow,
  profiles: ProfileUsername[],
  usernameById: Map<string, string>
): string {
  if (post.user_id) {
    const username = usernameById.get(post.user_id);
    if (username) return username;
  }
  return assignDemoAuthor(post.id, profiles);
}

/** Client-only: remember who authored a post when the DB has no `user_id` column. */
export function rememberPostAuthor(postId: string, username: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(POST_AUTHORS_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[postId] = username;
    window.localStorage.setItem(POST_AUTHORS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore quota / private-mode errors — feed still works with demo authors.
  }
}

export function getRememberedPostAuthor(postId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(POST_AUTHORS_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[postId] ?? null;
  } catch {
    return null;
  }
}

/** Prefer this browser's remembered author (your posts), else the API-assigned username. */
export function mergeRememberedAuthor(post: { id: string; author_username: string }): string {
  return getRememberedPostAuthor(post.id) ?? post.author_username;
}
