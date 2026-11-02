"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  ArrowDown,
  Check,
  MessageSquareDashed,
  PanelLeft,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react"

import type { ConversationApiError } from "../lib/errors"
import type { ConversationSession } from "../lib/types"
import { groupSessionDate, titleFromMessage } from "../lib/format"
import { ChatComposer } from "./chat-composer"
import { ChatMessage, providerLabel } from "./chat-message"

const STARTERS = [
  "Write three product taglines for a ceramic mug",
  "Critique this homepage headline",
  "Turn these notes into a launch email",
]

const AVATAR = (
  <div
    aria-hidden="true"
    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary"
  >
    <span className="text-[10px] font-black tracking-tight">V</span>
  </div>
)

function dayLabel(value: string | Date, now: Date): string {
  const group = groupSessionDate(value, now)
  if (group === "Today" || group === "Yesterday") return group

  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  })
}

interface ChatThreadProps {
  session: ConversationSession | undefined
  hasSession: boolean
  isLoading: boolean
  loadError: ConversationApiError | null
  isSending: boolean
  pendingText: string | null
  sendError: ConversationApiError | null
  draft: string
  creditsLabel: string
  isRenaming: boolean
  onDraftChange: (value: string) => void
  onSend: () => void
  onRetrySend: () => void
  onDismissError: () => void
  onOpenRail: () => void
  onNewChat: () => void
  onRename: (title: string) => void
  onDelete: () => void
}

export function ChatThread({
  session,
  hasSession,
  isLoading,
  loadError,
  isSending,
  pendingText,
  sendError,
  draft,
  creditsLabel,
  isRenaming,
  onDraftChange,
  onSend,
  onRetrySend,
  onDismissError,
  onOpenRail,
  onNewChat,
  onRename,
  onDelete,
}: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const nearBottomRef = useRef(true)
  const [showJump, setShowJump] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")
  const [now] = useState(() => new Date())

  const messages = useMemo(
    () => (session?.messages ?? []).filter((message) => message.role !== "system"),
    [session]
  )

  const firstUser = messages.find((message) => message.role === "user")
  const title =
    session?.title?.trim() ||
    (firstUser ? titleFromMessage(firstUser.content) : "New conversation")

  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant")
  const lastProvider = lastAssistant?.provider ?? null
  const lastMock = lastAssistant?.mock ?? false

  const showStarter = !hasSession && !pendingText && !isSending

  const handleScroll = () => {
    const node = scrollRef.current
    if (!node) return
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight
    nearBottomRef.current = distance < 80
    setShowJump(distance >= 120)
  }

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    if (nearBottomRef.current || isSending) {
      node.scrollTop = node.scrollHeight
    }
  }, [messages.length, pendingText, isSending, session?.sessionId])

  const startRename = () => {
    setTitleDraft(title)
    setEditingTitle(true)
  }

  const commitRename = () => {
    const next = titleDraft.trim()
    setEditingTitle(false)
    if (next && next !== title) onRename(next)
  }

  const jumpToLatest = () => {
    const node = scrollRef.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" })
    nearBottomRef.current = true
    setShowJump(false)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card/40 px-2.5 py-2 sm:px-4">
        <button
          type="button"
          onClick={onOpenRail}
          aria-label="Open conversations"
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <PanelLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Chats
        </button>

        <div className="min-w-0 flex-1">
          {editingTitle && hasSession ? (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                commitRename()
              }}
              className="flex items-center gap-1"
            >
              <input
                autoFocus
                value={titleDraft}
                maxLength={80}
                onChange={(event) => setTitleDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setEditingTitle(false)
                }}
                aria-label="Chat title"
                className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <button
                type="submit"
                disabled={isRenaming}
                aria-label="Save title"
                className="rounded-md p-1 text-muted-foreground outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setEditingTitle(false)}
                aria-label="Cancel rename"
                className="rounded-md p-1 text-muted-foreground outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              {hasSession ? (
                <button
                  type="button"
                  onClick={startRename}
                  aria-label="Rename chat"
                  className="rounded-md p-1 text-muted-foreground opacity-60 transition-opacity outline-none hover:bg-secondary hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                </button>
              ) : null}
              {lastMock ? (
                <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Mock
                </span>
              ) : null}
            </div>
          )}

          <p className="truncate text-[10px] text-muted-foreground">
            {hasSession
              ? `${messages.length} message${messages.length === 1 ? "" : "s"}`
              : "Ask anything about copy, names, or next steps"}
            {lastProvider ? ` · ${providerLabel(lastProvider, lastAssistant?.model)}` : ""}
          </p>
        </div>

        <span className="hidden shrink-0 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold text-primary sm:inline">
          {creditsLabel}
        </span>

        <button
          type="button"
          onClick={onNewChat}
          aria-label="New chat"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={!hasSession || isSending}
          aria-label="Delete chat"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors outline-none hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          aria-live="polite"
          aria-relevant="additions"
          className="h-full overflow-y-auto px-3 py-4 sm:px-6"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            {isLoading ? (
              <div className="space-y-4 py-6">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="flex items-start gap-2.5">
                    <div className="h-7 w-7 shrink-0 animate-pulse rounded-lg bg-secondary" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
                      <div className="h-3 w-2/3 animate-pulse rounded bg-secondary/70" />
                    </div>
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-center">
                <MessageSquareDashed
                  className="mx-auto mb-2 h-6 w-6 text-destructive/60"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold text-foreground">{loadError.copy.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{loadError.copy.message}</p>
                <button
                  type="button"
                  onClick={onNewChat}
                  className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors outline-none hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Start a new chat
                </button>
              </div>
            ) : showStarter ? (
              <div className="mx-auto flex max-w-md flex-col items-center py-8 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                  <span className="text-sm font-black">V</span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">Start with a real task</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick a starting point or write your own. The first send creates the chat.
                </p>
                <div className="mt-4 flex w-full flex-col gap-1.5">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => onDraftChange(starter)}
                      className="rounded-xl border border-border bg-card px-3 py-2 text-left text-xs text-muted-foreground transition-colors outline-none hover:border-primary/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => {
                const previous = messages[index - 1]
                const currentDay = message.createdAt
                  ? dayLabel(message.createdAt, now)
                  : null
                const previousDay =
                  previous?.createdAt ? dayLabel(previous.createdAt, now) : null
                const showSeparator = currentDay && currentDay !== previousDay

                return (
                  <div key={message._id ?? `${message.role}-${index}`}>
                    {showSeparator ? (
                      <div className="mb-4 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                        <span className="h-px flex-1 bg-border" aria-hidden="true" />
                        {currentDay}
                        <span className="h-px flex-1 bg-border" aria-hidden="true" />
                      </div>
                    ) : null}
                    <ChatMessage message={message} />
                  </div>
                )
              })
            )}

            {pendingText ? (
              <ChatMessage
                message={{ role: "user", content: pendingText }}
                pending
              />
            ) : null}

            {isSending ? (
              <div className="flex items-start gap-2.5">
                {AVATAR}
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-border bg-card px-3 py-2 text-[12px] text-muted-foreground">
                  <span className="flex items-center gap-1" aria-hidden="true">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
                  </span>
                  Thinking…
                </div>
              </div>
            ) : null}

            {sendError ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-2xl border border-destructive/25 bg-destructive/5 p-3.5"
              >
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">{sendError.copy.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {sendError.copy.message}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {sendError.retryable ? (
                      <button
                        type="button"
                        onClick={onRetrySend}
                        disabled={isSending}
                        className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition-colors outline-none hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      >
                        Retry
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={onDismissError}
                      className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Dismiss
                    </button>
                    <span className="font-mono text-[10px] text-muted-foreground/80">
                      {sendError.code ?? "REQUEST_FAILED"}
                      {sendError.retryable ? " · retryable" : ""}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {showJump ? (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-popover px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-md outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowDown className="h-3 w-3" aria-hidden="true" />
            Jump to latest
          </button>
        ) : null}
      </div>

      {loadError ? null : (
        <ChatComposer
          value={draft}
          onChange={onDraftChange}
          onSend={onSend}
          isSending={isSending}
          note={
            hasSession
              ? "One message uses one generation. Failed replies are refunded automatically."
              : `One message uses one generation · ${creditsLabel}`
          }
        />
      )}
    </div>
  )
}

export default ChatThread
