"use client"

import type { ReactNode } from "react"
import { Clock, MoreHorizontal, TrendingUp } from "lucide-react"

import { cn } from "@/lib/utils"

import type { FeedSort } from "@/lib/feedSort"

interface AppHeaderProps {
  sort: FeedSort
  onSortChange: (sort: FeedSort) => void
}

function TruthScoutMark() {
  return <img src="/logo.svg" alt="" aria-hidden className="size-8" />
}

export function AppHeader({ sort, onSortChange }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-threads-border bg-[rgba(16,16,16,0.85)] backdrop-blur-[14px]">
      <div className="mx-auto grid h-[60px] max-w-[414px] grid-cols-[1fr_auto_1fr] items-center px-3">
        <div className="flex items-center gap-1">
          <SortIconButton
            label="Latest posts"
            active={sort === "latest"}
            onClick={() => onSortChange("latest")}
          >
            <Clock className="size-[18px]" strokeWidth={sort === "latest" ? 2.25 : 1.75} />
          </SortIconButton>
          <SortIconButton
            label="Popular posts"
            active={sort === "popular"}
            onClick={() => onSortChange("popular")}
          >
            <TrendingUp className="size-[18px]" strokeWidth={sort === "popular" ? 2.25 : 1.75} />
          </SortIconButton>
        </div>

        <div className="flex items-center justify-center">
          <TruthScoutMark />
        </div>

        <div aria-hidden className="size-8" />
      </div>
    </header>
  )
}

function SortIconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg transition-colors",
        active
          ? "bg-white/[0.12] text-threads-primary"
          : "text-threads-muted hover:bg-white/[0.06] hover:text-threads-primary"
      )}
    >
      {children}
    </button>
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
