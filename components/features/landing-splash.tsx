"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

const MIN_VISIBLE_MS = 2000
const FADE_OUT_MS = 500

interface LandingSplashProps {
  isLoadingFeed: boolean
  postsCount: number
}

export function LandingSplash({ isLoadingFeed, postsCount }: LandingSplashProps) {
  const mountedAt = useRef(Date.now())
  const [phase, setPhase] = useState<"visible" | "fading" | "hidden">("visible")

  // Feed returns in one batch; dismiss once loaded (10+ posts when available, or all if fewer).
  const feedReady = !isLoadingFeed && (postsCount >= 10 || postsCount < 10)

  useEffect(() => {
    if (phase !== "visible" || !feedReady) return

    const elapsed = Date.now() - mountedAt.current
    const delay = Math.max(0, MIN_VISIBLE_MS - elapsed)

    const timer = window.setTimeout(() => setPhase("fading"), delay)
    return () => window.clearTimeout(timer)
  }, [feedReady, phase])

  useEffect(() => {
    if (phase !== "fading") return

    const timer = window.setTimeout(() => setPhase("hidden"), FADE_OUT_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  if (phase === "hidden") return null

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-50 flex items-center justify-center transition-opacity ease-out"
      style={{
        backgroundColor: "#1a1a1a",
        opacity: phase === "fading" ? 0 : 1,
        transitionDuration: `${FADE_OUT_MS}ms`,
        pointerEvents: phase === "fading" ? "none" : "auto",
      }}
    >
      <Image
        src="/landing.png"
        alt=""
        width={280}
        height={280}
        priority
        className="h-auto w-[min(72vw,280px)] transition-opacity ease-out"
        style={{
          opacity: phase === "fading" ? 0 : 1,
          transitionDuration: `${FADE_OUT_MS}ms`,
        }}
      />
    </div>
  )
}
