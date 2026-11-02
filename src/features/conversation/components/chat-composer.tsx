"use client"

import { useEffect, useRef, type KeyboardEvent } from "react"
import { ArrowUp, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const MAX_HEIGHT = 160
const DEFAULT_LIMIT = 4000

interface ChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  isSending?: boolean
  limit?: number
  note?: string
  placeholder?: string
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  disabled = false,
  isSending = false,
  limit = DEFAULT_LIMIT,
  note,
  placeholder = "Ask a follow-up or start a new chat…",
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canSend = value.trim().length > 0 && !disabled && !isSending

  useEffect(() => {
    const node = textareaRef.current
    if (!node) return
    node.style.height = "auto"
    node.style.height = `${Math.min(node.scrollHeight, MAX_HEIGHT)}px`
  }, [value])

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return
    // IME composition: Enter confirms the candidate, it must not send.
    if (event.nativeEvent.isComposing) return
    event.preventDefault()
    if (canSend) onSend()
  }

  return (
    <div className="shrink-0 border-t border-border bg-card/60 p-3 sm:p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (canSend) onSend()
        }}
        className="rounded-2xl border border-border bg-background shadow-sm transition-colors focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/40"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          maxLength={limit}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          aria-label="Message"
          className="max-h-40 w-full resize-none bg-transparent px-3.5 pt-3 pb-1 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />

        <div className="flex items-center gap-2 px-2 pb-2">
          <span className="hidden flex-1 items-center gap-1 text-[10px] text-muted-foreground sm:flex">
            <kbd className="rounded border border-border bg-secondary/70 px-1 font-sans">Enter</kbd>
            to send
            <span aria-hidden="true">·</span>
            <kbd className="rounded border border-border bg-secondary/70 px-1 font-sans">Shift</kbd>
            <span aria-hidden="true">+</span>
            <kbd className="rounded border border-border bg-secondary/70 px-1 font-sans">Enter</kbd>
            for a new line
          </span>

          <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
            {value.length} / {limit}
          </span>

          <button
            type="submit"
            disabled={!canSend}
            aria-label={isSending ? "Sending message" : "Send message"}
            className={cn(
              "flex size-8 items-center justify-center rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              canSend
                ? "bg-primary text-primary-foreground hover:bg-primary/85"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </form>

      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        {isSending
          ? "Waiting for the reply… your draft is safe."
          : note ?? "One message uses one generation. Failed replies are refunded automatically."}
      </p>
    </div>
  )
}

export default ChatComposer
