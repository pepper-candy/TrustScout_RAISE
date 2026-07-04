"use client"

import { createElement, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Loader2,
  Sparkles,
} from "lucide-react"

import { PostMenuButton } from "@/components/features/app-header"
import { TrustBadge } from "@/components/features/trust-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { PostWithColor, VoteType } from "@/types/database"

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

const VOTE_CONFIG: Record<
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

/**
 * Where the "revealed" action indicator sits as the card is dragged, mimicking
 * an Outlook-style swipe: dragging right exposes the left edge, left exposes the
 * right edge, and down exposes the top edge.
 */
const REVEAL_ALIGN: Record<VoteType, string> = {
  TRUE: "justify-start",
  FALSE: "justify-end",
  PARTIAL: "items-start justify-center pt-2",
}

/** Swipe tuning (all in px / ms). */
const DRAG_START_THRESHOLD = 6 // movement that turns a press into a drag (vs. a tap)
const PREVIEW_THRESHOLD = 18 // drag distance at which the action preview appears
const COMMIT_THRESHOLD = 64 // drag distance past which releasing casts the vote
const WITNESS_MOVE_TOLERANCE = 14 // staying within this while holding keeps the witness timer alive
const WITNESS_HOLD_MS = 500 // hold-still duration that arms a witness (elevated) vote
const MAX_DRAG = 120 // clamp so the card never flies off-screen

/** right → TRUE, left → FALSE, down → PARTIAL. Up is not a vote. */
function resolveDirection(dx: number, dy: number, threshold: number): VoteType | null {
  const absX = Math.abs(dx)
  if (dy >= threshold && dy >= absX) return "PARTIAL"
  if (dx >= threshold) return "TRUE"
  if (dx <= -threshold) return "FALSE"
  return null
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
  const [isWitness, setIsWitness] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [witnessArmed, setWitnessArmed] = useState(false)

  const startRef = useRef<{ x: number; y: number } | null>(null)
  const draggingRef = useRef(false)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const witnessArmedRef = useRef(false)

  const isVoting = loadingVoteType !== null
  const isWitnessActive = isWitness || witnessArmed
  const previewDirection = isDragging
    ? resolveDirection(offset.x, offset.y, PREVIEW_THRESHOLD)
    : null

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

  function castVote(voteType: VoteType, witnessOverride?: boolean) {
    if (isVoting) return
    const witness = witnessOverride ?? (isWitness || witnessArmedRef.current)
    onVote(voteType, witness)
    setIsWitness(false)
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (isVoting) return
    if (e.pointerType === "mouse" && e.button !== 0) return
    startRef.current = { x: e.clientX, y: e.clientY }
    clearHoldTimer()
    // Holding still for WITNESS_HOLD_MS *before* swiping arms a witness vote.
    holdTimerRef.current = setTimeout(() => {
      witnessArmedRef.current = true
      setWitnessArmed(true)
    }, WITNESS_HOLD_MS)
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

    // Moving decisively (rather than holding still) means the user is swiping
    // straight away — cancel the pending witness arm unless it already fired.
    if (!witnessArmedRef.current && dist > WITNESS_MOVE_TOLERANCE) {
      clearHoldTimer()
    }

    setOffset({
      x: Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx)),
      y: Math.max(0, Math.min(MAX_DRAG, dy)),
    })
  }

  function handlePointerUp() {
    if (!startRef.current) return
    const committed = draggingRef.current
      ? resolveDirection(offset.x, offset.y, COMMIT_THRESHOLD)
      : null
    if (committed) castVote(committed)
    resetDrag()
  }

  function handleButtonVote(voteType: VoteType) {
    if (isVoting) return
    castVote(voteType, isWitness)
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

        {/* Swipe surface: drag right = True, left = False, down = Partial. */}
        <div className="relative overflow-hidden rounded-xl">
          {previewDirection && (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 z-0 flex items-center rounded-xl border px-4",
                REVEAL_ALIGN[previewDirection],
                VOTE_CONFIG[previewDirection].activeClassName
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                {createElement(VOTE_CONFIG[previewDirection].icon, { className: "size-4" })}
                {VOTE_CONFIG[previewDirection].label}
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

        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsWitness((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setIsWitness((prev) => !prev)
            }
          }}
          aria-disabled={isVoting}
          className={cn(
            "flex w-full cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors",
            isVoting && "pointer-events-none opacity-50",
            isWitnessActive
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
              : "border-threads-border text-threads-muted hover:bg-white/[0.04]"
          )}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className={cn("size-3.5", isWitnessActive && "text-amber-400")} />
            {isWitnessActive
              ? "Marking as firsthand knowledge (Witness)"
              : "I witnessed this firsthand"}
          </span>
          <Switch
            checked={isWitness}
            onCheckedChange={setIsWitness}
            onClick={(e) => e.stopPropagation()}
            disabled={isVoting}
            size="sm"
          />
        </div>

        <p className="text-threads-muted text-[11px] leading-tight">
          Swipe the post → True · ← False · ↓ Partial. Hold before swiping to vote as a Witness.
        </p>

        <div className="-ml-1 flex flex-wrap items-center gap-0.5">
          {(Object.keys(VOTE_CONFIG) as VoteType[]).map((voteType) => {
            const config = VOTE_CONFIG[voteType]
            const Icon = config.icon
            const isThisLoading = loadingVoteType === voteType
            const isMyVote = post.my_vote === voteType

            return (
              <button
                key={voteType}
                type="button"
                disabled={isVoting}
                onClick={() => handleButtonVote(voteType)}
                className={cn(
                  "flex h-9 items-center gap-1 rounded-full border border-transparent px-3 text-[13px] text-threads-subtle transition-all active:scale-95 disabled:cursor-default",
                  !isVoting && "hover:bg-white/[0.06]",
                  (isThisLoading || isMyVote) && config.activeClassName
                )}
              >
                {isThisLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Icon className="size-[18px]" strokeWidth={1.75} />
                )}
                <span>{config.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </article>
  )
}
