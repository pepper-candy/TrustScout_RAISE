"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { AppHeader } from "@/components/features/app-header"
import { BottomNav, FEED_FILTER_CYCLE, type FeedFilter } from "@/components/features/bottom-nav"
import { ComposePostDialog } from "@/components/features/compose-post-dialog"
import { LandingSplash } from "@/components/features/landing-splash"
import { PostCard } from "@/components/features/post-card"
import { Skeleton } from "@/components/ui/skeleton"
import { mergeRememberedAuthor, rememberPostAuthor } from "@/lib/postAuthors"
import { sortFeedPosts, type FeedSort } from "@/lib/feedSort"
import { type CurrentUserProfile, getCurrentUserProfile } from "@/lib/auth"
import type { PostCategory, PostWithColor, VoteType } from "@/types/database"

const CATEGORY_TOAST_LABEL: Record<PostCategory, string> = {
  FACTUAL: "Factual",
  OPINION: "Opinion",
  DEBATE: "Debate",
}

function FeedSkeleton() {
  return (
    <div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="border-threads-border grid grid-cols-[48px_minmax(0,1fr)] gap-x-3 border-b px-3 py-3"
        >
          <Skeleton className="size-9 rounded-full bg-threads-surface" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40 rounded bg-threads-surface" />
            <Skeleton className="h-4 w-full rounded bg-threads-surface" />
            <Skeleton className="h-4 w-3/4 rounded bg-threads-surface" />
            <Skeleton className="h-8 w-48 rounded-xl bg-threads-surface" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-16 rounded-full bg-threads-surface" />
              <Skeleton className="h-9 w-16 rounded-full bg-threads-surface" />
              <Skeleton className="h-9 w-16 rounded-full bg-threads-surface" />
            </div>
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
  const [votingPostId, setVotingPostId] = useState<string | null>(null)
  const [votingType, setVotingType] = useState<VoteType | null>(null)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<FeedFilter>("ALL")
  const [feedSort, setFeedSort] = useState<FeedSort>("latest")

  const visiblePosts = sortFeedPosts(
    categoryFilter === "ALL" ? posts : posts.filter((post) => post.category === categoryFilter),
    feedSort
  )

  function cycleCategoryFilter() {
    setCategoryFilter((current) => {
      const index = FEED_FILTER_CYCLE.indexOf(current)
      return FEED_FILTER_CYCLE[(index + 1) % FEED_FILTER_CYCLE.length]
    })
  }

  const loadPosts = useCallback(async (userId?: string) => {
    const query = userId ? `?user_id=${userId}` : ""
    const response = await fetch(`/api/posts${query}`)
    if (!response.ok) throw new Error("Failed to load the feed")

    const { posts: fetchedPosts } = (await response.json()) as { posts: PostWithColor[] }
    setPosts(
      fetchedPosts.map((post) => ({
        ...post,
        author_username: mergeRememberedAuthor(post),
      }))
    )
  }, [])

  useEffect(() => {
    async function init() {
      setIsLoadingFeed(true)
      setIsLoadingUser(true)

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
      setPosts((prev) =>
        prev.map((post) =>
          post.id === updatedPost.id
            ? { ...updatedPost, author_username: mergeRememberedAuthor(updatedPost) }
            : post
        )
      )
    } catch (err) {
      toast.error("Couldn't submit your vote", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setVotingPostId(null)
      setVotingType(null)
    }
  }

  async function handleCreatePost(content: string) {
    if (!profile) {
      toast.error("Couldn't post", { description: "No user is assigned yet — try again in a moment." })
      return
    }

    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, user_id: profile.id }),
    })

    if (!response.ok) {
      const { error } = (await response.json().catch(() => ({}))) as { error?: string }
      throw new Error(error ?? "Failed to create post")
    }

    const { post: newPost } = (await response.json()) as { post: PostWithColor }
    rememberPostAuthor(newPost.id, profile.username)
    setPosts((prev) => [{ ...newPost, author_username: profile.username }, ...prev])
    toast.success(`Posted — classified as ${CATEGORY_TOAST_LABEL[newPost.category]}`, {
      description: "Vultr AI checked your post before it went live.",
    })
  }

  return (
    <div className="bg-background mx-auto flex min-h-full w-full max-w-[414px] flex-col">
      <LandingSplash isLoadingFeed={isLoadingFeed} postsCount={posts.length} />

      <AppHeader sort={feedSort} onSortChange={setFeedSort} />

      <main className="flex flex-1 flex-col pb-[66px]">
        {isLoadingFeed ? (
          <FeedSkeleton />
        ) : visiblePosts.length === 0 ? (
          <p className="text-threads-muted py-16 text-center text-sm">
            No {categoryFilter === "ALL" ? "" : categoryFilter.toLowerCase()} posts yet.
          </p>
        ) : (
          visiblePosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              loadingVoteType={votingPostId === post.id ? votingType : null}
              onVote={(voteType, isWitness) => void handleVote(post.id, voteType, isWitness)}
            />
          ))
        )}
      </main>

      <BottomNav
        profile={profile}
        isLoading={isLoadingUser}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={cycleCategoryFilter}
        onCompose={() => setIsComposeOpen(true)}
      />

      <ComposePostDialog
        open={isComposeOpen}
        onOpenChange={setIsComposeOpen}
        profile={profile}
        onSubmit={handleCreatePost}
      />
    </div>
  )
}
