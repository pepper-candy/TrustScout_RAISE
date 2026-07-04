"use client"

import { useCallback, useEffect, useState } from "react"

import { PostCard } from "@/components/features/post-card"
import { getCurrentUserId } from "@/lib/auth"
import type { PostWithColor, VoteType } from "@/types/database"

export default function Home() {
  const [posts, setPosts] = useState<PostWithColor[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [votingPostId, setVotingPostId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadPosts = useCallback(async () => {
    try {
      const response = await fetch("/api/posts")
      if (!response.ok) throw new Error("Failed to load posts")

      const { posts: fetchedPosts } = (await response.json()) as { posts: PostWithColor[] }
      setPosts(fetchedPosts)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load posts")
    }
  }, [])

  useEffect(() => {
    async function init() {
      setIsLoading(true)
      try {
        const [id] = await Promise.all([getCurrentUserId(), loadPosts()])
        setUserId(id)
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to initialize")
      } finally {
        setIsLoading(false)
      }
    }

    void init()
  }, [loadPosts])

  async function handleVote(postId: string, voteType: VoteType) {
    if (!userId || votingPostId) return

    setVotingPostId(postId)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          user_id: userId,
          vote_type: voteType,
          is_witness: false,
        }),
      })

      if (!response.ok) {
        const { error } = (await response.json()) as { error?: string }
        throw new Error(error ?? "Failed to submit vote")
      }

      const { post: updatedPost } = (await response.json()) as { post: PostWithColor }
      setPosts((prev) => prev.map((post) => (post.id === updatedPost.id ? updatedPost : post)))
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to submit vote")
    } finally {
      setVotingPostId(null)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-10">
      <header className="mb-2">
        <h1 className="text-2xl font-bold">TruthScout</h1>
        <p className="text-muted-foreground text-sm">Making truth visible, one swipe at a time.</p>
      </header>

      {errorMessage && (
        <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
          {errorMessage}
        </p>
      )}

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading feed…</p>
      ) : posts.length === 0 ? (
        <p className="text-muted-foreground text-sm">No posts yet.</p>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isVoting={votingPostId === post.id}
            onVote={(voteType) => void handleVote(post.id, voteType)}
          />
        ))
      )}
    </main>
  )
}
