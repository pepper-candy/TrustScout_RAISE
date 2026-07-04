import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { getTrustColorCode } from "@/lib/trustScore";
import type { PostRow, PostWithColor } from "@/types/database";

/**
 * GET /api/posts
 * Fetches all posts (FACTUAL + OPINION + DEBATE), sorted newest first.
 * FACTUAL posts get a `color_code` derived from `trust_score`; other
 * categories don't carry a trust score, so `color_code` is null for them.
 */
export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .overrideTypes<PostRow[], { merge: false }>();

    if (error) throw error;

    const postsWithColor: PostWithColor[] = (posts ?? []).map((post) => ({
      ...post,
      color_code: post.category === "FACTUAL" ? getTrustColorCode(post.trust_score) : null,
    }));

    return NextResponse.json({ posts: postsWithColor }, { status: 200 });
  } catch (error) {
    console.error("GET /api/posts failed:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
