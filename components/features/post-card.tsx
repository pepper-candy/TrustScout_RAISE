"use client";

import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import type { DemoUser, FeedPost, VoteType } from "@/types/truthscout";

const votePostSchema = z.object({
  id: z.string(),
  content: z.string(),
  category: z.enum(["FACTUAL", "OPINION", "DEBATE"]),
  trust_score: z.number(),
  total_votes: z.number(),
  consensus_version: z.number(),
  created_at: z.string(),
  color_code: z.string(),
  color_label: z.string(),
});

const voteResponseSchema = z.object({
  post: votePostSchema,
  vote: z.object({
    id: z.string(),
    vote_type: z.enum(["TRUE", "PARTIAL", "FALSE"]),
    is_witness: z.boolean(),
    weight: z.number(),
  }),
});

const voteActions: { voteType: VoteType; label: string; gesture: string; className: string }[] = [
  {
    voteType: "FALSE",
    label: "False",
    gesture: "Swipe left",
    className: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  },
  {
    voteType: "PARTIAL",
    label: "Partial",
    gesture: "Swipe down",
    className: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  },
  {
    voteType: "TRUE",
    label: "True",
    gesture: "Swipe right",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
];

interface PostCardProps {
  post: FeedPost;
  currentUser: DemoUser | null;
  onVoteComplete: (post: FeedPost) => void;
}

export function PostCard({ post, currentUser, onVoteComplete }: PostCardProps) {
  const [submittingVote, setSubmittingVote] = useState<VoteType | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isFactual = post.category === "FACTUAL";
  const trustPercentage = Math.round(Math.min(1, Math.max(0, post.trust_score)) * 100);

  async function submitVote(voteType: VoteType) {
    if (!currentUser) {
      setError("No seeded demo user is available for voting.");
      return;
    }

    setSubmittingVote(voteType);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_id: post.id,
          user_id: currentUser.id,
          vote_type: voteType,
          is_witness: false,
        }),
      });
      const payload: unknown = await response.json();
      const parsedPayload = voteResponseSchema.safeParse(payload);

      if (!response.ok) {
        const message =
          typeof payload === "object" && payload !== null && "error" in payload
            ? String(payload.error)
            : "Unable to submit vote.";
        throw new Error(message);
      }

      if (!parsedPayload.success) {
        throw new Error("Vote response was not in the expected format.");
      }

      onVoteComplete(parsedPayload.data.post);
      setFeedback(`${voteType.toLowerCase()} vote saved with weighted recalculation.`);
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to submit vote.";
      setError(message);
    } finally {
      setSubmittingVote(null);
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div
        className="h-2"
        style={{
          background: `linear-gradient(90deg, ${post.color_code}, color-mix(in oklch, ${post.color_code}, white 45%))`,
        }}
      />
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                {post.category}
              </span>
              {!isFactual ? (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Debate mode
                </span>
              ) : null}
            </div>
            <p className="max-w-3xl text-xl font-semibold leading-relaxed sm:text-2xl">{post.content}</p>
          </div>

          <div
            className="min-w-32 rounded-2xl p-4 text-center text-white shadow-sm"
            style={{ backgroundColor: post.color_code }}
          >
            <p className="text-3xl font-black">{trustPercentage}%</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide">{post.color_label}</p>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl bg-muted/50 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Total votes
            </p>
            <p className="mt-1 text-2xl font-bold">{post.total_votes}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Formula
            </p>
            <p className="mt-1 text-sm text-muted-foreground">SUM(weight * value) / SUM(weight)</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Current user
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {currentUser ? currentUser.username : "Loading demo user"}
            </p>
          </div>
        </div>

        {isFactual ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {voteActions.map((action) => (
              <Button
                key={action.voteType}
                type="button"
                variant="outline"
                className={action.className}
                disabled={submittingVote !== null || !currentUser}
                onClick={() => {
                  void submitVote(action.voteType);
                }}
              >
                {submittingVote === action.voteType ? "Saving..." : `${action.gesture}: ${action.label}`}
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            Opinion and debate posts are shown without trust-score voting so accuracy scores are not polluted.
          </div>
        )}

        {feedback ? <p className="text-sm font-medium text-emerald-700">{feedback}</p> : null}
        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      </div>
    </article>
  );
}
