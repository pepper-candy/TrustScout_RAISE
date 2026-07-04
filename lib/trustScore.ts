import type { PostRow, TrustScoreDisplay, VoteRow, VoteType } from "@/types/truthscout";

const VOTE_VALUES: Record<VoteType, number> = {
  TRUE: 1,
  PARTIAL: 0.5,
  FALSE: 0,
};

const MIN_ACCURACY_SCORE = -0.8;
const MAX_ACCURACY_SCORE = 4;
const WITNESS_MULTIPLIER_FACTOR = 0.25;

export function voteTypeToValue(voteType: VoteType) {
  return VOTE_VALUES[voteType];
}

export function clampAccuracyScore(accuracyScore: number) {
  return Math.min(MAX_ACCURACY_SCORE, Math.max(MIN_ACCURACY_SCORE, accuracyScore));
}

export function calculateVoteWeight(accuracyScore: number, isWitness: boolean) {
  const clampedAccuracyScore = clampAccuracyScore(accuracyScore);
  const baseWeight = 1 + clampedAccuracyScore;
  const finalWeight = isWitness
    ? baseWeight * (1 + clampedAccuracyScore * WITNESS_MULTIPLIER_FACTOR)
    : baseWeight;

  return Number(finalWeight.toFixed(4));
}

export function calculateTrustScore(votes: Pick<VoteRow, "vote_type" | "weight">[]) {
  const totals = votes.reduce(
    (accumulator, vote) => {
      const weight = Number.isFinite(vote.weight) ? Math.max(0, vote.weight) : 0;

      return {
        weightedVoteSum: accumulator.weightedVoteSum + weight * voteTypeToValue(vote.vote_type),
        weightSum: accumulator.weightSum + weight,
      };
    },
    { weightedVoteSum: 0, weightSum: 0 },
  );

  if (totals.weightSum === 0) {
    return 0.5;
  }

  return Number((totals.weightedVoteSum / totals.weightSum).toFixed(4));
}

export function getTrustScoreDisplay(trustScore: number): TrustScoreDisplay {
  const normalizedScore = Math.min(1, Math.max(0, trustScore));
  const hue = Math.round(normalizedScore * 120);
  const percentage = Math.round(normalizedScore * 100);

  if (normalizedScore >= 0.81) {
    return { color: `hsl(${hue} 72% 36%)`, label: "Highly trustworthy", percentage };
  }

  if (normalizedScore >= 0.61) {
    return { color: `hsl(${hue} 70% 42%)`, label: "Likely true", percentage };
  }

  if (normalizedScore >= 0.41) {
    return { color: "hsl(42 24% 48%)", label: "Uncertain", percentage };
  }

  if (normalizedScore >= 0.21) {
    return { color: `hsl(${hue} 84% 48%)`, label: "Likely false", percentage };
  }

  return { color: `hsl(${hue} 82% 46%)`, label: "Highly suspicious", percentage };
}

export function decoratePost(post: PostRow) {
  const display = getTrustScoreDisplay(post.trust_score);

  return {
    ...post,
    color_code: display.color,
    color_label: display.label,
  };
}
