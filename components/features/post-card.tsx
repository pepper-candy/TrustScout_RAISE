"use client"

import { createElement, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { CircleCheck, CircleDashed, CircleX } from "lucide-react"

import { PostMenuButton } from "@/components/features/app-header"
import { TrustBadge } from "@/components/features/trust-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { PostCategory, PostWithColor, VoteType } from "@/types/database"

const CATEGORY_LABEL: Record<PostWithColor["category"], string> = {
  FACTUAL: "Factual",
  OPINION: "Opinion",
  DEBATE: "Debate",
}

const CATEGORY_AVATAR: Record<PostWithColor["category"], string> = {
  FACTUAL: "F",
  OPINION: "O",
  DEBATE: "D",
}

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
  TRUE: "justify-start",
  FALSE: "justify-end",
  PARTIAL: "items-start justify-center pt-2",
}

const DRAG_START_THRESHOLD = 6
const PREVIEW_THRESHOLD = 18
const COMMIT_THRESHOLD = 64
const WITNESS_MOVE_TOLERANCE = 14
const WITNESS_HOLD_MS = 500
const MAX_DRAG = 120

function resolveDirection(
  dx: number,
  dy: number,
  threshold: number,
  allowPartial: boolean
): VoteType | null {
  const absX = Math.abs(dx)
  if (allowPartial && dy >= threshold && dy >= absX) return "PARTIAL"
  if (dx >= threshold) return "TRUE"
  if (dx <= -threshold) return "FALSE"
  return null
}

function getPreviewConfig(category: PostCategory, voteType: VoteType) {
  if (category === "FACTUAL") return FACTUAL_VOTE_CONFIG[voteType]
  if (voteType === "PARTIAL") return null
  return POLL_VOTE_CONFIG[voteType]
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
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [witnessArmed, setWitnessArmed] = useState(false)

  const startRef = useRef<{ x: number; y: number } | null>(null)
  const draggingRef = useRef(false)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const witnessArmedRef = useRef(false)

  const isVoting = loadingVoteType !== null
  const isWitnessActive = isFactual && witnessArmed
  const previewDirection = isDragging
    ? resolveDirection(offset.x, offset.y, PREVIEW_THRESHOLD, isFactual)
    : null
  const previewConfig = previewDirection ? getPreviewConfig(post.category, previewDirection) : null

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

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (isVoting) return
    if (e.pointerType === "mouse" && e.button !== 0) return
    startRef.current = { x: e.clientX, y: e.clientY }
    clearHoldTimer()
    if (isFactual) {
      holdTimerRef.current = setTimeout(() => {
        witnessArmedRef.current = true
        setWitnessArmed(true)
      }, WITNESS_HOLD_MS)
    }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const start = startRef.current
    if (!start) return

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const dist = Math.hypot(dx, dy)

    if (!draggingRef.current) {
      if (dist < DRAG_START_THRESHOLD) return
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

    setOffset({
      x: Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx)),
      y: isFactual ? Math.max(0, Math.min(MAX_DRAG, dy)) : 0,
    })
  }

  function handlePointerUp() {
    if (!startRef.current) return
    const committed = draggingRef.current
      ? resolveDirection(offset.x, offset.y, COMMIT_THRESHOLD, isFactual)
      : null
    if (committed) castVote(committed)
    resetDrag()
  }

  return (
    <article
      className={cn(
        "border-threads-border grid grid-cols-[48px_minmax(0,1fr)] gap-x-3 border-b px-3 py-3 transition-colors",
        isWitnessActive && "animate-witness-glow bg-amber-500/[0.03]"
      )}
    >
      <div className="relative pt-1">
        <Avatar className="size-9 border border-threads-border">
          <AvatarFallback className="bg-threads-surface text-threads-primary text-xs font-semibold">
            {CATEGORY_AVATAR[post.category]}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[15px] leading-[21px]">
            <span className="truncate font-semibold text-threads-primary">TruthScout</span>
            <span className="text-threads-muted">·</span>
            <span className="font-bold text-threads-primary">{CATEGORY_LABEL[post.category]}</span>
            <span className="text-threads-muted">·</span>
            <time className="text-threads-muted text-[14.6px]" dateTime={post.created_at}>
              {formatPostDate(post.created_at)}
            </time>
          </div>
          <PostMenuButton />
        </div>

        <div className="relative overflow-hidden rounded-xl">
          {previewConfig && previewDirection && (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 z-0 flex items-center rounded-xl border px-4",
                REVEAL_ALIGN[previewDirection],
                previewConfig.activeClassName
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                {createElement(previewConfig.icon, { className: "size-4" })}
                {previewConfig.label}
                {isWitnessActive && " · Witness"}
              </span>
            </div>
          )}

          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={resetDrag}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              transition: isDragging ? "none" : "transform 0.25s ease-out",
              touchAction: "none",
            }}
            className={cn(
              "bg-background relative z-10 space-y-2 rounded-xl",
              !isVoting && "cursor-grab active:cursor-grabbing",
              isDragging && "select-none"
            )}
          >
            <p className="text-[15px] leading-[21px] text-threads-primary whitespace-pre-wrap">
              {post.content}
            </p>

            <TrustBadge
              trustScore={post.trust_score}
              colorCode={post.color_code}
              totalVotes={post.total_votes}
              category={post.category}
              postId={post.id}
              compact
            />
          </div>
        </div>
      </div>
    </article>
  )
}
