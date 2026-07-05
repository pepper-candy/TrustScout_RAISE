import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveAuthorUsername } from "@/lib/postAuthors";
import { applyConsensusAccuracyJudgments } from "@/lib/accuracyJudgment";
import {
  deriveConsensusVerdict,
  nextConsensusVersion,
  shouldRunAccuracyJudgment,
} from "@/lib/consensus";
import { fetchPostVotes } from "@/lib/fetchPostVotes";
import { calculateAgreeScore, calculateTrustScore, calculateVoteWeight, toPostWithColor } from "@/lib/trustScore";
import type { PostRow, ProfileRow } from "@/types/database";

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
 * 2. Upserts the vote (one row per post/user). A user re-voting on a post
 *    replaces their previous vote — the `votes_post_id_user_id_key` unique
 *    constraint is the conflict target, so the existing row is overwritten
 *    rather than rejected.
 * 3. Recalculates trust_score = SUM(weight * vote_value) / SUM(weight) from
 *    every vote on the post (all calculation happens here, in the app layer).
 * 4. Updates the post's trust_score and total_votes.
 * 5. On factual posts, when consensus locks or shifts, adjusts voter accuracy_score
 *    for unjudged votes only. Stored vote weights are never rewritten.
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

    const isFactual = post.category === "FACTUAL";

    if (post.category === "DEBATE") {
      if (vote_type === "PARTIAL") {
        return NextResponse.json(
          { error: "Neutral votes are only allowed on factual and opinion posts" },
          { status: 400 }
        );
      }
    }

    if (!isFactual) {
      if (is_witness) {
        return NextResponse.json(
          { error: "Witness votes are only allowed on factual posts" },
          { status: 400 }
        );
      }
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

    const weight = isFactual ? calculateVoteWeight(profile.accuracy_score, is_witness) : 1;

    const previousVerdict = isFactual
      ? deriveConsensusVerdict(post.trust_score, post.total_votes)
      : null;

    const { error: upsertError } = await supabase.from("votes").upsert(
      {
        post_id,
        user_id,
        vote_type,
        is_witness,
        weight,
        consensus_version_at_vote: post.consensus_version,
        vote_timestamp: new Date().toISOString(),
      },
      { onConflict: "post_id,user_id" }
    );

    if (upsertError) throw upsertError;

    const { votes, judgmentColumnAvailable } = await fetchPostVotes(supabase, post_id);
    const trustScore = isFactual ? calculateTrustScore(votes) : calculateAgreeScore(votes);

    const newVerdict = isFactual ? deriveConsensusVerdict(trustScore, votes.length) : null;
    const consensusVersion = isFactual
      ? nextConsensusVersion(post.consensus_version, previousVerdict, newVerdict)
      : post.consensus_version;

    let updatedAccuracyByUser = new Map<string, number>();

    if (isFactual && shouldRunAccuracyJudgment(newVerdict, votes.length) && judgmentColumnAvailable) {
      updatedAccuracyByUser = await applyConsensusAccuracyJudgments(supabase, {
        postId: post_id,
        verdict: newVerdict!,
        consensusVersion,
        votes,
      });
    } else if (isFactual && shouldRunAccuracyJudgment(newVerdict, votes.length) && !judgmentColumnAvailable) {
      console.warn(
        "Skipping consensus accuracy updates — run scripts/add-vote-accuracy-judged-version.sql on Supabase"
      );
    }

    const { data: updatedPost, error: updateError } = await supabase
      .from("posts")
      .update({
        trust_score: trustScore,
        total_votes: votes.length,
        consensus_version: consensusVersion,
      })
      .eq("id", post_id)
      .select("*")
      .single()
      .overrideTypes<PostRow, { merge: false }>();

    if (updateError || !updatedPost) {
      throw updateError ?? new Error("Failed to update post after voting");
    }

    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, username")
      .order("created_at", { ascending: true })
      .overrideTypes<Pick<ProfileRow, "id" | "username">[], { merge: false }>();

    const profiles = allProfiles ?? [];
    const usernameById = new Map(profiles.map((profile) => [profile.id, profile.username]));
    const authorUsername = resolveAuthorUsername(updatedPost, profiles, usernameById);

    let voterProfile: Pick<ProfileRow, "id" | "username" | "accuracy_score"> | null = null;
    const updatedAccuracy = updatedAccuracyByUser.get(user_id);
    if (updatedAccuracy !== undefined) {
      voterProfile = {
        id: user_id,
        username: usernameById.get(user_id) ?? "guest",
        accuracy_score: updatedAccuracy,
      };
    }

    return NextResponse.json(
      {
        post: toPostWithColor(updatedPost, vote_type, authorUsername),
        profile: voterProfile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/votes failed:", error);
    return NextResponse.json({ error: "Failed to submit vote" }, { status: 500 });
  }
}
