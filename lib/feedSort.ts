import type { PostWithColor } from "@/types/database"

export type FeedSort = "latest" | "popular"

export function sortFeedPosts(posts: PostWithColor[], sort: FeedSort): PostWithColor[] {
  const sorted = [...posts]

  if (sort === "popular") {
    return sorted.sort((a, b) => {
      if (b.total_votes !== a.total_votes) return b.total_votes - a.total_votes
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }

  return sorted.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}
