import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { classifyPostContent } from "@/lib/services/vultrService";
import { toPostWithColor } from "@/lib/trustScore";
import type { PostRow, PostWithColor, VoteRow } from "@/types/database";

const querySchema = z.object({
  user_id: z.uuid().optional(),
});

const createPostRequestSchema = z.object({
  content: z.string().trim().min(3, "Post must be at least 3 characters").max(500, "Post must be 500 characters or fewer"),
  user_id: z.uuid(),
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

/**
 * POST /api/posts
 * Creates a new post authored by `user_id`. Content is classified by Vultr
 * Serverless Inference (`classifyPostContent`, with a deterministic local
 * fallback if Vultr is unconfigured/unreachable) into FACTUAL / OPINION /
 * DEBATE *before* the row is inserted, so every post that reaches the feed
 * already carries a category. New posts start with no votes, so
 * `trust_score` is 0 and `color_code` is null until the community weighs in
 * (FACTUAL posts only — see `toPostWithColor`).
 */
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = createPostRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: z.flattenError(parsed.error) },
        { status: 400 }
      );
    }

    const { content, user_id } = parsed.data;
    const supabase = createServiceRoleClient();

    const { data: author, error: authorError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .single();

    if (authorError || !author) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const category = await classifyPostContent(content);

    const { data: post, error: insertError } = await supabase
      .from("posts")
      .insert({
        content,
        category,
        trust_score: 0,
        total_votes: 0,
        consensus_version: 1,
      })
      .select("*")
      .single()
      .overrideTypes<PostRow, { merge: false }>();

    if (insertError || !post) {
      throw insertError ?? new Error("Failed to create post");
    }

    return NextResponse.json({ post: toPostWithColor(post, null) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/posts failed:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
