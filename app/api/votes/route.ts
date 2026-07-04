import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { calculateTrustScore, calculateVoteWeight } from "@/lib/trustScore";
import type { PostRow, ProfileRow, VoteRow } from "@/types/database";

/**
 * Note: since this MVP has no auth/session (see /lib/auth.ts — the current
 * user's ID lives in localStorage), the client must include `user_id` in the
 * request body so the server knows who is voting. This matches the
 * `user_id: currentUserId` pattern shown in PROJECT_PLAN.md's insert example.
 */
const voteRequestSchema = z.object({
  post_id: z.uuid(),
  user_id: z.uuid(),
  vote_type: z.enum(["TRUE", "PARTIAL", "FALSE"]),
  is_witness: z.boolean(),
});

/**
 * POST /api/votes
 * 1. Looks up the voting user's accuracy score and derives their vote weight.
 * 2. Inserts the vote.
 * 3. Recalculates trust_score = SUM(weight * vote_value) / SUM(weight) from
 *    every vote on the post (all calculation happens here, in the app layer).
 * 4. Updates the post's trust_score and total_votes.
 */
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = voteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: z.flattenError(parsed.error) },
        { status: 400 }
      );
    }

    const { post_id, user_id, vote_type, is_witness } = parsed.data;
    const supabase = createServiceRoleClient();

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", post_id)
      .single()
      .overrideTypes<PostRow, { merge: false }>();

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("accuracy_score")
      .eq("id", user_id)
      .single()
      .overrideTypes<Pick<ProfileRow, "accuracy_score">, { merge: false }>();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const weight = calculateVoteWeight(profile.accuracy_score, is_witness);

    const { error: insertError } = await supabase.from("votes").insert({
      post_id,
      user_id,
      vote_type,
      is_witness,
      weight,
      consensus_version_at_vote: post.consensus_version,
    });

    if (insertError) throw insertError;

    const { data: allVotes, error: votesError } = await supabase
      .from("votes")
      .select("vote_type, weight")
      .eq("post_id", post_id)
      .overrideTypes<Pick<VoteRow, "vote_type" | "weight">[], { merge: false }>();

    if (votesError) throw votesError;

    const votes = allVotes ?? [];
    const trustScore = calculateTrustScore(votes);

    const { data: updatedPost, error: updateError } = await supabase
      .from("posts")
      .update({
        trust_score: trustScore,
        total_votes: votes.length,
      })
      .eq("id", post_id)
      .select("*")
      .single()
      .overrideTypes<PostRow, { merge: false }>();

    if (updateError || !updatedPost) {
      throw updateError ?? new Error("Failed to update post after voting");
    }

    return NextResponse.json({ post: updatedPost }, { status: 200 });
  } catch (error) {
    console.error("POST /api/votes failed:", error);
    return NextResponse.json({ error: "Failed to submit vote" }, { status: 500 });
  }
}
