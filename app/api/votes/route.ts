import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateTrustScore, calculateVoteWeight, decoratePost } from "@/lib/trustScore";
import type { ProfileRow, VoteApiResponse, VoteInsert } from "@/types/truthscout";

const voteRequestSchema = z.object({
  post_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  vote_type: z.enum(["TRUE", "PARTIAL", "FALSE"]),
  is_witness: z.boolean().default(false),
});

async function getVotingProfile(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  userId: string | undefined,
) {
  if (userId) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username, accuracy_score, total_votes, correct_votes, incorrect_votes, created_at")
      .eq("id", userId)
      .single();

    if (error) {
      throw error;
    }

    return profile;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, accuracy_score, total_votes, correct_votes, incorrect_votes, created_at")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!profile) {
    throw new Error("No demo profiles are available for voting.");
  }

  return profile;
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return Response.json({ error: "Supabase is not configured for this deployment." }, { status: 503 });
  }

  try {
    const payload: unknown = await request.json();
    const parsedPayload = voteRequestSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return Response.json({ error: "Vote payload is invalid." }, { status: 400 });
    }

    const { post_id: postId, user_id: userId, vote_type: voteType, is_witness: isWitness } =
      parsedPayload.data;

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, content, category, trust_score, total_votes, consensus_version, created_at")
      .eq("id", postId)
      .single();

    if (postError) {
      throw postError;
    }

    if (post.category !== "FACTUAL") {
      return Response.json(
        { error: "Only FACTUAL posts can receive trust-score votes." },
        { status: 422 },
      );
    }

    const profile: ProfileRow = await getVotingProfile(supabase, userId);
    const weight = calculateVoteWeight(profile.accuracy_score, isWitness);
    const voteInsert: VoteInsert = {
      post_id: postId,
      user_id: profile.id,
      vote_type: voteType,
      is_witness: isWitness,
      weight,
      vote_timestamp: new Date().toISOString(),
      consensus_version_at_vote: post.consensus_version,
    };

    const { data: insertedVote, error: insertError } = await supabase
      .from("votes")
      .insert(voteInsert)
      .select("id, vote_type, is_witness, weight")
      .single();

    if (insertError) {
      throw insertError;
    }

    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("id, post_id, user_id, vote_type, is_witness, weight, vote_timestamp, consensus_version_at_vote")
      .eq("post_id", postId);

    if (votesError) {
      throw votesError;
    }

    const nextTrustScore = calculateTrustScore(votes ?? []);
    const nextTotalVotes = votes?.length ?? 0;

    const { data: updatedPost, error: updateError } = await supabase
      .from("posts")
      .update({
        trust_score: nextTrustScore,
        total_votes: nextTotalVotes,
      })
      .eq("id", postId)
      .select("id, content, category, trust_score, total_votes, consensus_version, created_at")
      .single();

    if (updateError) {
      throw updateError;
    }

    const response: VoteApiResponse = {
      post: decoratePost(updatedPost),
      vote: insertedVote,
    };

    return Response.json(response, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to submit vote.";

    return Response.json({ error: message }, { status: 500 });
  }
}
