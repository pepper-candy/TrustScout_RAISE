import type { PostRow, PostWithColor, TrustColorCode, VoteType } from "@/types/database";

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
 * OPINION/DEBATE: each vote counts equally (weight 1).
 * TRUE = 1 (agree), PARTIAL = 0.5 (neutral), FALSE = 0 (disagree).
 */
export function calculateAgreeScore(votes: { vote_type: VoteType }[]): number {
  if (votes.length === 0) return 0;
  const weightedSum = votes.reduce((sum, vote) => sum + VOTE_VALUE[vote.vote_type], 0);
  return weightedSum / votes.length;
}

/**
 * Wilson-style confidence adjustment for FACTUAL posts (PROJECT_PLAN.md §4).
 * `trustVotes` is derived from the raw weighted score × total vote count.
 */
export function calculateAdjustedTrustScore(rawTrustScore: number, totalVotes: number): number {
  if (totalVotes <= 0) return 0;
  const trustVotes = rawTrustScore * totalVotes;
  return ((trustVotes + 1) / (totalVotes + 2)) * (totalVotes / (totalVotes + 10));
}

/** Score shown in the UI — adjusted for FACTUAL, raw agree % for OPINION/DEBATE. */
export function getDisplayTrustScore(post: Pick<PostRow, "category" | "trust_score" | "total_votes">): number {
  if (post.category === "FACTUAL") {
    return calculateAdjustedTrustScore(post.trust_score, post.total_votes);
  }
  return post.trust_score;
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

/**
 * Shared by both `/api/posts` and `/api/votes` so the two endpoints always
 * agree on how `color_code` (and the viewer's `my_vote`) are derived —
 * previously `/api/votes` returned a bare `PostRow`, which silently made the
 * trust badge flicker to "Debate" right after voting on a FACTUAL post.
 */
export function toPostWithColor(
  post: PostRow,
  myVote: VoteType | null = null,
  authorUsername = "guest"
): PostWithColor {
  const displayScore = getDisplayTrustScore(post);
  return {
    ...post,
    color_code: post.category === "FACTUAL" ? getTrustColorCode(displayScore) : null,
    my_vote: myVote,
    author_username: authorUsername,
  };
}

export const TRUST_COLOR_LABEL: Record<TrustColorCode, string> = {
  "dark-green": "Highly Trustworthy",
  "light-green": "Likely True",
  gray: "Uncertain",
  orange: "Likely False",
  red: "Highly Suspicious",
};

/**
 * Builds the sentence read aloud by the Gradium "Listen" button — per
 * PROJECT_PLAN.md Section 10, Gradium should "speak the post content + trust
 * score". OPINION/DEBATE posts have no trust score, so they get a shorter
 * summary instead.
 */
export function buildTrustSummaryText(post: PostWithColor): string {
  if (post.category !== "FACTUAL") {
    const percentage = Math.round(post.trust_score * 100);
    const voteWord = post.total_votes === 1 ? "vote" : "votes";
    return `This is a ${post.category.toLowerCase()} post. ${percentage} percent agree, based on ${post.total_votes} ${voteWord}. It says: ${post.content}`;
  }

  const displayScore = getDisplayTrustScore(post);
  const percentage = Math.round(displayScore * 100);
  const label = post.color_code ? TRUST_COLOR_LABEL[post.color_code] : "Uncertain";
  const voteWord = post.total_votes === 1 ? "vote" : "votes";

  return `Here's the post: ${post.content}. Community trust score: ${percentage} percent, rated ${label}, based on ${post.total_votes} ${voteWord}.`;
}

/** Combined script for the header "Popular briefing" Gradium readout. */
export function buildPopularBriefingText(posts: PostWithColor[]): string {
  if (posts.length === 0) return "";

  const intro =
    posts.length === 1
      ? "Here is the most popular post on TrustScout."
      : `Here are the top ${posts.length} popular posts on TrustScout.`;

  const sections = posts.map(
    (post, index) => `Post ${index + 1}. ${buildTrustSummaryText(post)}`
  );

  return [intro, ...sections].join(" ");
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return [r, g, b];
}

function rgbToCss([r, g, b]: [number, number, number]): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

const GRADIENT_STOPS: [number, string][] = [
  [0, "#FF4444"],
  [0.5, "#FFAA00"],
  [1, "#44DD44"],
];

/**
 * Interpolates a smooth red → orange/yellow → green color for a 0..1 trust
 * score, so the badge/progress bar reflect a continuous gradient rather than
 * jumping between 5 discrete colors.
 */
export function getTrustGradientColor(trustScore: number): string {
  const score = Math.min(1, Math.max(0, trustScore));

  for (let i = 0; i < GRADIENT_STOPS.length - 1; i++) {
    const [startPos, startColor] = GRADIENT_STOPS[i];
    const [endPos, endColor] = GRADIENT_STOPS[i + 1];

    if (score >= startPos && score <= endPos) {
      const localT = endPos === startPos ? 0 : (score - startPos) / (endPos - startPos);
      const startRgb = hexToRgb(startColor);
      const endRgb = hexToRgb(endColor);
      const mixed: [number, number, number] = [
        lerp(startRgb[0], endRgb[0], localT),
        lerp(startRgb[1], endRgb[1], localT),
        lerp(startRgb[2], endRgb[2], localT),
      ];
      return rgbToCss(mixed);
    }
  }

  return GRADIENT_STOPS[GRADIENT_STOPS.length - 1][1];
}
