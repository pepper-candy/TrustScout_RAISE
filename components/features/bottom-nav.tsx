"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeftRight, Plus, User } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { CurrentUserProfile } from "@/lib/auth"
import type { PostCategory } from "@/types/database"

export type FeedFilter = "ALL" | PostCategory

export const FEED_FILTER_CYCLE: FeedFilter[] = ["ALL", "FACTUAL", "OPINION", "DEBATE"]

const LABEL_HIDE_MS = 5000
const PANEL_ICON_EXPAND_SHIFT = "2.75rem"
const PANEL_ICON_HALF = "21px"
const PANEL_LABEL_GAP = "0.5rem"

interface BottomNavProps {
  profile: CurrentUserProfile | null
  isLoading: boolean
  categoryFilter: FeedFilter
  onCategoryFilterChange: () => void
  onCompose: () => void
}

export function BottomNav({
  profile,
  isLoading,
  categoryFilter,
  onCategoryFilterChange,
  onCompose,
}: BottomNavProps) {
  const [filterLabelVisible, setFilterLabelVisible] = useState(false)
  const [profileLabelVisible, setProfileLabelVisible] = useState(false)
  const filterHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const profileHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearTimer(timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function scheduleHide(
    timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    hide: () => void
  ) {
    clearTimer(timerRef)
    timerRef.current = setTimeout(hide, LABEL_HIDE_MS)
  }

  function handleFilterClick() {
    onCategoryFilterChange()
    setFilterLabelVisible(true)
    scheduleHide(filterHideTimerRef, () => setFilterLabelVisible(false))
  }

  function handleProfileClick() {
    if (!profile) return
    setProfileLabelVisible(true)
    scheduleHide(profileHideTimerRef, () => setProfileLabelVisible(false))
  }

  useEffect(() => {
    return () => {
      clearTimer(filterHideTimerRef)
      clearTimer(profileHideTimerRef)
    }
  }, [])

  return (
    <nav
      aria-label="Main navigation"
      className="border-threads-border fixed inset-x-0 bottom-0 z-20 border-t bg-[rgba(16,16,16,0.85)] backdrop-blur-[14px]"
    >
      <div className="mx-auto grid h-[50px] max-w-[414px] grid-cols-[1fr_auto_1fr] items-center px-3">
        <button
          type="button"
          aria-label={`Feed filter: ${categoryFilter}. Tap to switch.`}
          onClick={handleFilterClick}
          className="group/filter relative block h-[42px] w-full min-w-0 pr-3 transition-opacity active:opacity-90"
        >
          <span
            className={cn(
              "absolute top-0 flex size-[42px] -translate-x-1/2 items-center justify-center rounded-lg bg-white/[0.08]",
              "transition-[left] duration-300 ease-out",
              "group-hover/filter:bg-white/[0.14] group-active/filter:scale-95"
            )}
            style={{
              left: filterLabelVisible ? `calc(50% - ${PANEL_ICON_EXPAND_SHIFT})` : "50%",
            }}
          >
            <ArrowLeftRight className="text-threads-muted size-6" strokeWidth={2} />
          </span>
          <span
            aria-hidden={!filterLabelVisible}
            className={cn(
              "absolute top-0 flex h-[42px] items-center overflow-hidden transition-[max-width,opacity,left] duration-300 ease-out",
              filterLabelVisible ? "max-w-24 opacity-100" : "max-w-0 opacity-0"
            )}
            style={{
              left: filterLabelVisible
                ? `calc(50% - ${PANEL_ICON_EXPAND_SHIFT} + ${PANEL_ICON_HALF} + ${PANEL_LABEL_GAP})`
                : `calc(50% + ${PANEL_ICON_HALF})`,
            }}
          >
            <span className="truncate whitespace-nowrap pr-0.5 text-[11px] font-semibold tracking-wide text-threads-primary uppercase">
              {categoryFilter}
            </span>
          </span>
        </button>

        <button
          type="button"
          disabled={!profile}
          aria-label="Create post"
          onClick={onCompose}
          className="flex shrink-0 items-center justify-center disabled:opacity-50"
        >
          <span className="flex size-[42px] items-center justify-center rounded-lg bg-white/[0.08] transition-colors hover:bg-white/[0.14] active:scale-95">
            <Plus className="text-threads-primary size-6" strokeWidth={1.5} />
          </span>
        </button>

        {isLoading || !profile ? (
          <div className="flex h-[42px] w-full min-w-0 items-center justify-center pl-3">
            <Skeleton className="size-[42px] rounded-lg bg-threads-surface" />
          </div>
        ) : (
          <button
            type="button"
            aria-label={`Signed in as @${profile.username}. Tap to show.`}
            onClick={handleProfileClick}
            className="group/profile relative block h-[42px] w-full min-w-0 pl-3 transition-opacity active:opacity-90"
          >
            <span
              className={cn(
                "absolute top-0 flex size-[42px] -translate-x-1/2 items-center justify-center rounded-lg bg-white/[0.08]",
                "transition-[left] duration-300 ease-out",
                "group-hover/profile:bg-white/[0.14] group-active/profile:scale-95"
              )}
              style={{
                left: profileLabelVisible ? `calc(50% - ${PANEL_ICON_EXPAND_SHIFT})` : "50%",
              }}
            >
              <User className="text-threads-muted size-6" strokeWidth={2} />
            </span>
            <span
              aria-hidden={!profileLabelVisible}
              className={cn(
                "absolute top-0 flex h-[42px] items-center overflow-hidden transition-[max-width,opacity,left] duration-300 ease-out",
                profileLabelVisible ? "max-w-28 opacity-100" : "max-w-0 opacity-0"
              )}
              style={{
                left: profileLabelVisible
                  ? `calc(50% - ${PANEL_ICON_EXPAND_SHIFT} + ${PANEL_ICON_HALF} + ${PANEL_LABEL_GAP})`
                  : `calc(50% + ${PANEL_ICON_HALF})`,
              }}
            >
              <span className="truncate whitespace-nowrap pr-0.5 text-[11px] font-semibold text-threads-primary">
                @{profile.username}
              </span>
            </span>
          </button>
        )}
      </div>
    </nav>
  )
}
