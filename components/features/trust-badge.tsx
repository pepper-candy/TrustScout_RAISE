"use client"

import { useEffect, useRef, useState } from "react"
import { MessageCircle } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { useAnimatedNumber } from "@/hooks/use-animated-number"
import { TRUST_COLOR_LABEL, getTrustGradientColor } from "@/lib/trustScore"
import { cn } from "@/lib/utils"
import type { TrustColorCode } from "@/types/database"

interface TrustBadgeProps {
  trustScore: number
  colorCode: TrustColorCode | null
  totalVotes: number
}

/**
 * Large, animated red→green trust score banner for FACTUAL posts, or a
 * simple "Debate" chip for OPINION/DEBATE posts (which have no trust score).
 */
export function TrustBadge({ trustScore, colorCode, totalVotes }: TrustBadgeProps) {
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
      <div className="border-border bg-secondary/60 text-secondary-foreground inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium">
        <MessageCircle className="size-3.5" />
        Debate
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
        backgroundColor: `color-mix(in srgb, ${color} 10%, var(--card))`,
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className="text-3xl font-extrabold tracking-tight tabular-nums transition-colors"
          style={{ color }}
        >
          {Math.round(animatedPercentage)}%
        </span>
        <span className="text-sm font-semibold" style={{ color }}>
          {TRUST_COLOR_LABEL[colorCode]}
        </span>
      </div>
      <Progress
        value={animatedPercentage}
        className="h-1.5 bg-black/5"
        indicatorStyle={{ backgroundColor: color }}
      />
      <span className="text-muted-foreground text-xs">
        {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
      </span>
    </div>
  )
}
