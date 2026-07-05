import type { SupabaseClient } from "@supabase/supabase-js";

import {
  accuracyDeltaForVote,
  clampAccuracyScore,
  voteMatchesVerdict,
} from "@/lib/consensus";
import { isMissingColumnError } from "@/lib/supabaseErrors";
import type { Database, ProfileRow, VoteType } from "@/types/database";

type VoteForJudgment = {
  id: string;
  user_id: string;
  vote_type: VoteType;
  accuracy_judged_consensus_version?: number | null;
};

type ProfileForJudgment = Pick<
  ProfileRow,
  "id" | "accuracy_score" | "correct_votes" | "incorrect_votes"
>;

/**
 * Applies accuracy rewards/penalties for votes not yet judged at `consensusVersion`.
 * Past vote weights on the post are never rewritten — only profiles.accuracy_score changes.
 */
export async function applyConsensusAccuracyJudgments(
  supabase: SupabaseClient<Database>,
  params: {
    postId: string;
    verdict: VoteType;
    consensusVersion: number;
    votes: VoteForJudgment[];
  }
): Promise<Map<string, number>> {
  const { postId, verdict, consensusVersion, votes } = params;
  const updatedAccuracyByUser = new Map<string, number>();

  const pendingVotes = votes.filter(
    (vote) => (vote.accuracy_judged_consensus_version ?? 0) < consensusVersion
  );

  if (pendingVotes.length === 0) return updatedAccuracyByUser;

  const userIds = [...new Set(pendingVotes.map((vote) => vote.user_id))];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, accuracy_score, correct_votes, incorrect_votes")
    .in("id", userIds)
    .overrideTypes<ProfileForJudgment[], { merge: false }>();

  if (profilesError) throw profilesError;

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  for (const vote of pendingVotes) {
    const profile = profileById.get(vote.user_id);
    if (!profile) continue;

    const matched = voteMatchesVerdict(vote.vote_type, verdict);
    const delta = accuracyDeltaForVote(matched);
    const nextAccuracy = clampAccuracyScore(profile.accuracy_score + delta);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        accuracy_score: nextAccuracy,
        correct_votes: profile.correct_votes + (matched ? 1 : 0),
        incorrect_votes: profile.incorrect_votes + (matched ? 0 : 1),
      })
      .eq("id", profile.id);

    if (profileError) throw profileError;

    profile.accuracy_score = nextAccuracy;
    profile.correct_votes += matched ? 1 : 0;
    profile.incorrect_votes += matched ? 0 : 1;
    updatedAccuracyByUser.set(profile.id, nextAccuracy);

    const { error: voteMarkError } = await supabase
      .from("votes")
      .update({ accuracy_judged_consensus_version: consensusVersion })
      .eq("id", vote.id);

    if (voteMarkError && !isMissingColumnError(voteMarkError)) {
      throw voteMarkError;
    }
    if (voteMarkError && isMissingColumnError(voteMarkError)) {
      console.warn(
        `votes.accuracy_judged_consensus_version missing for post ${postId}; run scripts/add-vote-accuracy-judged-version.sql`
      );
    }
  }

  return updatedAccuracyByUser;
}
