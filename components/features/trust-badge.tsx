"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { MessageCircle } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { useAnimatedNumber } from "@/hooks/use-animated-number"
import {
  getDisplayTrustScore,
  getTrustGradientColor,
} from "@/lib/trustScore"
import { cn } from "@/lib/utils"
import type { PostCategory, TrustColorCode } from "@/types/database"

const NO_SCORE_CATEGORY_LABEL: Partial<Record<PostCategory, string>> = {
  OPINION: "Opinion",
  DEBATE: "Debate",
}

export function formatVoteCount(count: number): string {
  return `${count} ${count === 1 ? "vote" : "votes"}`
}

interface AvatarTrustRingProps {
  trustScore: number
  totalVotes: number
  category: PostCategory
  children: ReactNode
  size?: number
}

/** Colored trust arc wrapped around the author avatar (factual posts only). */
export function AvatarTrustRing({
  trustScore,
  totalVotes,
  category,
  children,
  size = 40,
}: AvatarTrustRingProps) {
  const displayScore = getDisplayTrustScore({ category, trust_score: trustScore, total_votes: totalVotes })
  const percentage = Math.round(displayScore * 100)
  const animatedPercentage = useAnimatedNumber(percentage)
  const color = getTrustGradientColor(displayScore)
  const stroke = 2.5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clampedFill = Math.min(100, Math.max(0, Math.round(animatedPercentage)))
  const offset = circumference - (clampedFill / 100) * circumference

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={`${clampedFill} percent trust score`}
    >
      <svg
        width={size}
        height={size}
        className="pointer-events-none absolute inset-0 -rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="relative z-10">{children}</div>
    </div>
  )
}

interface TrustBadgeProps {
  trustScore: number
  colorCode: TrustColorCode | null
  totalVotes: number
  compact?: boolean
  category: PostCategory
}

export function TrustBadge({
  trustScore,
  colorCode,
  totalVotes,
  compact = false,
  category,
}: TrustBadgeProps) {
  const displayScore = getDisplayTrustScore({ category, trust_score: trustScore, total_votes: totalVotes })
  const percentage = Math.round(displayScore * 100)
  const animatedPercentage = useAnimatedNumber(percentage)
  const color = getTrustGradientColor(displayScore)
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
  }, [percentage, totalVotes])

  if (!colorCode) {
    return (
      <div
        className={cn(
          "border-threads-border bg-threads-surface inline-flex w-fit items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-2.5 text-xs font-medium text-threads-subtle transition-all",
          justUpdated && "animate-score-pop"
        )}
      >
        <MessageCircle className="size-3.5" />
        {NO_SCORE_CATEGORY_LABEL[category] ?? "Debate"}
        {totalVotes > 0 && (
          <>
            <span className="text-threads-muted">·</span>
            <span className="tabular-nums">{Math.round(animatedPercentage)}%</span>
          </>
        )}
      </div>
    )
  }

  if (compact) {
    return null
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
