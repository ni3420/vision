# Conversation feature — redesign and API hardening

Status: **implemented** (2026-11-02) — UI rebuilt from the approved preview; API
hardening shipped with backward-compatible wire shapes.
Date: 2026-11-02
Scope: `/conversation`, `src/features/conversation/**`, `src/models/conversation.models.ts`

Preview: `conversation-redesign.html` (light active thread, dark failed send, empty/sending/delete/mobile states, mock labelling).

---

## 1. What exists today

| Layer | Current behaviour |
|---|---|
| Page | `(dashboard)/conversation/page.tsx` — history grid + "Neural Conversation Studio" hero. Old gradient/card style, `100vh` calc inside the padded dashboard `<main>`. |
| History | `conversation-history.tsx` — title + message count, delete on hover with **no confirmation**, no timestamps, preview, or search. |
| Thread | `show-conversation.tsx` — index-keyed bubbles, single-line `<input>`, no timestamps, copy, retry, or error detail. Mock replies are not labelled. |
| Composer | `create-conversation.tsx` — client generates `session_<Date.now()>` and posts the initial message. |
| API | `GET /api/conversation/all`, `GET /:sessionId`, `POST /session`, `POST /message`, `DELETE /:sessionId`. All owner-scoped through `getAuth(c)` + `userId` filter. |
| Persistence | Mongo `Conversation`: `userId`, globally-unique `sessionId`, embedded `messages[]` (`role`, `content`, `createdAt`), timestamps. |
| Quota | One `conversation` usage is reserved/settled per generated reply; failures refund. |
| Chat provider | `generateChatReply` → Groq, Gemini fallback, else mock in dev, `503` in production without keys. |

## 2. Problems found in the audit

1. **Client-supplied role is trusted.** `MessageSchema` accepts `role: "system" | "assistant"` and the route stores it verbatim, so a caller can inject a fake assistant/system turn into their own thread.
2. **Client-generated session IDs.** `session_<Date.now()>` is guessable, and `sessionId` is globally unique: two users sending in the same millisecond collide and one gets a 500 duplicate-key error.
3. **Destructive delete without confirmation.**
4. **History data is fetched but unused** — `preview` and `updatedAt` are returned and never rendered.
5. **No error detail surfaced** — hooks collapse every failure into one generic toast; `429` retry-after, quota `403`, and `503 PROVIDER_NOT_CONFIGURED` are indistinguishable.
6. **No mock labelling in the thread** even though the route returns `mock: true`.
7. **Composer cannot write multi-line text** (`<input>`; Enter always submits).
8. **Layout fights the shell** — the page sets its own viewport height inside an already scrolling padded `<main>`.
9. **Weak accessibility** — no live region for replies, messages keyed by array index, icon-only delete without an accessible name.
10. **No deep link** — reloading `/conversation` always drops the active thread.

## 3. Target experience (see preview)

Full-height two-pane workspace styled like the rebuilt image generator (`rounded-2xl`, `bg-card`, `border-border`, `text-sm`, plain human copy — no "neural" jargon).

- **Sessions rail (desktop):** "New chat" button, count, rows with title, relative time, and a labelled delete action revealed on hover **and** keyboard focus. Delete opens a confirm dialog that names the thread and message count. Rail becomes a Sheet under `md`.
- **Thread:** sticky header with title, message count, provider badge, and an options menu. User turns are right-aligned bubbles; assistant turns render **markdown** (lists, quotes, inline code) with a copy action. Timestamps use tabular numerals.
- **Composer:** auto-growing textarea, `Enter` sends / `Shift+Enter` newline, `n / 4000` counter, send disabled while pending, and a note that one message uses one generation.
- **Optimistic send:** the user bubble appears immediately; assistant shows "Thinking…" announced through `aria-live="polite"`; composer locks until the reply settles.
- **Failure is recoverable:** the draft returns to the composer, an inline card shows the error code and `retryable`, and Retry resends **once** (one generation).
- **Empty/sending/delete/mobile states** are specified in the preview; starter prompts fill the composer.
- **Mock honesty:** header shows `mock` and the reply text is prefixed `[dev mock reply]`; production without keys shows `503 PROVIDER_NOT_CONFIGURED`, never a fake answer.
- **Scroll behaviour:** no forced autoscroll when the reader is scrolled up — a "Jump to latest" control appears instead.
- **Deep link:** `?session=<id>` restores the active thread; a newly created chat is selected automatically.
- **No Stop button** until streaming exists.

## 4. API changes (backward-compatible hardening)

Existing wire shapes stay valid; the new UI simply sends less and reads more.

| Method & path | Change |
|---|---|
| `POST /api/conversation/session` | `sessionId` becomes **optional**: if omitted, the server generates `session_<uuid>` (removes the collision risk). A supplied id must match `^session_[A-Za-z0-9-]{8,64}$`. Response adds `provider`, `model`. Idempotency-Key still gates the quota reservation. |
| `POST /api/conversation/message` | Payload shape unchanged, but **`role` is no longer trusted**: the server rejects anything except `user` (400) and always stores `role: "user"`. Assistant turns are only written server-side. Response adds `reply: { id, provider, model, mock }`. |
| `PATCH /api/conversation/:sessionId` | New: owner-scoped rename, `{ title }` 1–80 chars, trimmed. |
| `GET /api/conversation/all` | Adds `?limit=` (default 50, max 100). Rows gain `lastMessageAt` alongside the existing `preview`. |
| `GET /api/conversation/:sessionId` | Unchanged shape; messages expose `_id`, `provider`, `model`, `mock`. |
| `DELETE /api/conversation/:sessionId` | Unchanged; UI adds a confirm dialog. |

## 5. Data model changes

```ts
MessageSchema:
  role: "user" | "assistant" | "system"   // written by server only
  content: string
  createdAt: Date
  provider?: string   // "groq" | "gemini" | "local"
  model?: string
  mock?: boolean

ConversationSchema:
  title?: string      // rename override; otherwise derived from the first user message
```

Optional fields only — no migration, existing documents keep working.

## 6. New dependency

Markdown rendering adds **`react-markdown` + `remark-gfm`**. Both escape raw HTML by default and render lists/tables/quotes without `dangerouslySetInnerHTML`, so assistant output cannot inject markup. No other UI dependency is added; session grouping, relative time, and error copy are small local helpers.

## 7. Acceptance criteria

- Sending persists the user turn and the reply; reload shows both, in order.
- A new chat has no server row until the first successful send; its id comes from the API.
- A forged `role` in the request body returns 400 and stores nothing.
- Rename survives reload; delete asks for confirmation and returns to the empty state.
- `429`, `403`, `409`, `503`, and network failures each show a distinct, actionable message; Retry is offered only when `retryable`.
- Markdown renders lists/emphasis/code; raw HTML and `<script>` in a reply render as text.
- Keyboard-only flow works end to end; replies announce through `aria-live="polite"`; focus is visible on every control.
- Usable at 320–375 px; no horizontal overflow; rail in a Sheet.
- Owner scoping unchanged: no route can read or mutate another user's session.

## 8. Out of scope (documented, not built)

- Streaming/SSE replies and a Stop control.
- Attachments, image references inside chat, and tool calls.
- Server-side search, pagination beyond `limit`, folders/tags.
- Message editing, branching, or regeneration.
- Splitting embedded messages into their own collection (stay under Mongo's 16 MB document limit; revisit before long threads are common).

## 9. Verification plan and risks

- **Static gates:** typecheck, lint, unit tests (schemas, error mapping, grouping/relative-time helpers, title derivation), `bun run smoke`, production build.
- **Browser flow cannot be exercised here:** no signed-in Clerk session and no real chat key (`GROQ_API_KEY` absent, Gemini key is an 11-char placeholder), so replies would be mocks. This report will claim only static verification plus the preview.
- **New dependency risk:** `react-markdown` is widely used and maintained; the alternative — hand-rolled markdown — is rejected because escaping mistakes become XSS.
- **Rollout:** additive API fields and optional body fields mean the current client keeps working during the transition.

## 10. Implementation record (2026-11-02)

Components: `conversation-workspace.tsx`, `sessions-rail.tsx`, `chat-thread.tsx`,
`chat-message.tsx`, `chat-composer.tsx`, `delete-conversation-dialog.tsx`. The three legacy
components (`show-conversation`, `conversation-history`, `create-conversation`) were deleted;
`app/(dashboard)/conversation/page.tsx` now renders the workspace.

Helpers and hooks: `lib/errors.ts` (typed error copy + `parseConversationError`),
`lib/format.ts` (title, relative time, grouping), updated list/get/post/delete hooks, and a
new `useRenameConversation`.

| Gate | Result |
|---|---|
| `bun run typecheck` | PASS |
| `bun run lint` | PASS — 0 problems |
| `bun test` | PASS — 140 tests / 15 files |
| `bun run smoke` | PASS (mock AI, local storage) |
| `bun run build` | PASS — compiled 31.6s, 9 routes |

Not verified: the signed-in browser flow (Clerk/Mongo unavailable) and real provider replies
(no chat key). Those remain the first manual checks for a deployment.
