"use client"

import React, { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Loader2, Sparkles, MessageSquare } from "lucide-react"
import { useGetConversation } from "../api/use-get-conversation"
import { usePostMessage } from "../api/use-post-message"

interface ShowConversationProps {
  sessionId: string
}

export const ShowConversation = ({ sessionId }: ShowConversationProps) => {
  const [content, setContent] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: response, isLoading, isError } = useGetConversation(sessionId)
  const { mutate: sendMessage, isPending: isSending } = usePostMessage(sessionId)

  const conversation = response?.data
  const messages = conversation?.messages || []

  // Auto-scroll to bottom whenever new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isSending])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isSending) return

    const messageText = content.trim()
    setContent("")

    sendMessage({
      json: {
        sessionId,
        message: {
          role: "user",
          content: messageText,
        },
      },
    })
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto min-h-[500px] bg-card border border-border/60 rounded-3xl p-6 flex flex-col items-center justify-center gap-3">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl animate-pulse" />
          <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary via-indigo-500 to-violet-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-white/10">
            <span className="text-white font-black text-lg">V</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <span className="text-xs font-semibold text-muted-foreground">
            Synchronizing neural session context...
          </span>
        </div>
      </div>
    )
  }

  if (isError || !conversation) {
    return (
      <div className="w-full max-w-4xl mx-auto min-h-[300px] bg-card border border-destructive/20 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
        <MessageSquare className="h-8 w-8 text-destructive/60 mb-2" />
        <h3 className="text-sm font-bold text-foreground">Session Unreachable</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Could not retrieve the requested conversation context. It may have been deleted or moved.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)] min-h-[500px] bg-card border border-border/60 rounded-3xl shadow-xl shadow-slate-100 dark:shadow-none overflow-hidden">
      {/* Header */}
      <div className="p-4 px-6 border-b border-border/60 bg-secondary/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              Neural Assistant
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md uppercase tracking-wider">
                Active
              </span>
            </h2>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              Session ID: {sessionId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Gemini 2.5 Flash</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12">
            <Sparkles className="h-8 w-8 text-primary/40 mb-2 animate-bounce" />
            <p className="text-xs font-semibold">No messages in this session yet.</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Send a prompt below to begin the conversation.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === "user"

            return (
              <div
                key={index}
                className={`flex items-start gap-3 ${
                  isUser ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground border border-border"
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                <div
                  className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-secondary/60 text-foreground border border-border/80 rounded-tl-none whitespace-pre-wrap"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            )
          })
        )}

        {/* Optimistic Pending State */}
        {isSending && (
          <div className="flex items-start gap-3 flex-row">
            <div className="h-8 w-8 rounded-xl bg-secondary text-foreground border border-border flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 animate-pulse" />
            </div>
            <div className="bg-secondary/60 border border-border/80 rounded-2xl rounded-tl-none p-4 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Generating response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-border/60 bg-card shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ask a follow-up or provide context..."
            disabled={isSending}
            className="w-full bg-secondary/50 border border-border/80 rounded-2xl py-3.5 pl-4 pr-12 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200 disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={!content.trim() || isSending}
            className="absolute right-2 p-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-all duration-200 cursor-pointer flex items-center justify-center"
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ShowConversation