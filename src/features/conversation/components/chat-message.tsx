"use client"

/* eslint-disable @typescript-eslint/no-unused-vars -- react-markdown passes `node`, which must be stripped before props reach the DOM */

import { useState } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { Check, Copy } from "lucide-react"
import { formatTime } from "../lib/format"
import type { ConversationMessage } from "../lib/types"
import { cn } from "@/lib/utils"

const markdownComponents: Components = {
  p: ({ node: _node, ...props }) => (
    <p className="text-[13px] leading-[1.7] text-foreground" {...props} />
  ),
  ul: ({ node: _node, ...props }) => (
    <ul className="my-2 list-disc space-y-1.5 pl-5 text-[13px] leading-[1.7]" {...props} />
  ),
  ol: ({ node: _node, ...props }) => (
    <ol className="my-2 list-decimal space-y-1.5 pl-5 text-[13px] leading-[1.7]" {...props} />
  ),
  li: ({ node: _node, ...props }) => <li className="pl-0.5" {...props} />,
  strong: ({ node: _node, ...props }) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: ({ node: _node, ...props }) => <em className="italic" {...props} />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      className="my-2 border-l-2 border-primary/30 pl-3 italic text-muted-foreground"
      {...props}
    />
  ),
  a: ({ node: _node, ...props }) => (
    <a
      className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
      target="_blank"
      rel="noreferrer noopener"
      {...props}
    />
  ),
  code: ({ node: _node, className, ...props }) => (
    <code
      className={cn(
        "rounded bg-secondary px-1 py-0.5 font-mono text-[11.5px] text-foreground",
        className
      )}
      {...props}
    />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre
      className="my-2 overflow-x-auto rounded-xl border border-border bg-secondary/60 p-3 text-[11.5px] leading-relaxed"
      {...props}
    />
  ),
  hr: ({ node: _node, ...props }) => (
    <hr className="my-3 border-border" {...props} />
  ),
}

interface ChatMessageProps {
  message: ConversationMessage
  pending?: boolean
}

export function ChatMessage({ message, pending = false }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === "user"

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] flex-col items-end gap-1.5 sm:max-w-[75%]">
          <div className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[13px] leading-[1.65] text-primary-foreground">
            {message.content}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground [font-variant-numeric:tabular-nums]">
            {pending ? (
              <span>Sending…</span>
            ) : (
              message.createdAt && <span>{formatTime(message.createdAt)}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group/msg flex items-start gap-2.5">
      <div
        aria-hidden="true"
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary"
      >
        <span className="text-[10px] font-black tracking-tight">V</span>
      </div>
      <div className="min-w-0 max-w-[88%] space-y-1 sm:max-w-[78%]">
        <div className="space-y-2">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground [font-variant-numeric:tabular-nums]">
          {message.createdAt && <span>{formatTime(message.createdAt)}</span>}
          {message.provider && (
            <>
              <span aria-hidden="true">·</span>
              <span>{providerLabel(message.provider, message.model)}</span>
            </>
          )}
          {message.mock && (
            <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Mock
            </span>
          )}
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground opacity-100 transition-opacity hover:bg-secondary hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover/msg:opacity-100"
            aria-label={copied ? "Copied" : "Copy message"}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  )
}

export function providerLabel(provider: string, model?: string | null) {
  const name =
    provider === "gemini"
      ? "Gemini"
      : provider === "groq"
        ? "Groq"
        : provider === "local"
          ? "Mock preview"
          : provider

  if (!model || model === "mock-chat") return name
  return `${name} · ${model}`
}

export default ChatMessage
