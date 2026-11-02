"use client"

import { useEffect, useState } from "react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useCurrentUser } from "@/features/auth/api/use-current-user"
import { FREE_GENERATION_LIMIT } from "@/lib/plans"

import { useCreateSession } from "../api/use-create-conversation"
import { useDeleteConversation } from "../api/use-delete-conversation"
import { useGetConversations } from "../api/use-get-all-conversation"
import { useGetConversation } from "../api/use-get-conversation"
import { usePostMessage } from "../api/use-post-message"
import { useRenameConversation } from "../api/use-rename-conversation"
import type { ConversationApiError } from "../lib/errors"
import type { ConversationSummary } from "../lib/types"
import { SESSION_ID_PATTERN } from "../schema"
import { ChatThread } from "./chat-thread"
import { DeleteConversationDialog } from "./delete-conversation-dialog"
import { SessionsRail } from "./sessions-rail"

function replaceSessionParam(sessionId: string | null) {
  const url = sessionId
    ? `?session=${encodeURIComponent(sessionId)}`
    : window.location.pathname
  window.history.replaceState(null, "", url)
}

export function ConversationWorkspace() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [railOpen, setRailOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [pendingText, setPendingText] = useState<string | null>(null)
  const [sendError, setSendError] = useState<ConversationApiError | null>(null)
  const [failedText, setFailedText] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<ConversationSummary | null>(null)

  const conversationsQuery = useGetConversations()
  const conversationQuery = useGetConversation(activeSessionId ?? "")
  const createSession = useCreateSession()
  const postMessage = usePostMessage()
  const deleteSession = useDeleteConversation()
  const rename = useRenameConversation()
  const { data: userResponse } = useCurrentUser()

  const isSending = createSession.isPending || postMessage.isPending
  const sessions: ConversationSummary[] = conversationsQuery.data?.data ?? []

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("session")
    if (requested && SESSION_ID_PATTERN.test(requested)) {
      // Mount-only deep link read; later navigation goes through replaceState.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveSessionId(requested)
    }
  }, [])

  const isPro = userResponse?.data?.plan === "PRO"
  const remaining = Math.max(
    0,
    FREE_GENERATION_LIMIT - (userResponse?.data?.freeUsesCount ?? 0)
  )
  const creditsLabel = isPro
    ? "Pro plan · no free-tier cap"
    : `${remaining} of ${FREE_GENERATION_LIMIT} credits left`

  const selectSession = (sessionId: string) => {
    if (isSending || sessionId === activeSessionId) {
      setRailOpen(false)
      return
    }
    setActiveSessionId(sessionId)
    setSendError(null)
    setPendingText(null)
    setRailOpen(false)
    replaceSessionParam(sessionId)
  }

  const startNewChat = () => {
    if (isSending) return
    setActiveSessionId(null)
    setDraft("")
    setSendError(null)
    setPendingText(null)
    setFailedText("")
    setRailOpen(false)
    replaceSessionParam(null)
  }

  const send = (text: string) => {
    const content = text.trim()
    if (!content || isSending) return

    setSendError(null)
    setFailedText("")
    setPendingText(content)
    setDraft("")

    const onFailure = (error: ConversationApiError) => {
      setPendingText(null)
      setDraft(content)
      setFailedText(content)
      setSendError(error)
    }

    if (activeSessionId) {
      postMessage.mutate(
        {
          json: {
            sessionId: activeSessionId,
            message: { content },
          },
        },
        { onSuccess: () => setPendingText(null), onError: onFailure }
      )
      return
    }

    createSession.mutate(
      { json: { initialMessage: { content } } },
      {
        onSuccess: (response) => {
          const createdId = response.data.sessionId
          setPendingText(null)
          setActiveSessionId(createdId)
          replaceSessionParam(createdId)
        },
        onError: onFailure,
      }
    )
  }

  const retrySend = () => {
    if (!failedText || isSending) return
    setSendError(null)
    send(failedText)
  }

  const dismissError = () => {
    setSendError(null)
    setFailedText("")
  }

  const handleRename = (title: string) => {
    if (!activeSessionId) return
    rename.mutate({ param: { sessionId: activeSessionId }, json: { title } })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    const targetId = deleteTarget.sessionId
    deleteSession.mutate(
      { sessionId: targetId },
      {
        onSuccess: () => {
          if (activeSessionId === targetId) {
            setActiveSessionId(null)
            setDraft("")
            setSendError(null)
            setPendingText(null)
            setFailedText("")
            replaceSessionParam(null)
          }
          setDeleteTarget(null)
        },
      }
    )
  }

  const rail = (
    <SessionsRail
      sessions={sessions}
      activeSessionId={activeSessionId}
      isLoading={conversationsQuery.isLoading}
      isError={conversationsQuery.isError}
      creditsLabel={creditsLabel}
      onSelect={selectSession}
      onNewChat={startNewChat}
      onDelete={(session) => {
        if (!isSending) setDeleteTarget(session)
      }}
      onRetry={() => conversationsQuery.refetch()}
    />
  )

  return (
    <div className="-m-4 h-[calc(100dvh-4rem)] md:-m-6 lg:-m-8">
      <div className="flex h-full w-full overflow-hidden bg-background">
        <aside className="hidden w-72 shrink-0 border-r border-border md:block">
          {rail}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <ChatThread
            key={activeSessionId ?? "new"}
            session={conversationQuery.data?.data}
            hasSession={Boolean(activeSessionId)}
            isLoading={Boolean(activeSessionId) && conversationQuery.isLoading}
            loadError={conversationQuery.error ?? null}
            isSending={isSending}
            pendingText={pendingText}
            sendError={sendError}
            draft={draft}
            creditsLabel={creditsLabel}
            isRenaming={rename.isPending}
            onDraftChange={setDraft}
            onSend={() => send(draft)}
            onRetrySend={retrySend}
            onDismissError={dismissError}
            onOpenRail={() => setRailOpen(true)}
            onNewChat={startNewChat}
            onRename={handleRename}
            onDelete={() => {
              if (!activeSessionId) return
              const summary = sessions.find((item) => item.sessionId === activeSessionId)
              setDeleteTarget(
                summary ?? {
                  sessionId: activeSessionId,
                  title: "This chat",
                  messageCount: conversationQuery.data?.data?.messages.length ?? 0,
                  preview: "",
                  updatedAt: new Date(),
                  lastMessageAt: new Date(),
                }
              )
            }}
          />
        </section>
      </div>

      <Sheet open={railOpen} onOpenChange={setRailOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-80 max-w-[85vw] gap-0 p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Conversations</SheetTitle>
            <SheetDescription>Switch between chats or start a new one.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">{rail}</div>
        </SheetContent>
      </Sheet>

      <DeleteConversationDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteSession.isPending) setDeleteTarget(null)
        }}
        title={deleteTarget?.title ?? "This chat"}
        messageCount={deleteTarget?.messageCount ?? 0}
        isDeleting={deleteSession.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

export default ConversationWorkspace
