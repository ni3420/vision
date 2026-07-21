"use client"

import React from "react"
import { MessageSquare, Trash2, Clock, Sparkles, Loader2, Plus } from "lucide-react"
import { useGetConversations } from "../api/use-get-all-conversation"
import { useDeleteConversation } from "../api/use-delete-conversation"

interface ConversationHistoryProps {
  activeSessionId?: string
  onSelectSession?: (sessionId: string) => void
  onNewSession?: () => void
}

export const ConversationHistory = ({
  activeSessionId,
  onSelectSession,
  onNewSession,
}: ConversationHistoryProps) => {
  const { data: response, isLoading, isError } = useGetConversations()
  const { mutate: deleteSession, isPending: isDeleting } = useDeleteConversation()
  console.log("ConversationHistory response:", response)

  const conversations = response?.data || []

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    if (isDeleting) return
    deleteSession({ sessionId })
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-sm bg-card border border-border/60 rounded-3xl p-5 flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground font-medium mt-2">
          Loading history pipeline...
        </span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="w-full max-w-sm bg-card border border-destructive/20 rounded-3xl p-5 flex flex-col items-center justify-center text-center min-h-[200px]">
        <span className="text-xs text-destructive font-bold">
          Failed to load session history
        </span>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm bg-card border border-border/60 rounded-3xl p-4 shadow-xl shadow-slate-100 dark:shadow-none flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">
              History
            </h3>
            <p className="text-[10px] text-muted-foreground font-medium">
              {conversations.length} Active Sessions
            </p>
          </div>
        </div>

        {onNewSession && (
          <button
            type="button"
            onClick={onNewSession}
            className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>
        )}
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {conversations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <Sparkles className="h-6 w-6 text-primary/40 mb-2" />
            <p className="text-xs font-semibold">No past sessions found</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Start a conversation to store context
            </p>
          </div>
        ) : (
          conversations.map((item) => {
            const isActive = activeSessionId === item.sessionId
            const firstUserMessage = item.messages.find((m: any) => m.role === "user")?.content || "Untitled Session"
            const messageCount = item.messages.length

            return (
              <div
                key={item.sessionId}
                onClick={() => onSelectSession?.(item.sessionId)}
                className={`group relative p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                  isActive
                    ? "bg-primary/10 border-primary/40 shadow-sm"
                    : "bg-secondary/40 border-border/60 hover:bg-secondary/80 hover:border-border"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground border border-border"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate leading-snug">
                      {firstUserMessage}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {messageCount} msg{messageCount !== 1 && "s"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDelete(e, item.sessionId)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                  title="Delete Session"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default ConversationHistory