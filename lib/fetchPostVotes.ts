import type { SupabaseClient } from "@supabase/supabase-js";

import { isMissingColumnError } from "@/lib/supabaseErrors";
import type { Database, VoteRow } from "@/types/database";

export type VoteRowForScoring = Pick<
  VoteRow,
  "id" | "user_id" | "vote_type" | "weight" | "accuracy_judged_consensus_version"
>;

export async function fetchPostVotes(
  supabase: SupabaseClient<Database>,
  postId: string
): Promise<{ votes: VoteRowForScoring[]; judgmentColumnAvailable: boolean }> {
  const withJudgment = await supabase
    .from("votes")
    .select("id, user_id, vote_type, weight, accuracy_judged_consensus_version")
    .eq("post_id", postId)
    .overrideTypes<VoteRowForScoring[], { merge: false }>();

  if (!withJudgment.error) {
    return { votes: withJudgment.data ?? [], judgmentColumnAvailable: true };
  }

  if (!isMissingColumnError(withJudgment.error)) {
    throw withJudgment.error;
  }

  const fallback = await supabase
    .from("votes")
    .select("id, user_id, vote_type, weight")
    .eq("post_id", postId)
    .overrideTypes<Pick<VoteRow, "id" | "user_id" | "vote_type" | "weight">[], { merge: false }>();

  if (fallback.error) throw fallback.error;

  return {
    votes: (fallback.data ?? []).map((vote) => ({
      ...vote,
      accuracy_judged_consensus_version: 0,
    })),
    judgmentColumnAvailable: false,
  };
}
