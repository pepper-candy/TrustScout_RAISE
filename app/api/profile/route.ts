import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateRandomUsername } from "@/lib/randomUsername";
import type { ProfileRow } from "@/types/database";

/** Postgres unique_violation error code — thrown if a generated username collides with an existing one. */
const UNIQUE_VIOLATION = "23505";
const MAX_USERNAME_ATTEMPTS = 5;

const querySchema = z.object({
  id: z.uuid().optional(),
  random: z.literal("true").optional(),
  register: z.literal("true").optional(),
  exclude: z.uuid().optional(),
});

type PublicProfile = Pick<ProfileRow, "id" | "username" | "accuracy_score">;

/**
 * GET /api/profile
 * Looks up a single demo-user profile — either by `id`, a random existing
 * one (kept around for debugging the old "shuffle user" control, currently
 * hidden from the UI), or `register=true` to create and return a brand-new
 * profile for a first-time visitor. Runs through the service-role client
 * because the anon key has no grants on any table (posts/votes/profiles) —
 * the browser must never query Supabase directly, only through Route Handlers.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      id: searchParams.get("id") ?? undefined,
      random: searchParams.get("random") ?? undefined,
      register: searchParams.get("register") ?? undefined,
      exclude: searchParams.get("exclude") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const { id, random, register, exclude } = parsed.data;
    const supabase = createServiceRoleClient();

    if (register) {
      for (let attempt = 0; attempt < MAX_USERNAME_ATTEMPTS; attempt++) {
        const username = generateRandomUsername();
        const { data, error } = await supabase
          .from("profiles")
          .insert({ username })
          .select("id, username, accuracy_score")
          .single();

        if (!error && data) {
          return NextResponse.json({ profile: data satisfies PublicProfile }, { status: 201 });
        }

        if (error && error.code !== UNIQUE_VIOLATION) {
          throw error;
        }
        // Username collision (unlikely) — loop and try a freshly generated one.
      }

      return NextResponse.json({ error: "Failed to register a new user" }, { status: 500 });
    }

    if (id) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, accuracy_score")
        .eq("id", id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      return NextResponse.json({ profile: data satisfies PublicProfile }, { status: 200 });
    }

    if (random) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, accuracy_score");

      if (error) throw error;
      if (!data || data.length === 0) {
        return NextResponse.json({ error: "No seed users found" }, { status: 404 });
      }

      const candidates = exclude ? data.filter((profile) => profile.id !== exclude) : data;
      const pool = candidates.length > 0 ? candidates : data;
      const randomProfile = pool[Math.floor(Math.random() * pool.length)];

      return NextResponse.json({ profile: randomProfile satisfies PublicProfile }, { status: 200 });
    }

    return NextResponse.json({ error: "Must provide `id` or `random=true`" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/profile failed:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
