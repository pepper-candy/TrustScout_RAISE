"use client"

import { ShieldCheck, Shuffle } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { calculateVoteWeight } from "@/lib/trustScore"
import { cn } from "@/lib/utils"
import type { CurrentUserProfile } from "@/lib/auth"

interface AppHeaderProps {
  profile: CurrentUserProfile | null
  isLoading: boolean
  isShuffling: boolean
  onShuffle: () => void
}

export function AppHeader({ profile, isLoading, isShuffling, onShuffle }: AppHeaderProps) {
  const weight = profile ? calculateVoteWeight(profile.accuracy_score, false) : null

  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-10 border-b backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm">
            <ShieldCheck className="size-4.5" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-extrabold tracking-tight">TruthScout</h1>
            <p className="text-muted-foreground hidden text-[11px] sm:block">
              Truth, one vote at a time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoading || !profile ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="size-8 rounded-full" />
            </div>
          ) : (
            <>
              <div className="border-border bg-secondary/50 flex items-center gap-2 rounded-full border py-1 pr-3 pl-1">
                <Avatar size="sm">
                  <AvatarFallback className="bg-emerald-100 text-emerald-800 font-semibold">
                    {profile.username.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-24 truncate text-xs font-semibold sm:max-w-none">
                  @{profile.username}
                </span>
                <Badge variant="secondary" className="h-4.5 bg-emerald-100 px-1.5 text-[10px] text-emerald-800">
                  {weight?.toFixed(1)}×
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                title="Switch demo user"
                onClick={onShuffle}
                disabled={isShuffling}
                className="rounded-full"
              >
                <Shuffle className={cn("size-3.5", isShuffling && "animate-spin")} />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
