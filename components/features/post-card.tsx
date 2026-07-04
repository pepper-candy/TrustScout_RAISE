"use client"

import { useState } from "react"
import { CircleCheck, CircleDashed, CircleX, Loader2, Sparkles } from "lucide-react"

import { TrustBadge } from "@/components/features/trust-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { PostWithColor, VoteType } from "@/types/database"

const CATEGORY_LABEL: Record<PostWithColor["category"], string> = {
  FACTUAL: "Factual",
  OPINION: "Opinion",
  DEBATE: "Debate",
}

const VOTE_CONFIG: Record<
  VoteType,
  { label: string; icon: typeof CircleCheck; activeClassName: string }
> = {
  TRUE: {
    label: "True",
    icon: CircleCheck,
    activeClassName: "border-emerald-500/40 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
  PARTIAL: {
    label: "Partial",
    icon: CircleDashed,
    activeClassName: "border-amber-500/40 bg-amber-50 text-amber-700 hover:bg-amber-100",
  },
  FALSE: {
    label: "False",
    icon: CircleX,
    activeClassName: "border-red-500/40 bg-red-50 text-red-700 hover:bg-red-100",
  },
}

interface PostCardProps {
  post: PostWithColor
  onVote: (voteType: VoteType, isWitness: boolean) => void
  loadingVoteType: VoteType | null
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
    <Card
      className={cn(
        "group gap-4 py-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
        isWitness && "border-amber-400/70 animate-witness-glow"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <Badge variant="outline" className="text-muted-foreground border-border/80 font-medium">
          {CATEGORY_LABEL[post.category]}
        </Badge>
        {post.category !== "FACTUAL" && (
          <TrustBadge trustScore={post.trust_score} colorCode={post.color_code} totalVotes={post.total_votes} />
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <p className="text-[15px] leading-relaxed">{post.content}</p>
        {post.category === "FACTUAL" && (
          <TrustBadge trustScore={post.trust_score} colorCode={post.color_code} totalVotes={post.total_votes} />
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {!hasVoted && (
          <button
            type="button"
            onClick={() => setIsWitness((prev) => !prev)}
            disabled={isVoting}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
              isWitness
                ? "border-amber-400/60 bg-amber-50 text-amber-800"
                : "border-border/70 text-muted-foreground hover:bg-muted/50"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className={cn("size-3.5", isWitness && "text-amber-500")} />
              {isWitness
                ? "Marking as firsthand knowledge (Witness)"
                : "I witnessed this firsthand"}
            </span>
            <Switch checked={isWitness} onCheckedChange={setIsWitness} disabled={isVoting} size="sm" />
          </button>
        )}

        <div className="grid w-full grid-cols-3 gap-2">
          {(Object.keys(VOTE_CONFIG) as VoteType[]).map((voteType) => {
            const config = VOTE_CONFIG[voteType]
            const Icon = config.icon
            const isThisLoading = loadingVoteType === voteType
            const isMyVote = post.my_vote === voteType

            return (
              <Button
                key={voteType}
                type="button"
                variant="outline"
                disabled={isVoting || hasVoted}
                onClick={() => handleVote(voteType)}
                className={cn(
                  "h-10 flex-col gap-0.5 transition-all active:scale-95",
                  !hasVoted && loadingVoteType === null && "hover:-translate-y-0.5",
                  (isThisLoading || isMyVote) && config.activeClassName,
                  hasVoted && !isMyVote && "opacity-40"
                )}
              >
                {isThisLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Icon className="size-4" />
                )}
                <span className="text-[11px]">{config.label}</span>
              </Button>
            )
          })}
        </div>

        {hasVoted && (
          <p className="text-muted-foreground -mt-1 text-center text-[11px]">
            You voted <span className="font-semibold">{VOTE_CONFIG[post.my_vote!].label}</span> on this post
          </p>
        )}
      </CardFooter>
    </Card>
  )
}
