"use client"

import { useState } from "react"
import { Dialog } from "radix-ui"
import { Loader2, Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const MAX_LENGTH = 500
const MIN_LENGTH = 3

interface ComposePostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (content: string) => Promise<void>
}

/**
 * The messaging-box "new post" prompt behind the bottom-nav "+" button.
 * Submission runs the content through Vultr AI classification (server-side,
 * via `POST /api/posts`) before the post is inserted, so every post that
 * reaches the feed already carries a FACTUAL / OPINION / DEBATE category.
 */
export function ComposePostDialog({ open, onOpenChange, onSubmit }: ComposePostDialogProps) {
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
          className="border-threads-border bg-background fixed top-[72px] left-1/2 z-50 w-[calc(100%-32px)] max-w-[400px] -translate-x-1/2 rounded-2xl border p-4 shadow-2xl outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <Dialog.Title className="sr-only">New post</Dialog.Title>

          <div className="border-threads-border rounded-xl border bg-threads-surface px-3.5 pt-4 pb-3">
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
              placeholder="What's NEW?"
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
              size="xs"
              disabled={!isValid || isSubmitting}
              onClick={() => void handleSubmit()}
              className="h-7 gap-1.5 rounded-lg px-3 text-xs font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  Send
                </>
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
