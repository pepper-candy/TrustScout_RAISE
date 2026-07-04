"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { selectDemoUser } from "@/lib/auth";
import type { DemoUser, FeedPost, PostsApiResponse } from "@/types/truthscout";
import { PostCard } from "@/components/features/post-card";

const feedPostSchema = z.object({
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

const demoUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  accuracy_score: z.number(),
});

const postsApiResponseSchema = z.object({
  posts: z.array(feedPostSchema),
  demoUsers: z.array(demoUserSchema),
  error: z.string().optional(),
});

export function Feed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/posts?limit=8", { cache: "no-store" });
        const payload: unknown = await response.json();
        const parsedPayload = postsApiResponseSchema.safeParse(payload);

        if (!parsedPayload.success) {
          throw new Error("Feed response was not in the expected format.");
        }

        const data: PostsApiResponse = parsedPayload.data;

        if (!response.ok || data.error) {
          throw new Error(data.error ?? "Unable to load the TruthScout feed.");
        }

        if (isMounted) {
          setPosts(data.posts);
          setDemoUsers(data.demoUsers);
        }
      } catch (caughtError: unknown) {
        if (isMounted) {
          const message =
            caughtError instanceof Error ? caughtError.message : "Unable to load the TruthScout feed.";
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentUser = useMemo(() => selectDemoUser(demoUsers), [demoUsers]);

  function handleVoteComplete(updatedPost: FeedPost) {
    setPosts((currentPosts) =>
      currentPosts.map((post) => (post.id === updatedPost.id ? updatedPost : post)),
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Loading seeded TruthScout posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-destructive">Feed unavailable</p>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">
          No posts returned from Supabase yet. Seeded posts will appear here.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Demo voter
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">
              {currentUser ? currentUser.username : "No seeded user loaded"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Accuracy score: {currentUser ? currentUser.accuracy_score.toFixed(1) : "N/A"}
            </p>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            Each browser is assigned one existing Supabase profile so the weighted vote demo works without
            login.
          </p>
        </div>
      </div>

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUser={currentUser}
          onVoteComplete={handleVoteComplete}
        />
      ))}
    </section>
  );
}
