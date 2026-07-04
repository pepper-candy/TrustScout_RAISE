"use client"

import { useState } from "react"
import { Dialog } from "radix-ui"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { CurrentUserProfile } from "@/lib/auth"

const MAX_LENGTH = 500
const MIN_LENGTH = 3

interface ComposePostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: CurrentUserProfile | null
  onSubmit: (content: string) => Promise<void>
}

/**
 * The messaging-box "new post" prompt behind the bottom-nav "+" button.
 * Submission runs the content through Vultr AI classification (server-side,
 * via `POST /api/posts`) before the post is inserted, so every post that
 * reaches the feed already carries a FACTUAL / OPINION / DEBATE category.
 */
export function ComposePostDialog({ open, onOpenChange, profile, onSubmit }: ComposePostDialogProps) {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const trimmedLength = content.trim().length
  const isValid = trimmedLength >= MIN_LENGTH && trimmedLength <= MAX_LENGTH

  function handleOpenChange(nextOpen: boolean) {
    if (isSubmitting) return
    if (!nextOpen) setContent("")
    onOpenChange(nextOpen)
  }

  async function handleSubmit() {
    if (!isValid || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit(content.trim())
      setContent("")
      onOpenChange(false)
    } catch (err) {
      toast.error("Couldn't create your post", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="border-threads-border bg-background fixed top-1/2 left-1/2 z-50 w-[calc(100%-32px)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-4 shadow-2xl outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-threads-primary text-[15px] font-semibold">New post</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              disabled={isSubmitting}
              className="text-threads-muted hover:bg-white/[0.08] hover:text-threads-primary flex size-7 items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-threads-muted mt-1 text-xs leading-snug">
            TruthScout AI checks whether this reads as factual, opinion, or an open debate before it goes live for everyone.
          </Dialog.Description>

          <div className="mt-4 flex gap-3">
            <Avatar className="border-threads-border size-9 shrink-0 border">
              <AvatarFallback className="bg-threads-surface text-threads-primary text-xs font-semibold">
                {profile?.username.slice(0, 1).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <Textarea
              autoFocus
              value={content}
              onChange={(event) => setContent(event.target.value.slice(0, MAX_LENGTH))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  void handleSubmit()
                }
              }}
              placeholder="What's going on? Share a claim, opinion, or question worth debating…"
              disabled={isSubmitting}
              rows={4}
              className="text-threads-primary min-h-[84px] border-none bg-transparent p-0 text-[15px] leading-[21px] shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span
              className={cn(
                "text-threads-muted text-[11px] tabular-nums",
                trimmedLength > MAX_LENGTH && "text-red-400"
              )}
            >
              {trimmedLength}/{MAX_LENGTH}
            </span>
            <Button
              type="button"
              size="sm"
              disabled={!isValid || isSubmitting}
              onClick={() => void handleSubmit()}
              className="rounded-full px-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Checking with AI…
                </>
              ) : (
                "Post"
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
