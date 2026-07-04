"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Volume2, VolumeX } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

interface ListenButtonProps {
  postId: string
  className?: string
}

type PlaybackState = "idle" | "loading" | "playing" | "unavailable"

/**
 * "🔊 Listen" button from PROJECT_PLAN.md Section 10 — fetches Gradium TTS
 * audio for a post's trust summary and plays it. Fully non-blocking: a
 * failed or unconfigured Gradium integration just disables the button
 * instead of surfacing an error, since this is a bonus/demo feature.
 */
export function ListenButton({ postId, className }: ListenButtonProps) {
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
      const response = await fetch(`/api/tts?post_id=${postId}`)

      if (response.status === 404) {
        setState("unavailable")
        return
      }
      if (!response.ok) {
        const { error } = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(error ?? "Failed to generate audio")
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
      toast.error("Couldn't play trust summary", {
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
      aria-label={state === "playing" ? "Stop trust summary" : "Listen to trust summary"}
      title={state === "playing" ? "Stop" : "Listen to trust summary"}
      className={cn(
        "text-threads-muted hover:text-threads-primary inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/[0.08] disabled:opacity-50",
        className
      )}
    >
      {state === "loading" ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : state === "playing" ? (
        <VolumeX className="size-3.5" />
      ) : (
        <Volume2 className="size-3.5" />
      )}
    </button>
  )
}
