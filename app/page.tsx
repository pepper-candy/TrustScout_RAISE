"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { AppHeader } from "@/components/features/app-header"
import { PostCard } from "@/components/features/post-card"
import { Skeleton } from "@/components/ui/skeleton"
import { type CurrentUserProfile, getCurrentUserProfile, switchToRandomUser } from "@/lib/auth"
import type { PostWithColor, VoteType } from "@/types/database"

const VOTE_TOAST_LABEL: Record<VoteType, string> = {
  TRUE: "True",
  PARTIAL: "Partial",
  FALSE: "False",
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="border-border/70 flex flex-col gap-4 rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const [posts, setPosts] = useState<PostWithColor[]>([])
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null)
  const [isLoadingFeed, setIsLoadingFeed] = useState(true)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [isShuffling, setIsShuffling] = useState(false)
  const [votingPostId, setVotingPostId] = useState<string | null>(null)
  const [votingType, setVotingType] = useState<VoteType | null>(null)

  const loadPosts = useCallback(async (userId?: string) => {
    const query = userId ? `?user_id=${userId}` : ""
    const response = await fetch(`/api/posts${query}`)
    if (!response.ok) throw new Error("Failed to load the feed")

    const { posts: fetchedPosts } = (await response.json()) as { posts: PostWithColor[] }
    setPosts(fetchedPosts)
  }, [])

  useEffect(() => {
    async function init() {
      setIsLoadingFeed(true)
      setIsLoadingUser(true)

      // Profile is fetched first (rather than in parallel) so the feed
      // request can include `user_id` and show each post's "already voted"
      // state from the very first render.
      let currentProfile: CurrentUserProfile | null = null
      try {
        currentProfile = await getCurrentUserProfile()
        setProfile(currentProfile)
      } catch (err) {
        toast.error("Couldn't assign a demo user", {
          description: err instanceof Error ? err.message : undefined,
        })
      } finally {
        setIsLoadingUser(false)
      }

      try {
        await loadPosts(currentProfile?.id)
      } catch (err) {
        toast.error("Couldn't load the feed", {
          description: err instanceof Error ? err.message : undefined,
        })
      } finally {
        setIsLoadingFeed(false)
      }
    }

    void init()
  }, [loadPosts])

  async function handleVote(postId: string, voteType: VoteType, isWitness: boolean) {
    if (!profile || votingPostId) return

    setVotingPostId(postId)
    setVotingType(voteType)

    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          user_id: profile.id,
          vote_type: voteType,
          is_witness: isWitness,
        }),
      })

      if (!response.ok) {
        const { error } = (await response.json()) as { error?: string }
        throw new Error(error ?? "Failed to submit vote")
      }

      const { post: updatedPost } = (await response.json()) as { post: PostWithColor }
      setPosts((prev) => prev.map((post) => (post.id === updatedPost.id ? updatedPost : post)))

      toast.success(`Vote recorded: ${VOTE_TOAST_LABEL[voteType]}${isWitness ? " · Witness" : ""}`, {
        description:
          updatedPost.category === "FACTUAL"
            ? `New trust score: ${Math.round(updatedPost.trust_score * 100)}%`
            : undefined,
      })
    } catch (err) {
      toast.error("Couldn't submit your vote", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setVotingPostId(null)
      setVotingType(null)
    }
  }

  async function handleShuffle() {
    if (isShuffling) return
    setIsShuffling(true)
    try {
      const newProfile = await switchToRandomUser()
      setProfile(newProfile)
      await loadPosts(newProfile.id)
      toast.success(`Switched to @${newProfile.username}`, {
        description: "You're now voting with a different reputation weight.",
      })
    } catch (err) {
      toast.error("Couldn't switch user", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setIsShuffling(false)
    }
  }

  return (
    <>
      <AppHeader
        profile={profile}
        isLoading={isLoadingUser}
        isShuffling={isShuffling}
        onShuffle={() => void handleShuffle()}
      />

      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-6">
        {isLoadingFeed ? (
          <FeedSkeleton />
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">No posts yet.</p>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              loadingVoteType={votingPostId === post.id ? votingType : null}
              onVote={(voteType, isWitness) => void handleVote(post.id, voteType, isWitness)}
            />
          ))
        )}
      </main>
    </>
  )
}
