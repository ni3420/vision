"use client"

import React, { useState } from "react"
import { Send, Sparkles, Loader2 } from "lucide-react"
import { useCreateSession } from "../api/use-create-conversation"

export const CreateConversation = () => {
  const [content, setContent] = useState("")
  const { mutate, isPending } = useCreateSession()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isPending) return

    const newSessionId = `session_${Date.now()}`

    mutate(
      {
        json: {
          sessionId: newSessionId,
          initialMessage: {
            role: "user",
            content: content.trim(),
          },
        },
      },
      {
        onSuccess: () => {
          setContent("")
        },
      }
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-card border border-border/60 rounded-3xl p-4 sm:p-6 shadow-xl shadow-slate-100 dark:shadow-none relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">
            Start New Session
          </h2>
          <p className="text-[11px] text-muted-foreground font-medium">
            Initialize a neural chat context pipeline
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your message or prompt to start..."
          disabled={isPending}
          className="w-full bg-secondary/50 border border-border/80 rounded-2xl py-3.5 pl-4 pr-12 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200 disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={!content.trim() || isPending}
          className="absolute right-2 p-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-all duration-200 cursor-pointer flex items-center justify-center"
          aria-label="Send initial message"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  )
}

export default CreateConversation