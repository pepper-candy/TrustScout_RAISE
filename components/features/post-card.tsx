"use client"

import { createElement, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { CircleCheck, CircleDashed, CircleX } from "lucide-react"

import { ListenButton } from "@/components/features/listen-button"
import { AvatarTrustRing, formatVoteCount, TrustBadge } from "@/components/features/trust-badge"
import { useAnimatedNumber } from "@/hooks/use-animated-number"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { PostCategory, PostWithColor, VoteType } from "@/types/database"

const FACTUAL_VOTE_CONFIG: Record<
  VoteType,
  { label: string; icon: typeof CircleCheck; activeClassName: string }
> = {
  TRUE: {
    label: "True",
    icon: CircleCheck,
    activeClassName: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
  },
  PARTIAL: {
    label: "Partial",
    icon: CircleDashed,
    activeClassName: "border-amber-500/40 bg-amber-500/15 text-amber-400",
  },
  FALSE: {
    label: "False",
    icon: CircleX,
    activeClassName: "border-red-500/40 bg-red-500/15 text-red-400",
  },
}

const POLL_VOTE_CONFIG: Record<
  "TRUE" | "FALSE",
  { label: string; icon: typeof CircleCheck; activeClassName: string }
> = {
  TRUE: {
    label: "Agree",
    icon: CircleCheck,
    activeClassName: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
  },
  FALSE: {
    label: "Disagree",
    icon: CircleX,
    activeClassName: "border-red-500/40 bg-red-500/15 text-red-400",
  },
}

const REVEAL_ALIGN: Record<VoteType, string> = {
  TRUE: "left-0 top-0 bottom-0 items-center justify-center",
  FALSE: "right-0 top-0 bottom-0 items-center justify-center",
  PARTIAL: "left-0 right-0 top-0 items-center justify-center",
}

const DRAG_START_THRESHOLD = 6
const SCROLL_UP_THRESHOLD = 8
const PREVIEW_THRESHOLD = 18
const COMMIT_THRESHOLD = 32
const PARTIAL_COMMIT_THRESHOLD = 20
const WITNESS_MOVE_TOLERANCE = 14
const WITNESS_HOLD_MS = 500
const NEUTRAL_VOTE_CONFIG = {
  label: "Neutral",
  icon: CircleDashed,
  activeClassName: "border-amber-500/40 bg-amber-500/15 text-amber-400",
}

const REVEAL_FULL_DRAG_X = 40
const REVEAL_FULL_DRAG_Y = 28

function allowsVerticalVote(category: PostCategory): boolean {
  return category === "FACTUAL" || category === "OPINION"
}

function getVerticalVoteLabel(category: PostCategory): string {
  return category === "OPINION" ? "Neutral" : "Partial"
}

function resolveDirection(
  dx: number,
  dy: number,
  threshold: number,
  allowVertical: boolean
): VoteType | null {
  const absX = Math.abs(dx)
  if (allowVertical && dy >= threshold && dy >= absX) return "PARTIAL"
  if (dx >= threshold) return "TRUE"
  if (dx <= -threshold) return "FALSE"
  return null
}

function getPreviewConfig(category: PostCategory, voteType: VoteType) {
  if (category === "FACTUAL") return FACTUAL_VOTE_CONFIG[voteType]
  if (voteType === "PARTIAL") return NEUTRAL_VOTE_CONFIG
  return POLL_VOTE_CONFIG[voteType]
}

function getRevealStripSize(direction: VoteType | null, offset: { x: number; y: number }) {
  if (direction === "TRUE") return { width: Math.max(offset.x, 0), height: "100%" as const }
  if (direction === "FALSE") return { width: Math.max(-offset.x, 0), height: "100%" as const }
  if (direction === "PARTIAL") return { width: "100%" as const, height: Math.max(offset.y, 0) }
  return { width: 0, height: 0 }
}

function clampDragOffset(
  dx: number,
  dy: number,
  allowVertical: boolean
): { x: number; y: number } {
  const direction = resolveDirection(dx, dy, PREVIEW_THRESHOLD, allowVertical)

  if (direction === "TRUE") {
    return { x: Math.min(REVEAL_FULL_DRAG_X, Math.max(0, dx)), y: 0 }
  }
  if (direction === "FALSE") {
    return { x: Math.max(-REVEAL_FULL_DRAG_X, Math.min(0, dx)), y: 0 }
  }
  if (direction === "PARTIAL") {
    return { x: 0, y: Math.min(REVEAL_FULL_DRAG_Y, Math.max(0, dy)) }
  }

  return {
    x: Math.max(-REVEAL_FULL_DRAG_X, Math.min(REVEAL_FULL_DRAG_X, dx)),
    y: allowVertical ? Math.min(REVEAL_FULL_DRAG_Y, Math.max(0, dy)) : 0,
  }
}

function isVoteCommitted(direction: VoteType, offset: { x: number; y: number }): boolean {
  if (direction === "PARTIAL") return offset.y >= PARTIAL_COMMIT_THRESHOLD
  if (direction === "TRUE") return offset.x >= COMMIT_THRESHOLD
  return offset.x <= -COMMIT_THRESHOLD
}

interface PostCardProps {
  post: PostWithColor
  onVote: (voteType: VoteType, isWitness: boolean) => void
  loadingVoteType: VoteType | null
}

function formatPostDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(isoDate))
}

export function PostCard({ post, onVote, loadingVoteType }: PostCardProps) {
  const isFactual = post.category === "FACTUAL"
  const allowVerticalVote = allowsVerticalVote(post.category)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [witnessArmed, setWitnessArmed] = useState(false)

  const startRef = useRef<{ x: number; y: number } | null>(null)
  const draggingRef = useRef(false)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const witnessArmedRef = useRef(false)

  const isVoting = loadingVoteType !== null
  const isWitnessActive = isFactual && witnessArmed
  const animatedVoteCount = useAnimatedNumber(post.total_votes)
  const previewDirection = isDragging
    ? resolveDirection(offset.x, offset.y, PREVIEW_THRESHOLD, allowVerticalVote)
    : null
  const previewConfig = previewDirection ? getPreviewConfig(post.category, previewDirection) : null
  const revealStrip = getRevealStripSize(previewDirection, offset)
  const verticalVoteLabel =
    previewDirection === "PARTIAL" ? getVerticalVoteLabel(post.category) : null

  function clearHoldTimer() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }

  function resetDrag() {
    clearHoldTimer()
    startRef.current = null
    draggingRef.current = false
    witnessArmedRef.current = false
    setOffset({ x: 0, y: 0 })
    setIsDragging(false)
    setWitnessArmed(false)
  }

  function castVote(voteType: VoteType) {
    if (isVoting) return
    onVote(voteType, isFactual && witnessArmedRef.current)
  }

  function abortForScrollIntent(dx: number, dy: number): boolean {
    // Finger moving up → user is scrolling the feed down; never hijack as a vote drag.
    if (dy <= -SCROLL_UP_THRESHOLD) return true
    if (dy < 0 && Math.abs(dy) > Math.abs(dx)) return true
    return false
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLElement>) {
    if (isVoting) return
    if (e.pointerType === "mouse" && e.button !== 0) return
    if ((e.target as HTMLElement).closest("button")) return
    startRef.current = { x: e.clientX, y: e.clientY }
    clearHoldTimer()
    if (isFactual) {
      holdTimerRef.current = setTimeout(() => {
        witnessArmedRef.current = true
        setWitnessArmed(true)
      }, WITNESS_HOLD_MS)
    }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLElement>) {
    const start = startRef.current
    if (!start) return

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const dist = Math.hypot(dx, dy)

    if (!draggingRef.current) {
      if (dist < DRAG_START_THRESHOLD) return
      if (abortForScrollIntent(dx, dy)) {
        clearHoldTimer()
        startRef.current = null
        return
      }
      draggingRef.current = true
      setIsDragging(true)
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // setPointerCapture can throw if the pointer is already released.
      }
    }

    if (isFactual && !witnessArmedRef.current && dist > WITNESS_MOVE_TOLERANCE) {
      clearHoldTimer()
    }

    setOffset(clampDragOffset(dx, dy, allowVerticalVote))
  }

  function handlePointerUp() {
    if (!startRef.current) return
    const direction = draggingRef.current
      ? resolveDirection(offset.x, offset.y, PREVIEW_THRESHOLD, allowVerticalVote)
      : null
    if (direction && isVoteCommitted(direction, offset)) castVote(direction)
    resetDrag()
  }

  return (
    <div className="border-threads-border relative overflow-hidden border-b p-px">
      {previewConfig && previewDirection && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute z-0 flex",
            REVEAL_ALIGN[previewDirection],
            previewConfig.activeClassName
          )}
          style={{
            width: revealStrip.width === "100%" ? "100%" : revealStrip.width,
            height: revealStrip.height === "100%" ? "100%" : revealStrip.height,
          }}
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap">
            {createElement(previewConfig.icon, { className: "size-4" })}
            {verticalVoteLabel}
          </span>
        </div>
      )}

      <article
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetDrag}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          transition: isDragging ? "none" : "transform 0.25s ease-out",
          touchAction: isDragging ? "none" : "pan-y",
        }}
        className={cn(
          "bg-background relative z-10 grid grid-cols-[48px_minmax(0,1fr)] gap-x-3 px-3 py-3 transition-colors",
          !isVoting && "cursor-grab active:cursor-grabbing",
          isDragging && "select-none",
          isWitnessActive && "animate-witness-glow bg-amber-500/[0.03]"
        )}
      >
        <div className="flex flex-col items-center gap-1 pt-1">
          {isFactual && post.color_code ? (
            <AvatarTrustRing
              trustScore={post.trust_score}
              totalVotes={post.total_votes}
              category={post.category}
            >
              <Avatar className="size-9 border border-threads-border">
                <AvatarFallback className="bg-threads-surface text-threads-primary text-xs font-semibold">
                  {post.author_username.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </AvatarTrustRing>
          ) : (
            <Avatar className="size-9 border border-threads-border">
              <AvatarFallback className="bg-threads-surface text-threads-primary text-xs font-semibold">
                {post.author_username.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="text-threads-muted text-center text-[10px] leading-none tabular-nums">
            {formatVoteCount(Math.round(animatedVoteCount))}
          </span>
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[15px] leading-[21px]">
              <span className="truncate font-semibold text-threads-primary">@{post.author_username}</span>
              <span className="text-threads-muted">·</span>
              <time className="text-threads-muted text-[14.6px]" dateTime={post.created_at}>
                {formatPostDate(post.created_at)}
              </time>
            </div>
            <ListenButton postId={post.id} className="size-5" />
          </div>

          <p className="text-[15px] leading-[21px] text-threads-primary whitespace-pre-wrap">
            {post.content}
          </p>

          {!isFactual && (
            <TrustBadge
              trustScore={post.trust_score}
              colorCode={post.color_code}
              totalVotes={post.total_votes}
              category={post.category}
              compact
            />
          )}
        </div>
      </article>
    </div>
  )
}
