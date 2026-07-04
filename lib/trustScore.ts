import type { TrustColorCode, VoteType } from "@/types/database";

/**
 * All vote/trust-score math lives here in the application layer — per project
 * rules, no Supabase triggers or RPCs are used to compute these values.
 */

export const MIN_WEIGHT = 0.2;
export const MAX_WEIGHT = 5.0;

/** Numeric direction of each vote type, per the trust score formula. */
export const VOTE_VALUE: Record<VoteType, number> = {
  TRUE: 1,
  PARTIAL: 0.5,
  FALSE: 0,
};

function clampWeight(weight: number): number {
  return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, weight));
}

/**
 * Final_Weight = Base_Weight × (1 + Accuracy_Score × 0.25)   [if Witness]
 * Final_Weight = Base_Weight                                  [if Commentator]
 * where Base_Weight = 1 + Accuracy_Score, clamped to [MIN_WEIGHT, MAX_WEIGHT].
 */
export function calculateVoteWeight(accuracyScore: number, isWitness: boolean): number {
  const baseWeight = 1 + accuracyScore;
  const finalWeight = isWitness ? baseWeight * (1 + accuracyScore * 0.25) : baseWeight;
  return clampWeight(finalWeight);
}

/**
 * trust_score = SUM(weight * vote_value) / SUM(weight)
 */
export function calculateTrustScore(votes: { vote_type: VoteType; weight: number }[]): number {
  const totalWeight = votes.reduce((sum, vote) => sum + vote.weight, 0);
  if (totalWeight <= 0) return 0;

  const weightedSum = votes.reduce(
    (sum, vote) => sum + vote.weight * VOTE_VALUE[vote.vote_type],
    0
  );

  return weightedSum / totalWeight;
}

/**
 * >= 0.8 dark-green, >= 0.6 light-green, >= 0.4 gray, >= 0.2 orange, else red.
 */
export function getTrustColorCode(trustScore: number): TrustColorCode {
  if (trustScore >= 0.8) return "dark-green";
  if (trustScore >= 0.6) return "light-green";
  if (trustScore >= 0.4) return "gray";
  if (trustScore >= 0.2) return "orange";
  return "red";
}
