"use client"

import { Heart, Home, Plus, Search } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { CurrentUserProfile } from "@/lib/auth"

/** See the matching flag in `app-header.tsx` — tapping the avatar to shuffle users is hidden, kept for debugging. */
const SHOW_SHUFFLE_DEBUG_CONTROL = false

interface BottomNavProps {
  profile: CurrentUserProfile | null
  isShuffling: boolean
  onProfileTap: () => void
  onCompose: () => void
}

export function BottomNav({ profile, isShuffling, onProfileTap, onCompose }: BottomNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="border-threads-border fixed inset-x-0 bottom-0 z-20 border-t bg-[rgba(16,16,16,0.85)] backdrop-blur-[14px]"
    >
      <div className="mx-auto grid h-[50px] max-w-[414px] grid-cols-5 items-center px-1">
        <NavItem icon={Home} label="Home" active />
        <NavItem icon={Search} label="Search" disabled />
        <button
          type="button"
          disabled={!profile}
          aria-label="Create post"
          onClick={onCompose}
          className="flex flex-col items-center justify-center disabled:opacity-50"
        >
          <span className="flex size-[42px] items-center justify-center rounded-lg bg-white/[0.08] transition-colors hover:bg-white/[0.14]">
            <Plus className="text-threads-primary size-6" strokeWidth={1.5} />
          </span>
        </button>
        <NavItem icon={Heart} label="Activity" showDot disabled />
        <button
          type="button"
          aria-label="Your profile"
          disabled={!SHOW_SHUFFLE_DEBUG_CONTROL || isShuffling || !profile}
          onClick={onProfileTap}
          className="flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-default"
        >
          <Avatar size="sm" className="size-6">
            <AvatarFallback className="bg-threads-surface text-threads-primary text-[10px] font-semibold">
              {profile?.username.slice(0, 1).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>
    </nav>
  )
}

function NavItem({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  showDot = false,
}: {
  icon: typeof Home
  label: string
  active?: boolean
  disabled?: boolean
  showDot?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-center justify-center py-2 disabled:cursor-default",
        disabled && !active && "opacity-50"
      )}
    >
      <Icon
        className={cn("size-6", active ? "text-threads-primary" : "text-threads-muted")}
        strokeWidth={active ? 2 : 1.5}
      />
      {showDot && (
        <span className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-[2px] bg-[#ff0034]" />
      )}
    </button>
  )
}
