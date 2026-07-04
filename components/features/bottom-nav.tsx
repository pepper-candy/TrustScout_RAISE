"use client"

import { Heart, Home, Plus, Search } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { CurrentUserProfile } from "@/lib/auth"

interface BottomNavProps {
  profile: CurrentUserProfile | null
  isShuffling: boolean
  onProfileTap: () => void
}

export function BottomNav({ profile, isShuffling, onProfileTap }: BottomNavProps) {
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
          disabled
          aria-label="Create post"
          className="flex flex-col items-center justify-center opacity-50"
        >
          <span className="flex size-[42px] items-center justify-center rounded-lg bg-white/[0.08]">
            <Plus className="text-threads-muted size-6" strokeWidth={1.5} />
          </span>
        </button>
        <NavItem icon={Heart} label="Activity" showDot disabled />
        <button
          type="button"
          aria-label="Switch demo user"
          disabled={isShuffling || !profile}
          onClick={onProfileTap}
          className="flex flex-col items-center justify-center disabled:opacity-50"
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
