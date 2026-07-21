"use client"

import React, { useState } from "react"
import CreateConversation from "@/features/conversation/components/create-conversation"
import ShowConversation from "@/features/conversation/components/show-conversation"
import ConversationHistory from "@/features/conversation/components/conversation-history"
import { Sparkles, MessageSquarePlus } from "lucide-react"

const ConversationPage = () => {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId)
  }

  const handleNewSession = () => {
    setActiveSessionId(null)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Neural Conversation Studio
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Interact with Gemini AI, store thread context, and inspect previous execution sessions.
            </p>
          </div>

          {activeSessionId && (
            <button
              type="button"
              onClick={handleNewSession}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-md shadow-primary/10"
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span>Start New Thread</span>
            </button>
          )}
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* History Sidebar */}
          <div className="lg:col-span-4 xl:col-span-3 order-2 lg:order-1">
            <ConversationHistory
              activeSessionId={activeSessionId || undefined}
              onSelectSession={handleSelectSession}
              onNewSession={handleNewSession}
            />
          </div>

          {/* Dynamic Active Workspace */}
          <div className="lg:col-span-8 xl:col-span-9 order-1 lg:order-2 space-y-6">
            {activeSessionId ? (
              <ShowConversation sessionId={activeSessionId} />
            ) : (
              <div className="space-y-6">
                <CreateConversation />

                <div className="w-full max-w-2xl mx-auto bg-card/40 border border-border/40 rounded-3xl p-6 text-center space-y-2">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    No Session Selected
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Type a prompt above to launch a new conversation session, or select an existing execution thread from the history sidebar.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default ConversationPage