"use client"

import { useState } from "react"
import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Loader2,
  Sparkles,
} from "lucide-react"

import { PostMenuButton } from "@/components/features/app-header"
import { TrustBadge } from "@/components/features/trust-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { PostWithColor, VoteType } from "@/types/database"

const CATEGORY_LABEL: Record<PostWithColor["category"], string> = {
  FACTUAL: "Factual",
  OPINION: "Opinion",
  DEBATE: "Debate",
}

const CATEGORY_AVATAR: Record<PostWithColor["category"], string> = {
  FACTUAL: "F",
  OPINION: "O",
  DEBATE: "D",
}

const VOTE_CONFIG: Record<
  VoteType,
  { label: string; icon: typeof CircleCheck; activeClassName: string }
> = {
  TRUE: {
    label: "True",
    icon: CircleCheck,
    activeClassName: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  },
  PARTIAL: {
    label: "Partial",
    icon: CircleDashed,
    activeClassName: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  },
  FALSE: {
    label: "False",
    icon: CircleX,
    activeClassName: "border-red-500/40 bg-red-500/10 text-red-400",
  },
}

interface PostCardProps {
  post: PostWithColor
  onVote: (voteType: VoteType, isWitness: boolean) => void
  loadingVoteType: VoteType | null
}

function formatPostDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(isoDate))
}

export function PostCard({ post, onVote, loadingVoteType }: PostCardProps) {
  const [isWitness, setIsWitness] = useState(false)
  const isVoting = loadingVoteType !== null
  const hasVoted = post.my_vote !== null

  function handleVote(voteType: VoteType) {
    if (isVoting || hasVoted) return
    onVote(voteType, isWitness)
    setIsWitness(false)
  }

  return (
    <article
      className={cn(
        "border-threads-border grid grid-cols-[48px_minmax(0,1fr)] gap-x-3 border-b px-3 py-3 transition-colors",
        isWitness && "animate-witness-glow bg-amber-500/[0.03]"
      )}
    >
      <div className="relative pt-1">
        <Avatar className="size-9 border border-threads-border">
          <AvatarFallback className="bg-threads-surface text-threads-primary text-xs font-semibold">
            {CATEGORY_AVATAR[post.category]}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[15px] leading-[21px]">
            <span className="truncate font-semibold text-threads-primary">TruthScout</span>
            <span className="text-threads-muted">·</span>
            <span className="font-bold text-threads-primary">{CATEGORY_LABEL[post.category]}</span>
            <span className="text-threads-muted">·</span>
            <time className="text-threads-muted text-[14.6px]" dateTime={post.created_at}>
              {formatPostDate(post.created_at)}
            </time>
          </div>
          <PostMenuButton />
        </div>

        <p className="text-[15px] leading-[21px] text-threads-primary whitespace-pre-wrap">
          {post.content}
        </p>

        <TrustBadge
          trustScore={post.trust_score}
          colorCode={post.color_code}
          totalVotes={post.total_votes}
          compact
        />

        {!hasVoted && (
          <button
            type="button"
            onClick={() => setIsWitness((prev) => !prev)}
            disabled={isVoting}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors",
              isWitness
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-threads-border text-threads-muted hover:bg-white/[0.04]"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className={cn("size-3.5", isWitness && "text-amber-400")} />
              {isWitness
                ? "Marking as firsthand knowledge (Witness)"
                : "I witnessed this firsthand"}
            </span>
            <Switch checked={isWitness} onCheckedChange={setIsWitness} disabled={isVoting} size="sm" />
          </button>
        )}

        <div className="-ml-1 flex flex-wrap items-center gap-0.5">
          {(Object.keys(VOTE_CONFIG) as VoteType[]).map((voteType) => {
            const config = VOTE_CONFIG[voteType]
            const Icon = config.icon
            const isThisLoading = loadingVoteType === voteType
            const isMyVote = post.my_vote === voteType

            return (
              <button
                key={voteType}
                type="button"
                disabled={isVoting || hasVoted}
                onClick={() => handleVote(voteType)}
                className={cn(
                  "flex h-9 items-center gap-1 rounded-full border border-transparent px-3 text-[13px] text-threads-subtle transition-all active:scale-95 disabled:cursor-default",
                  !hasVoted && !isVoting && "hover:bg-white/[0.06]",
                  (isThisLoading || isMyVote) && config.activeClassName,
                  hasVoted && !isMyVote && "opacity-35"
                )}
              >
                {isThisLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Icon className="size-[18px]" strokeWidth={1.75} />
                )}
                <span>{config.label}</span>
              </button>
            )
          })}
        </div>

        {hasVoted && (
          <p className="text-threads-muted text-[11px]">
            You voted <span className="font-semibold text-threads-subtle">{VOTE_CONFIG[post.my_vote!].label}</span> on this post
          </p>
        )}
      </div>
    </article>
  )
}
