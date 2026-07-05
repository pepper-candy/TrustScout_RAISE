import type { VoteType } from "@/types/database";

/** Minimum factual votes before a post consensus can lock. */
export const MIN_CONSENSUS_VOTES = 3;

export const ACCURACY_REWARD = 0.1;
export const ACCURACY_PENALTY = -0.2;
export const MIN_ACCURACY_SCORE = -0.8;
export const MAX_ACCURACY_SCORE = 4.0;

/**
 * Maps weighted post trust_score (0–1) to a discrete community verdict.
 * Returns null when there are too few votes to lock consensus.
 */
export function deriveConsensusVerdict(trustScore: number, totalVotes: number): VoteType | null {
  if (totalVotes < MIN_CONSENSUS_VOTES) return null;
  if (trustScore >= 0.65) return "TRUE";
  if (trustScore <= 0.35) return "FALSE";
  return "PARTIAL";
}

export function voteMatchesVerdict(voteType: VoteType, verdict: VoteType): boolean {
  return voteType === verdict;
}

export function clampAccuracyScore(score: number): number {
  return Math.min(MAX_ACCURACY_SCORE, Math.max(MIN_ACCURACY_SCORE, score));
}

export function accuracyDeltaForVote(matched: boolean): number {
  return matched ? ACCURACY_REWARD : ACCURACY_PENALTY;
}

/**
 * After a factual vote, decide whether consensus_version should bump.
 * Bumps only when a previously locked verdict changes (crowd correction).
 */
export function nextConsensusVersion(
  currentVersion: number,
  previousVerdict: VoteType | null,
  newVerdict: VoteType | null
): number {
  if (!newVerdict || !previousVerdict) return currentVersion;
  if (previousVerdict === newVerdict) return currentVersion;
  return currentVersion + 1;
}

export function shouldRunAccuracyJudgment(newVerdict: VoteType | null, totalVotes: number): boolean {
  return newVerdict !== null && totalVotes >= MIN_CONSENSUS_VOTES;
}
