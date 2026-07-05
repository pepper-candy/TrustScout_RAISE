"use client"

import { MoreHorizontal } from "lucide-react"

function TruthScoutMark() {
  return <img src="/logo.svg" alt="" aria-hidden className="size-8" />
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-threads-border bg-[rgba(16,16,16,0.85)] backdrop-blur-[14px]">
      <div className="mx-auto grid h-[60px] max-w-[414px] grid-cols-[1fr_auto_1fr] items-center px-3">
        <div aria-hidden className="size-8" />

        <div className="flex items-center justify-center">
          <TruthScoutMark />
        </div>

        <div aria-hidden className="size-8" />
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
