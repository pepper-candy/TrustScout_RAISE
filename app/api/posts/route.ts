import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { toPostWithColor } from "@/lib/trustScore";
import type { PostRow, PostWithColor, VoteRow } from "@/types/database";

const querySchema = z.object({
  user_id: z.uuid().optional(),
});

/**
 * GET /api/posts
 * Fetches all posts (FACTUAL + OPINION + DEBATE), sorted newest first.
 * FACTUAL posts get a `color_code` derived from `trust_score`; other
 * categories don't carry a trust score, so `color_code` is null for them.
 *
 * If `user_id` is provided, each post also carries `my_vote` (the viewer's
 * own vote on it, if any) so the UI can show "already voted" state instead
 * of letting the user hit the one-vote-per-post unique constraint.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = querySchema.safeParse({
      user_id: searchParams.get("user_id") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json({ error: "Invalid `user_id` query parameter" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .overrideTypes<PostRow[], { merge: false }>();

    if (error) throw error;

    const myVoteByPostId = new Map<string, VoteRow["vote_type"]>();
    const { user_id } = parsedQuery.data;

    if (user_id) {
      const { data: myVotes, error: myVotesError } = await supabase
        .from("votes")
        .select("post_id, vote_type")
        .eq("user_id", user_id)
        .overrideTypes<Pick<VoteRow, "post_id" | "vote_type">[], { merge: false }>();

      if (myVotesError) throw myVotesError;

      for (const vote of myVotes ?? []) {
        myVoteByPostId.set(vote.post_id, vote.vote_type);
      }
    }

    const postsWithColor: PostWithColor[] = (posts ?? []).map((post) =>
      toPostWithColor(post, myVoteByPostId.get(post.id) ?? null)
    );

    return NextResponse.json({ posts: postsWithColor }, { status: 200 });
  } catch (error) {
    console.error("GET /api/posts failed:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
