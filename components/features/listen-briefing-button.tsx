"use client"

import { useEffect, useRef, useState } from "react"
import { AudioLines, Loader2, VolumeX } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

type PlaybackState = "idle" | "loading" | "playing" | "unavailable"

/**
 * Header control — reads the top 5 popular posts via Gradium TTS.
 * Tap again while playing to stop (same toggle pattern as ListenButton).
 */
export function ListenBriefingButton() {
  const [state, setState] = useState<PlaybackState>("idle")
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  async function handleClick() {
    if (state === "loading" || state === "unavailable") return

    if (state === "playing") {
      audioRef.current?.pause()
      setState("idle")
      return
    }

    setState("loading")
    try {
      const response = await fetch("/api/tts/briefing")

      if (response.status === 404) {
        setState("unavailable")
        return
      }
      if (!response.ok) {
        const { error } = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(error ?? "Failed to generate briefing audio")
      }

      const blob = await response.blob()
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setState("idle")
      audio.onerror = () => setState("idle")

      await audio.play()
      setState("playing")
    } catch (err) {
      toast.error("Couldn't play popular briefing", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
      setState("idle")
    }
  }

  if (state === "unavailable") return null

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={state === "loading"}
      aria-label={
        state === "playing" ? "Stop popular briefing" : "Listen to top 5 popular posts"
      }
      title={state === "playing" ? "Stop briefing" : "Popular briefing — top 5 posts"}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-lg px-2 transition-colors disabled:opacity-50",
        state === "playing"
          ? "bg-white/[0.12] text-threads-primary"
          : "text-threads-muted hover:bg-white/[0.06] hover:text-threads-primary"
      )}
    >
      {state === "loading" ? (
        <Loader2 className="size-[18px] animate-spin" />
      ) : state === "playing" ? (
        <VolumeX className="size-[18px]" strokeWidth={2.25} />
      ) : (
        <AudioLines className="size-[18px]" strokeWidth={1.75} />
      )}
      <span className="text-[11px] font-semibold tracking-wide uppercase">Brief</span>
    </button>
  )
}
