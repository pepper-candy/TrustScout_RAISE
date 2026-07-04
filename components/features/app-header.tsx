"use client"

import { MoreHorizontal, Shuffle } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { calculateVoteWeight } from "@/lib/trustScore"
import { cn } from "@/lib/utils"
import type { CurrentUserProfile } from "@/lib/auth"

/**
 * Every browser now gets its own real, randomly-registered identity on
 * first visit (see `lib/auth.ts`), so manually shuffling to a different
 * demo user is no longer a user-facing concept. The control (and its
 * `onShuffle` wiring in `app/page.tsx`) is kept, just hidden, so it's easy
 * to re-enable while debugging reputation/weight differences.
 */
const SHOW_SHUFFLE_DEBUG_CONTROL = false

interface AppHeaderProps {
  profile: CurrentUserProfile | null
  isLoading: boolean
  isShuffling: boolean
  onShuffle: () => void
}

function TruthScoutMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      className="size-8 text-threads-primary"
      fill="none"
    >
      <circle cx="16" cy="16" r="12.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M16 8.5c-2.2 0-4 1.8-4 4 0 1.8 1.2 3.3 2.8 3.8v.2c0 .8.7 1.5 1.5 1.5h.7c.8 0 1.5-.7 1.5-1.5v-.2c1.6-.5 2.8-2 2.8-3.8 0-2.2-1.8-4-4-4Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function AppHeader({ profile, isLoading, isShuffling, onShuffle }: AppHeaderProps) {
  const weight = profile ? calculateVoteWeight(profile.accuracy_score, false) : null

  return (
    <header className="sticky top-0 z-20 border-b border-threads-border bg-[rgba(16,16,16,0.85)] backdrop-blur-[14px]">
      <div className="mx-auto grid h-[60px] max-w-[414px] grid-cols-[1fr_auto_1fr] items-center px-3">
        <div aria-hidden className="size-8" />

        <div className="flex items-center justify-center">
          <TruthScoutMark />
        </div>

        <div className="flex items-center justify-end gap-1.5">
          {isLoading || !profile ? (
            <>
              <Skeleton className="h-7 w-16 rounded-full bg-threads-surface" />
              <Skeleton className="size-8 rounded-full bg-threads-surface" />
            </>
          ) : (
            <>
              <div className="border-threads-border bg-threads-surface/80 flex max-w-[140px] items-center gap-1.5 rounded-full border py-1 pr-2 pl-1">
                <Avatar size="sm" className="size-6">
                  <AvatarFallback className="bg-white/10 text-threads-primary text-[10px] font-semibold">
                    {profile.username.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-[11px] font-semibold text-threads-primary">
                  @{profile.username}
                </span>
                <Badge
                  variant="secondary"
                  className="h-4 bg-white/10 px-1 text-[9px] text-threads-subtle"
                >
                  {weight?.toFixed(1)}×
                </Badge>
              </div>
              {SHOW_SHUFFLE_DEBUG_CONTROL && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Switch demo user"
                  onClick={onShuffle}
                  disabled={isShuffling}
                  className="text-threads-muted hover:bg-white/8 hover:text-threads-primary rounded-full"
                >
                  <Shuffle className={cn("size-4", isShuffling && "animate-spin")} />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export function PostMenuButton() {
  return (
    <button
      type="button"
      aria-label="Post options"
      className="text-threads-muted hover:text-threads-primary flex size-5 items-center justify-center rounded-full transition-colors"
    >
      <MoreHorizontal className="size-4" />
    </button>
  )
}
