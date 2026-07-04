"use client"

import { useEffect, useRef, useState } from "react"
import { MessageCircle } from "lucide-react"

import { ListenButton } from "@/components/features/listen-button"
import { Progress } from "@/components/ui/progress"
import { useAnimatedNumber } from "@/hooks/use-animated-number"
import { TRUST_COLOR_LABEL, getTrustGradientColor } from "@/lib/trustScore"
import { cn } from "@/lib/utils"
import type { TrustColorCode } from "@/types/database"

interface TrustBadgeProps {
  trustScore: number
  colorCode: TrustColorCode | null
  totalVotes: number
  compact?: boolean
  /** When provided, renders a "🔊 Listen" button that reads the post's trust summary aloud (PROJECT_PLAN.md Section 10). */
  postId?: string
}

export function TrustBadge({ trustScore, colorCode, totalVotes, compact = false, postId }: TrustBadgeProps) {
  const percentage = Math.round(trustScore * 100)
  const animatedPercentage = useAnimatedNumber(percentage)
  const color = getTrustGradientColor(trustScore)
  const [justUpdated, setJustUpdated] = useState(false)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setJustUpdated(true)
    const timeout = setTimeout(() => setJustUpdated(false), 550)
    return () => clearTimeout(timeout)
  }, [percentage])

  if (!colorCode) {
    return (
      <div className="border-threads-border bg-threads-surface inline-flex w-fit items-center gap-1.5 rounded-full border py-1 pr-1 pl-2.5 text-xs font-medium text-threads-subtle">
        <MessageCircle className="size-3.5" />
        Debate
        {postId && <ListenButton postId={postId} className="size-5" />}
      </div>
    )
  }

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border py-1.5 pr-1.5 pl-2.5 transition-all",
          justUpdated && "animate-score-pop"
        )}
        style={{
          borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${color} 12%, #101010)`,
        }}
      >
        <span className="text-sm font-bold tabular-nums" style={{ color }}>
          {Math.round(animatedPercentage)}%
        </span>
        <span className="text-threads-muted text-[11px]">·</span>
        <span className="text-[11px] font-medium text-threads-subtle">{TRUST_COLOR_LABEL[colorCode]}</span>
        <span className="text-threads-muted text-[11px]">
          · {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </span>
        {postId && <ListenButton postId={postId} className="size-5" />}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border px-4 py-3 transition-all",
        justUpdated && "animate-score-pop"
      )}
      style={{
        borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 10%, #101010)`,
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className="text-3xl font-extrabold tracking-tight tabular-nums transition-colors"
          style={{ color }}
        >
          {Math.round(animatedPercentage)}%
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold" style={{ color }}>
            {TRUST_COLOR_LABEL[colorCode]}
          </span>
          {postId && <ListenButton postId={postId} />}
        </div>
      </div>
      <Progress
        value={animatedPercentage}
        className="h-1.5 bg-white/10"
        indicatorStyle={{ backgroundColor: color }}
      />
      <span className="text-threads-muted text-xs">
        {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
      </span>
    </div>
  )
}
