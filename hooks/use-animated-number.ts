"use client"

import { useEffect, useRef, useState } from "react"

const DEFAULT_DURATION_MS = 700

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Smoothly animates a numeric value toward `target` whenever it changes,
 * powering the "rolling" trust-score badge (rather than snapping instantly).
 */
export function useAnimatedNumber(target: number, durationMs = DEFAULT_DURATION_MS): number {
  const [displayValue, setDisplayValue] = useState(target)
  const frameRef = useRef<number | null>(null)
  const fromRef = useRef(target)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return

    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / durationMs)
      const eased = easeOutCubic(progress)
      const next = from + (target - from) * eased
      setDisplayValue(next)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      fromRef.current = target
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs])

  return displayValue
}
