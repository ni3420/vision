"use client"

import { useMemo, useState } from "react"
import { Loader2, Lock, MessageSquarePlus, Search, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ConversationSummary } from "../lib/types"
import { groupSessions, relativeTime } from "../lib/format"

interface SessionsRailProps {
  sessions: ConversationSummary[]
  activeSessionId: string | null
  isLoading: boolean
  isError: boolean
  creditsLabel?: string
  onSelect: (sessionId: string) => void
  onNewChat: () => void
  onDelete: (session: ConversationSummary) => void
  onRetry?: () => void
}

export function SessionsRail({
  sessions,
  activeSessionId,
  isLoading,
  isError,
  creditsLabel,
  onSelect,
  onNewChat,
  onDelete,
  onRetry,
}: SessionsRailProps) {
  const [query, setQuery] = useState("")
  const [now] = useState(() => new Date())

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return sessions
    return sessions.filter(
      (session) =>
        session.title.toLowerCase().includes(needle) ||
        session.preview.toLowerCase().includes(needle)
    )
  }, [query, sessions])

  const groups = useMemo(() => groupSessions(filtered, now), [filtered, now])

  return (
    <div className="flex h-full min-h-0 flex-col bg-card/40">
      <div className="shrink-0 space-y-3 border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Conversations</h2>
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
            {sessions.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors outline-none hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
          New chat
        </button>

        <label className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/40">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Search conversations</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats"
            className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Loading chats…
          </div>
        ) : isError ? (
          <div className="space-y-2 px-2 py-8 text-center">
            <p className="text-xs font-medium text-foreground">Couldn&apos;t load chats</p>
            <p className="text-[11px] text-muted-foreground">Check your connection and try again.</p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-2 py-8 text-center">
            <p className="text-xs font-medium text-foreground">
              {sessions.length === 0 ? "No chats yet" : "No chats match"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {sessions.length === 0
                ? "Your first message creates a chat."
                : "Try a different search."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.group}>
                <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {group.group}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((session) => {
                    const active = session.sessionId === activeSessionId

                    return (
                      <li
                        key={session.sessionId}
                        className={cn(
                          "group/row relative rounded-xl border transition-colors",
                          active
                            ? "border-primary/30 bg-primary/5"
                            : "border-transparent hover:bg-secondary/60 focus-within:bg-secondary/60"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onSelect(session.sessionId)}
                          aria-current={active ? "true" : undefined}
                          className="flex w-full flex-col gap-0.5 rounded-xl px-2.5 py-2 pr-9 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "truncate text-xs font-semibold",
                                active ? "text-primary" : "text-foreground"
                              )}
                            >
                              {session.title}
                            </span>
                            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                              {relativeTime(session.lastMessageAt, now)}
                            </span>
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            {session.preview || "No messages yet"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(session)}
                          aria-label={`Delete ${session.title}`}
                          className="absolute top-1/2 right-1 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground opacity-100 transition-opacity outline-none hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-1 border-t border-border p-3">
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Lock className="h-3 w-3" aria-hidden="true" />
          Private to your account
        </p>
        {creditsLabel ? (
          <p className="text-[10px] font-medium text-muted-foreground">{creditsLabel}</p>
        ) : null}
      </div>
    </div>
  )
}

export default SessionsRail
