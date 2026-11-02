# AGENTS.md — Vision

> Single source of truth for humans and AI coding agents working in this repository.
> **Verified against the checkout on 2026-11-01.** Every version, path, route, and
> provider name below was read from the code, not assumed. When this file and the code
> disagree, the code wins — then fix this file in the same change.
>
> If `CLAUDE.md` or another agent guide exists, it must point here instead of
> duplicating rules.

---

## 0. Agent contract

Read this file before changing code. Then:

1. **Inspect before editing.** Read `package.json`, `tsconfig.json`,
   `src/app`, `src/features`, `src/server`, `src/models`, `src/proxy.ts`, and
   `.env.example`. Never assume this document perfectly describes a newer checkout.
2. **Work in small, reviewable slices.** One feature or defect per change. Explain risky
   changes before making them.
3. **Preserve what works.** The auth flow, quota ledger, storage abstraction, provider
   adapters, and Stripe webhook all work in their current shape. Refactor them only with a
   concrete reason and a test.
4. **Never fake success.** No invented provider endpoints, model names, quotas, prices, or
   progress bars. If a capability is not configured, label it honestly.
5. **Never expose secrets.** No keys, signed URLs, private object keys, prompts, or user
   content in browser bundles, logs, commits, or screenshots.
6. **Run the gates** before reporting done (§10.5).
7. **No deployment, paid provider spend, external account creation, or production data
   changes** unless the user explicitly asks.
8. **If a request conflicts with this guide**, follow the explicit user request and add a
   row to the §14 decision log so the change is intentional.

---

## 1. Verified current state

### 1.1 Stack (read from `package.json` and configs)

| Layer | Actual | Notes |
|---|---|---|
| Framework | Next.js `16.2.10`, App Router, `src/app` | Turbopack dev; `output: "standalone"` |
| UI | React `19.2.4`, Tailwind CSS v4, shadcn/ui **`base-nova`** on **Base UI** (`@base-ui/react`), Lucide | `components.json` confirms Base UI, not Radix |
| Theming | `next-themes` `0.4` with `attribute="class"`, `defaultTheme="system"` | `.dark` on `<html>` drives the oklch tokens in `globals.css` |
| API | Hono `4.12` mounted at `/api` via `src/app/api/[[...route]]/route.ts` | Node runtime, `force-dynamic` |
| API client | `hc<AppType>` from `hono/client` in `src/lib/client.ts` | End-to-end typed routes |
| Server state | **TanStack Query `5.101`** (`src/providers/providers.tsx`) | Single cache; see §9 |
| Client state | Local React state; **Zustand is not installed** | Add only for real shared UI state |
| Database | MongoDB + Mongoose `9.7` | Models in `src/models` |
| Auth | Clerk `@clerk/nextjs` v7 + `@clerk/hono` | `src/proxy.ts` protects everything except `/auth(.*)` and `/api/stripe(.*)` |
| Payments | Stripe `22.3` Checkout + webhook | `src/features/Subscription/server/route.ts` |
| Storage | Local filesystem, S3-compatible (`@aws-sdk/client-s3` v3), or ImageKit | `STORAGE_DRIVER=local \| s3 \| imagekit` |
| Image AI | Cloudflare Workers AI `@cf/black-forest-labs/flux-1-schnell` | `src/server/ai/image.ts` |
| Chat AI | Groq `openai/gpt-oss-120b`, Gemini `gemini-3.6-flash` fallback | 60 s per attempt, 3 bounded attempts; see §7.2.1 |
| Background AI | remove.bg `v1.0` (`https://api.remove.bg/v1.0/removebg`); Photoroom `segment-v1` fallback | `src/server/ai/removebg.ts`, dispatch in `src/server/ai/background.ts` |
| Video | **Not implemented** | Honest "Not available yet" page |
| Tests | `bun test` (Bun built-in runner) + `bun run smoke` | No Vitest/Jest; do not add one without a reason |
| Package manager | Bun (`bun.lock`) | Do not introduce npm/pnpm/yarn lockfiles |
| Fonts | Geist Sans / Geist Mono via `next/font/google` | Mapped to `--font-sans` in `globals.css` |

### 1.2 Gate baseline

| Gate | Command | Baseline 2026-11-02 |
|---|---|---|
| Types | `bun run typecheck` | **PASS** |
| Lint | `bun run lint` | **PASS — 0 problems** |
| Unit tests | `bun run test` | **PASS — 140 tests / 15 files** |
| Adapters | `bun run smoke` | **PASS** (forces mock mode + local storage) |
| Build | `bun run build` | **PASS** — compiled in 31.6s, 9 routes (2026-11-02) |

One non-blocking Turbopack warning remains for the runtime-computed local storage root
(`src/server/storage.ts`); it is intentional, not an error.

`bun run build` needs a `.env.local`. The committed `.env.example` documents every variable.
With placeholder Clerk/Stripe/provider values the app builds, but **browser flows are not
verifiable** (Clerk redirects, Mongo unreachable, providers unconfigured). State that
limitation explicitly instead of claiming a working UI flow.

The image-generator redesign (2026-11-01) was verified by typecheck, lint, tests, smoke, and
build only. A live browser pass was **not** possible: `/image-generator` redirects to Clerk
sign-in and no session or database is available in this environment.

### 1.3 Known limitations (do not paper over)

- Rate limits cover the three charged routes only; `/api/auth`, `/api/conversation/session`,
  `/api/stripe`, and history reads are unmetered. Counters live in Mongo, so a burst can
  cost an extra write per request.
- No Stripe event-idempotency table; replayed webhooks re-apply the same plan write.
- History endpoints use a capped `limit` (60 images / 30 cutouts), not cursor pagination.
- Chat is request/response; no streaming, stop button, or token usage (C-3).
- Chat retries and timeouts are bounded (2026-11-02); the adapter still runs inside one
  HTTP request, so a slow reply holds the connection.
- `GET /api/conversation/all` returns a session summary, not full messages; it is capped by
  `?limit=` (default 50, max 100) and is not cursor-paginated.
- Chat model IDs are documentation-verified, not live-tested here (the local key is a
  placeholder), so a real deployment must confirm access.
- Image generation targets FLUX.2 klein via multipart. The adapter is covered by tests with
  a stubbed fetch and the Worker by tests with a fake binding; neither has made a real model
  call, and the Worker has never been deployed.
- No async job queue: one HTTP request holds the provider call.
- Music generation was removed on 2026-11-02. `Asset.kind` and `UsageLedger.kind` keep
  `"music"` so historical rows stay valid; no new music rows are written.
- `README.md` and this file plus `docs/conversation-redesign.md` are the project docs.

---

## 2. Product surfaces

Vision is a multimodal creative workspace: **generate an image, remove a background, talk
to an assistant, see it in history, understand the free limit, test the upgrade path.**
Every surface must be usable with a keyboard, readable in light and dark mode, and honest
about state.

| Route | Surface | Purpose | Real states |
|---|---|---|---|
| `/` | Dashboard | Counts, 7-day activity, workload split, plan meter, quick actions | loading skeleton, empty, error + retry |
| `/image-generator` | Image Studio | Prompt textarea with counter and examples, ratio tiles, 1–2 variations, cost label, result grid, history tab | idle (skeletons, error + retry, empty), success, mock badge, quota (403 + upgrade modal) |
| `/conversation` | Chat | Sessions rail (search, grouping, relative time, delete confirm), markdown thread with copy, auto-growing composer, optimistic send, inline rename, `?session=` deep link | no session, empty thread, sending/thinking, send error + retry, mock badge, 404 |
| `/background-studio` | Background Studio | Upload (drag/drop or browse), before/after comparison on a checkerboard, download transparent PNG, cutout history | idle, uploading, removing, success, mock badge, quota (403 + upgrade modal), provider error + retry |
| `/video-generator` | Video | Honest "not available yet" explanation with links to working tools | static |
| `/auth/sign-in`, `/auth/sign-up` | Auth | Clerk-hosted components | Clerk-managed |

The sidebar (`src/features/dashboard/components/sidebar.tsx`) and mobile sheet
(`mobile-sidebar.tsx`) must stay in sync. Never add a nav item without a real page.

### 2.1 Product principles

- The canvas/result is the hero; controls support it and never compete with it.
- Progressive disclosure: common controls first, advanced settings only when the provider
  supports them.
- Preserve user input on failure. Never clear a prompt or draft because a request failed.
- Show quota impact before a charged action when it is known.
- Empty, loading, success, partial-success, error, quota, and offline states are part of
  "done" — not polish.
- Accessibility is part of done: labels, focus order, contrast, reduced motion, alt text.
- Both themes are first-class: the navbar toggle offers light, dark, and system; new UI must
  use the semantic tokens (`bg-card`, `text-muted-foreground`, `border-border`) rather than
  hard-coded slate/indigo values so it works in both.

---

## 3. Architecture

```text
Browser (Next.js App Router, client components)
  ├── Dashboard shell: sidebar + navbar + <main>
  ├── Feature pages: image / background / conversation / video
  ├── Feature hooks: TanStack Query + typed hc client
  └── Clerk client session
          │  fetch("/api/*") with Clerk cookies + Idempotency-Key on charged mutations
          ▼
Hono app (src/app/api/[[...route]]/route.ts)
  ├── clerkMiddleware (publishable key)
  ├── DB() connection guard on every request
  ├── Routers: auth, image, background, conversation, dashboard, assets, stripe
  ├── quotaGuard (reserve → handler → settle/refund)
  ├── Zod validation (@hono/zod-validator)
  └── Provider adapters (src/server/ai/*)
          │
          ├── MongoDB: users, assets, backgrounds, conversations, usageLedger, rateLimits
          ├── Storage: local .data/uploads, S3-compatible bucket, or ImageKit
          └── Providers: Cloudflare, Groq, Gemini, remove.bg (Photoroom fallback)
```

**Ownership boundaries**

- MongoDB is the source of truth for users, plans, quota counters, ledger, conversations,
  asset metadata, and background-cutout metadata.
- Storage holds bytes only. MongoDB stores object keys, MIME, size, dimensions, and the
  durable ImageKit URL when one exists. Never store a presigned or signed URL.
- The server is authoritative for auth, ownership, quota, plan, storage keys, and provider
  calls. The browser only displays what the server returns.
- The browser may hold transient UI state (form drafts, active tab, selected upload).

**Request lifecycle for a charged generation**

1. Proxy redirects anonymous users to Clerk (`/api/stripe/*` is public for webhooks).
2. Hono validates the JSON body with Zod (`400` on failure, nothing charged).
3. `quotaGuard` resolves `auth.userId` from Clerk and reserves quota atomically.
4. The feature service calls the provider adapter.
5. Output is written to storage, metadata to MongoDB.
6. Middleware settles on `2xx`; on a thrown error or `>= 400` response it refunds and
   re-throws/returns.
7. The hook invalidates the relevant query keys and shows a toast.

---

## 4. API contract

### 4.1 Mount and middleware

`src/app/api/[[...route]]/route.ts` mounts every router under `/api`. It applies
`clerkMiddleware` and the `DB()` guard to `*`. Do not create a second Hono app or bypass
this mount.

### 4.2 Envelope

There are two shapes today; preserve them rather than inventing a third.

```ts
type Success = { success: true; data?: unknown; images?: unknown[]; mock?: boolean; ... };
type Failure = { success: false; code: string; error: string };
```

Rules:

- `success: false` always carries a stable `code` and a human-readable `error`.
- Never return raw provider payloads, stack traces, or secrets.
- Keep existing field names (`images`, `data`, `url`, `mock`) stable — the typed client and
  React Query hooks infer them from `AppType`.

### 4.3 Routes

| Method | Route | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/auth` | Clerk | Upsert the Mongo user from `{ email, name }`; never trust a body `userId` |
| `GET` | `/api/auth/current` | Clerk | Current user document (plan, `freeUsesCount`) |
| `POST` | `/api/image` | Clerk + rate limit + quota | `{ prompt, dimensions: "512*512", quantity: 1 \| 2 }`; stores 1–2 assets |
| `GET` | `/api/image/history` | Clerk | Latest 60 image assets, fresh URLs |
| `GET` | `/api/conversation/all` | Clerk | Owned session summaries, newest first; `?limit=` 1–100 (default 50) |
| `GET` | `/api/conversation/:sessionId` | Clerk | Owned session or `404` |
| `POST` | `/api/conversation/session` | Clerk (+ quota if initial message) | `sessionId` optional (server generates `session_<uuid>`); empty session is free |
| `POST` | `/api/conversation/message` | Clerk + rate limit + quota | Appends user + assistant messages; a non-`user` role is rejected `400` |
| `PATCH` | `/api/conversation/:sessionId` | Clerk | Rename, `{ title }` 1–80 chars |
| `DELETE` | `/api/conversation/:sessionId` | Clerk | Owned session only |
| `POST` | `/api/background` | Clerk + rate limit + quota | `multipart/form-data` field `image`; PNG/JPEG/WebP, signature-checked, ≤10 MB |
| `GET` | `/api/background/history` | Clerk | Latest 30 cutouts with fresh source + result URLs |
| `GET` | `/api/dashboard/summary` | Clerk | Counts, 7-day series, plan/remaining |
| `GET` | `/api/assets/:key{.+}` | Clerk | Local driver only; enforces `users/{userId}/` prefix |
| `POST` | `/api/stripe` | Clerk | Creates Checkout Session; returns `url` |
| `POST` | `/api/stripe/webhook` | Signature | Public route; verifies `stripe-signature` |

### 4.4 Status codes and error codes

| Status | When |
|---|---|
| `400` | Zod validation, invalid quantity/dimensions |
| `401` | Missing Clerk session |
| `403` | `QUOTA_EXCEEDED` |
| `404` | `USER_NOT_INITIALIZED`, `SESSION_NOT_FOUND`, asset not found |
| `409` | `DUPLICATE_REQUEST` (replayed Idempotency-Key) |
| `429` | `RATE_LIMITED`; also sends `Retry-After` and `X-RateLimit-*` headers |
| `502` | `PROVIDER_CALL_FAILED` |
| `503` | `PROVIDER_NOT_CONFIGURED` |
| `500` | Anything unexpected; log server-side, return a generic message |

### 4.5 Idempotency

- Every charged mutation sends `Idempotency-Key` (`newIdempotencyKey()` in
  `src/lib/idempotency.ts`).
- `UsageLedger.idempotencyKey` is `unique + sparse`. A replay throws
  `DuplicateRequestError` → `409` **before** the provider call.
- When no header is supplied, the server generates `auto:<uuid>` so the ledger row still
  exists for refunds and auditing. Never skip ledger creation.

---

## 5. Data model and storage

### 5.1 Collections (`src/models`)

| Model | Fields that matter |
|---|---|
| `User` | `userId` (Clerk id, unique), `email` (unique), `name`, `plan: "FREE" \| "PRO"`, `freeUsesCount` |
| `Asset` | `userId`, `kind: "image" \| "music"` (music legacy), `objectKey` (unique), `mime`, `bytes`, `width`, `height`, `prompt`, `provider`, `model`, `visibility` |
| `Background` | `userId`, `sourceKey`/`sourceUrl`, `objectKey`/`url`, MIME, bytes, dimensions, `provider`, `model`, `mock` |
| `Conversation` | `userId`, `sessionId` (unique), `messages[]` of `{ role, content, createdAt }` |
| `UsageLedger` | `userId`, `kind`, `status: "reserved" \| "settled" \| "refunded"`, `idempotencyKey`, `reason` |
| `RateLimitHit` | `_id = "{userId}:{route}:{windowStartMs}"`, `count`, `windowStart`, `expiresAt` (TTL index) |

Rules:

- Never store bytes or base64 in MongoDB.
- Never trust a client-supplied `userId`, plan, quota, or object key.
- Every read/update/delete of a user-owned document filters by `userId`.
- Cursor-paginate before histories grow; do not remove the existing caps without adding
  pagination.
- Conversations are embedded documents; split messages into their own collection before a
  document approaches MongoDB's 16 MB limit.

### 5.2 Storage (`src/server/storage.ts`)

- `storageDriver()` returns the explicit `STORAGE_DRIVER` when valid, else `imagekit`
  when `IMAGEKIT_PRIVATE_KEY` + `IMAGEKIT_URL_ENDPOINT` exist, else `s3` when the
  `S3_*` quartet exists, otherwise `local`.
- Object keys are server-generated:
  `users/{userId}/{kind}/{yyyy}/{mm}/{uuid}.{ext}`. Never use a user filename.
- Local driver writes under `LOCAL_STORAGE_DIR` or `.data/uploads` and is served by
  `GET /api/assets/:key` after an ownership prefix check. No durable URL exists. It is
  dev-only: the working `.env.local` sets `STORAGE_DRIVER=s3` (Backblaze B2), and
  `bun run smoke` pins the local driver explicitly for its filesystem round-trip.
- S3 driver (AWS, R2, **Backblaze B2**) returns presigned URLs with a 1-hour expiry.
  Never persist a signed URL. B2 uses `S3_ENDPOINT=s3.<region>.backblazeb2.com`
  and `S3_REGION=<region>` (e.g. `us-east-005`), not `auto`.
- `s3Endpoint()` normalizes `S3_ENDPOINT`: a provider-documented bare host gets
  `https://` prepended and trailing slashes are trimmed. Without this the AWS SDK throws
  `Invalid URL` on every upload.
- ImageKit driver uploads server-side to `https://upload.imagekit.io/api/v1/files/upload`
  with Basic auth `PRIVATE_KEY:` and multipart `file`, `fileName`, `folder`,
  `useUniqueFileName=false`. `imagekitPublicUrl(key)` is `IMAGEKIT_URL_ENDPOINT + "/" + key`.
- `putObject()` returns `{ key, url? }`. Durable, non-expiring URLs (ImageKit) are stored
  on `Asset.url`; presigned and signed URLs are **never** persisted — they are derived per
  response by `getObjectUrl()`.
- Private ImageKit uploads (`IMAGEKIT_PRIVATE_FILES=true`) are served with a signed URL:
  HMAC-SHA1 of `pathname + expiry` with the private key, exposed as `ik-s` + `ik-t`.
- Delete the object when metadata creation fails; orphan cleanup is best-effort.
- Keep `isOwnedKey()` checks on every asset read.

---

## 6. Quota, plans, and billing

### 6.1 Policy (implemented)

- `FREE_GENERATION_LIMIT = 5`, shared across image, chat, and background removal.
- One request = one unit, even when an image request returns two images.
- Creating an empty conversation session is free.
- `PRO` has **no usage cap in code**. The UI must say "no free-tier cap", never
  "unlimited generations", until a fair-use policy is actually enforced.

### 6.2 Invariants (`src/server/quota.ts`)

1. Reserve before provider work:
   - Insert a `UsageLedger` row (`reserved`) with the caller key or `auto:<uuid>`.
   - Atomically `$inc freeUsesCount` with a `findOneAndUpdate` guard
     (`plan != PRO`, `freeUsesCount < limit`).
   - If the guard fails, delete the ledger row and throw `QuotaExceededError`.
2. Settle only after the output is durably stored and metadata persisted.
3. Refund on provider failure, storage failure, or any non-2xx response; refund is
   idempotent (`reserved → refunded` only) and decrements the counter at most once.
4. `PRO` reservations have `ledgerId: null` and never touch the counter.
5. Never compute remaining quota in the browser from local guesses — the server returns it.

### 6.3 Stripe

- Secret key and webhook secret are server-only (`src/lib/stripe.ts`).
- Checkout attaches `userId` to session and subscription metadata.
- The webhook verifies the raw body signature before any mutation.
- `checkout.session.completed`, `customer.subscription.created`,
  `invoice.paid` → `PRO`; `customer.subscription.deleted` → `FREE`.
- A success redirect never grants PRO. Only the webhook does.
- **Gap:** no `stripe_events` collection, so duplicate deliveries re-apply the write.
  Add event-idempotency before calling billing "production ready".

---

## 7. AI runtime and providers

### 7.1 Mode resolution (`src/server/ai/runtime.ts`)

| `AI_MODE` | Behaviour |
|---|---|
| `mock` | Never call a provider; return visibly labelled mock bytes/text |
| `live` | Always call the provider; throw `PROVIDER_NOT_CONFIGURED` when a key is missing |
| `auto` (default) | Live when every key looks configured; otherwise mock outside production and live in production |

`looksConfigured()` rejects empty, short (<16 chars), and placeholder-looking values
(`your_`, `changeme`, `dummy`, `xxx`, `<...>`).

Rules:

- Mock mode is for local development and demos only. Label output as mock
  (`mock: true`, `Local mock preview`, `[dev mock reply]`).
- **Images are cloud-only.** `generateImage` ignores the `auto` mock fallback and throws
  `PROVIDER_NOT_CONFIGURED` (route returns 503) when no provider key looks configured.
  A local preview happens only with an explicit `AI_MODE=mock`, which `bun run smoke` uses.
  Chat and background removal still follow the table above.
- Production must never silently fall back to a mock.
- Never send user prompts or files to an unapproved fallback.
- Add timeouts and bounded retries in the adapter, not in the route.
- Each result records `provider` and `model` so provenance is inspectable.

### 7.2 Provider notes

| Capability | Provider / model | Inputs actually supported |
|---|---|---|
| Image | Cloudflare FLUX.2 [klein] 4B | multipart `prompt` (≤2048 chars), optional `width`/`height` (64–1536, default 1024), `guidance` (0–20, default 3.5), `seed`; **fixed 4-step schedule, no `steps` param**; 1–2 outputs per request |
| Chat | Groq `openai/gpt-oss-120b`, Gemini `gemini-3.6-flash` fallback | last 12 messages + new message, 4000 chars each |
| Background | remove.bg `v1.0` (Photoroom `segment-v1` fallback) | multipart `image_file` (PNG/JPEG/WebP, ≤10 MB per our limit), `size=preview\|full`, `format=png`, binary transparent PNG response; preview is ≤0.25 MP and covered by the free API allowance, full bills credits |
| Video | none | do not add controls |

Verify live provider docs before changing model IDs, params, prices, or limits.

#### 7.2.1 Chat provider fix (implemented 2026-11-02, docs-verified)

Both previous defaults were retired: Groq shut down `llama-3.3-70b-versatile` on
**2026-08-16**, and Gemini restricts `gemini-2.5-flash` to projects that already used it.
C-1 replaced them and hardened the adapter.

| Provider | Default now | Why | Override |
|---|---|---|---|
| Groq | `openai/gpt-oss-120b` | Replacement offered on Groq's deprecations page (`qwen/qwen3.6-27b` also works) | `GROQ_MODEL` |
| Gemini | `gemini-3.6-flash` | Current stable Flash; `gemini-3.5-flash` shut down 2026-10-08 and `gemini-3.7-flash` was retired | `GEMINI_MODEL` |

Sources: `console.groq.com/docs/deprecations`,
`console.groq.com/docs/model/openai/gpt-oss-120b`, `ai.google.dev/gemini-api/docs/models`,
`ai.google.dev/gemini-api/docs/deprecations`.

What the adapter does now:

- Uses the OpenAI-compatible `/openai/v1/chat/completions` contract for Groq; no
  llama-specific parameters.
- `openai` client: `timeout: 60_000`, `maxRetries: 0`; `@google/genai` client:
  `httpOptions.timeout: 60_000`, `retryOptions.attempts: 1`. Our own
  `retryWithBackoff` adds 3 attempts, so SDK retries never stack.
- Classifies by HTTP status: 408/429/5xx retry; 400/401/403/404 do not. A status-less
  failure (network, timeout, abort) is retryable.
- Falls back to Gemini **only** when Groq fails retryably (or is unconfigured). A
  permanent Groq error surfaces instead of silently switching providers.
- `ProviderCallError.retryable` is returned in the conversation 502 body.
- `POST /api/conversation/session` is rate limited when `initialMessage` is present;
  `/api/conversation/message` requires an existing owned session (404, no upsert).
- `POST /api/conversation/message` ignores a client-supplied role: only `"user"` is accepted
  (anything else is `400`) and assistant turns are written server-side only.
- Assistant messages store `provider`, `model`, and `mock`; clients label mock replies
  instead of presenting them as real model output.
- `GET /api/conversation/all` returns
  `{ sessionId, title, messageCount, preview, updatedAt, lastMessageAt }` instead of every
  message; `title` prefers the rename override, then the first user message.

Model IDs are documentation-verified, not live-tested in this environment: the local Gemini
key is a placeholder and no Groq key is set, so spending credits was out of scope.

#### 7.2.2 Image provider: Worker or direct API (implemented 2026-11-02)

`src/server/ai/image.ts` always sends **multipart/form-data** with `prompt`, `width`, and
`height` (never a hand-written `Content-Type`, so fetch sets the boundary). Two endpoints:

| Path | Env | Endpoint |
|---|---|---|
| Worker (preferred) | `CLOUDFARE_URL` + `CLOUDFARE_API_KEY` | your deployed Worker |
| Direct | `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` | `api.cloudflare.com/client/v4/accounts/<id>/ai/run/@cf/black-forest-labs/flux-2-klein-4b` |

`CLOUDFARE_URL` must be HTTPS, or `http://localhost` / `127.0.0.1` outside production.
The adapter resizes or crops the returned image to the requested size with `sharp` and
stores JPEG, so model output format is not user-visible.

Worker (`worker/src/index.ts`, binding `Image-AI`) accepts JSON **and** multipart:

- `POST /` or `POST /generate`; `GET /health`; `OPTIONS` for CORS. Anything else 404/405.
- JSON `{ prompt, width?, height?, aspectRatio?, guidance?, seed? }` → raw image bytes
  (`image/png` or sniffed `image/jpeg`/`image/webp`) with `X-Image-Size` and `X-Request-Id`.
- `aspectRatio` accepts `1:1`, `16:9`, `9:16`, `4:3` when no explicit width/height is sent.
- Multipart clients may also upload `image` (JPEG/PNG/WebP, ≤10 MB), forwarded as
  `input_image_0` for image-to-image.
- Bearer token compared in constant time. `IMAGE_API_TOKEN` is the canonical secret;
  `WORKER_API_KEY` also works. With neither set the Worker returns **503**, never an open
  proxy. The `AI` binding name also works if `Image-AI` is absent.
- Upstream failure or empty output → `502`, which the adapter treats as retryable.

Docs-verified: `developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/`
(multipart, required `prompt`, optional `input_image_0–3`/`guidance`/`width`/`height`/`seed`,
fixed 4 steps) and the model page's `schema-input.json`. Nothing was deployed and no live
model call was made here.

Local run: `bun run worker:dev` with `worker/.dev.vars` (`IMAGE_API_TOKEN=…`). Deploy:
`bun run worker:deploy`, then `wrangler secret put IMAGE_API_TOKEN`. Never commit `.dev.vars`.

### 7.3 Retry policy (`src/server/ai/retry.ts`)

- Retry network errors, `408`, `429`, `500`, `502`, `503`, `504` only. A `400`/`401`/`403`
  is permanent — retrying it wastes quota and time.
- Default 3 attempts, exponential backoff with jitter (250 ms → 1 s), capped by
  `Retry-After` when the provider sends one.
- Each fetch attempt gets its own `AbortSignal.timeout`; SDK-based adapters use a
  per-request client timeout instead. A timeout is a retryable network error.
- `retryWithBackoff()` is the generic wrapper for SDK calls; `fetchWithRetry()` handles raw
  `fetch`. Both share the same backoff, jitter, and attempt budget.
- Every adapter already normalizes failures to `ProviderCallError` (502) or
  `ProviderNotConfiguredError` (503). Retry inside the adapter, never in the route.
- `ProviderCallError.retryable` is surfaced in the error body so the UI knows whether to
  offer a retry button.

---

## 8. UI/UX design system

### 8.1 Visual direction

Calm, premium creative workspace. Strong typography, generous canvas, subtle borders, one
restrained accent, purposeful depth, compact but readable controls, consistent radius.
Study Krea, Ideogram, Photoroom, and Canva for workflow patterns; never copy branding,
copy, logos, or exact layouts.

### 8.2 Tokens (`src/app/globals.css`)

- Semantic CSS variables only: `background`, `foreground`, `card`, `popover`, `primary`,
  `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `chart-1..5`,
  `sidebar-*`.
- Light and dark palettes are defined in `:root` and `.dark`. Use tokens
  (`bg-card`, `text-muted-foreground`, `border-border`), not raw hex or `bg-white` /
  `text-slate-500`, in new code.
- Accent is indigo (light `oklch(0.49 0.22 260)`). Radius base is `0.75rem`, with
  `--radius-sm…4xl` derived from it.
- Fonts: Geist Sans (`--font-geist-sans`) and Geist Mono (`--font-geist-mono`). Keep the
  `--font-sans` mapping intact.
- Respect `prefers-reduced-motion`; the current UI uses `animate-in`/`tw-animate-css`.

### 8.3 Components

- `components.json` is `style: "base-nova"` — primitives come from `@base-ui/react`.
  Do not mix in Radix-based shadcn variants; APIs differ.
- `src/components/ui/*` holds primitives. Feature compositions live under
  `src/features/<feature>/components`.
- Prefer composing Base UI primitives over adding a component library.
- Keep `lucide-react` as the only icon set.
- Icon language (2026-11-02): `MessagesSquare` for chat, `Eraser` for background removal,
  `Clapperboard` for video, `ImagePlus`/`Image` for images, `ArrowUpRight` for primary
  actions. `Sparkles` is retired — do not reintroduce it as decoration.
- Extract a component when two features need it, not preemptively.

### 8.4 Layout patterns

- Shell: fixed 16rem sidebar (desktop), hamburger sheet (mobile), 16rem navbar, scrollable
  `main` with `max-w-7xl`.
- Page header: title + one-line description on the left, 1–3 primary actions on the right.
- Panels use `bg-card border border-border/60 rounded-3xl`; inner surfaces use
  `bg-secondary/40`.
- Image Studio: composer row (prompt + size + count) above a result grid; tabs for
  Generate / History.
- Chat: session list column + thread + composer. Keep the composer visible.
- Background Studio: uploader, before/after comparison on a checkerboard, download, tabs
  for Studio / History.
- Empty states always offer the next useful action.

### 8.5 Copy rules (honesty)

- Say "no free-tier cap" for PRO, not "unlimited".
- Never display a model name the request does not actually use. The chat header says
  "AI assistant", not a hard-coded model.
- Label mock output as mock.
- Video explains what is missing; it has no fake controls, model picker, queue, or date.
- Do not promise pixel-perfect preservation, copyright ownership, or provider SLAs.

### 8.6 Accessibility and responsive acceptance

- [ ] Sidebar collapses to a sheet; no horizontal overflow at 320 px.
- [ ] Icon-only buttons have `aria-label`; inputs have labels or `aria-label`.
- [ ] Logical focus order and visible focus ring.
- [ ] Images have meaningful `alt` (or empty when decorative).
- [ ] Loading/error changes are announced (`role="status"`, `role="alert"`).
- [ ] Both themes pass contrast for muted text, disabled controls, and focus rings.
- [ ] Keyboard-only run: nav → generate → open result → send chat → remove a background.

---

## 9. Client data and state

### 9.1 Server state: TanStack Query

React Query **is already installed** and is the only server-state cache. Do not add a
second cache (Zustand, SWR, Redux) or copy API responses into global state.

- Query keys in use: `["dashboard-summary"]`, `["current-user"]`, `["image-history"]`,
  `["background-history"]`, `["conversations"]`, `["conversation", sessionId]`.
- Defaults: `staleTime: 60s`, `retry: 1`, `refetchOnWindowFocus: false`.
- Mutations must invalidate what they changed plus `["current-user"]` and
  `["dashboard-summary"]` when quota changes.
- Use the typed `hc` client (`src/lib/client.ts`) and infer types with
  `InferResponseType` / `InferRequestType`. Do not hand-write response types.
- Throw an `ApiError` with `status` so hooks can branch on `403` (quota).

### 9.2 Client UI state

Use local `useState`/`useReducer` first. Add Zustand only when several distant components
need the same transient UI state (e.g. a studio draft shared across panels). Never store
auth identity, plan, quota, conversations, assets, private URLs, or secrets in it.

### 9.3 Forms

- React Hook Form + `zodResolver` + the feature schema in `src/features/*/schema.ts`.
- Read reactive values with `useWatch` — `watch()` trips the React Compiler warning.
- Prevent duplicate submits while a mutation is pending.
- Keep the draft on failure; clear only on success.
- Show field errors and a single toast for the request-level error.

---

## 10. Testing and quality gates

### 10.1 What exists

- `bun test` — colocated `*.test.ts` files. Current: quota semantics, rate-limit windows
  and guard headers, retry/backoff, ImageKit signing and upload, dashboard summary,
  distribution, image schemas, AI mode resolution.
- `bun run smoke` — runs `scripts/smoke-adapters.ts` with `AI_MODE=mock`; asserts JPEG
  magic bytes, sharp resize, chat text, RIFF WAV, and a local storage round-trip.
- No browser E2E, no database integration tests, no CI.

### 10.2 When you change quota or billing

Add/extend tests in `src/server/quota.test.ts`. Mock `@/models/*` with `mock.module` and
dynamic-import the module under test after the mock (see that file for the pattern).
Cover: reserve, replay, limit, refund-once, PRO bypass, missing user.

### 10.3 When you change a schema or a pure function

Colocate a `*.test.ts` next to it. Keep tests deterministic: no network, no database, no
paid providers, no sleeps, no reliance on the local timezone (use UTC dates).

### 10.4 When you change a route or UI flow

- Extend `scripts/smoke-adapters.ts` only for adapter-level behaviour.
- Add a manual check to §11.2 and run it in both themes.
- If you cannot run a real browser flow (missing Clerk/Mongo/provider keys), say so — do
  not claim the flow works.

### 10.5 Gates (run in this order)

```bash
bun run typecheck
bun run lint
bun run test
bun run smoke
bun run build
```

- Do not weaken ESLint rules or add `any` to make a gate pass.
- Do not fix unrelated debt inside a focused change; record it instead.
- Report the exact counts you observed, not "all good".

---

## 11. Security and reliability

### 11.1 Server authorization

- Derive `userId` from Clerk (`getAuth(c)`), never from body/query/header.
- Filter every user-owned query by `userId`.
- Validate every request body with Zod; enforce prompt length, dimension range, quantity
  cap, duration range, and file limits.
- Reject asset keys outside `users/{userId}/` and any key containing `..` or `\`.
- Keep the webhook public but signature-verified.

### 11.2 Reliability

- Map provider failures to `502`/`503`; log the cause server-side without secrets.
- Refund the reservation before returning an error.
- Bound provider calls with a timeout and at most a small number of retries.
- Make duplicate queue/webhook deliveries safe to re-apply or ignore.
- Never leave a reservation stuck in `reserved`; add reconciliation if jobs become async.

### 11.2.1 Rate limiting (`src/server/rate-limit.ts`)

Fixed-window counters in MongoDB — no Redis in this stack, and in-memory counters break
across instances.

- One document per `{userId}:{route}:{windowStart}`; `_id` supplies uniqueness and a TTL
  index (`expiresAt`) removes it after the window.
- `findOneAndUpdate(..., { upsert: true, new: true })` increments atomically; one E11000
  retry covers two concurrent first hits.
- Budgets apply to PRO as well as FREE: they protect provider spend, not the plan.
- Current budgets: image 10/min, background 10/min, conversation message 30/min, per user.
  Change them only in `RATE_LIMITS`.
- Middleware order is `zValidator` → `rateLimitGuard` → `quotaGuard`, so rejected payloads
  and rate-limited requests never reserve quota.
- The limiter **fails open** on a database error (logs and continues). Availability wins
  here; revisit if abuse becomes real.
- Responses always carry `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
  `X-RateLimit-Reset`; a denied request adds `Retry-After` and `429 RATE_LIMITED`.

### 11.3 Privacy

- Do not log prompts, raw provider payloads, signed URLs, tokens, or personal data by
  default.
- Keep originals private; generate fresh URLs per response.
- Document retention and deletion before launch. Account deletion must remove metadata and
  schedule object cleanup.

### 11.4 Insecure areas to fix before public launch

1. Persist Stripe event IDs and skip duplicates.
2. Add a `stripe_events`-style audit collection for billing changes.
3. Extend rate limiting to `/api/auth`, `/api/conversation/session`, and `/api/stripe` if
   those become abuse targets.
4. Add upload validation if file upload is introduced (MIME sniffing, size, pixels).
5. Add error monitoring (Sentry or equivalent) and a health check.

---

## 12. Performance targets

- Keep dashboard reads parallel (already `Promise.all` in `loadDashboardData`).
- Return only fields the page renders; never send blobs or full histories in list routes.
- Use indexes for `{ userId, createdAt }` and always keep a `limit`.
- Add cursor pagination before raising history caps.
- Show an immediate accepted/pending state; never fake a percentage.
- Measure p50/p95 before claiming an improvement.

---

## 13. Internship-ready roadmap

Priority: **UI clarity → interaction completeness → reliability → demo polish.** Do not
rewrite the backend to make it look different.

### Phase A — Verify and baseline (done)

- [x] Read the stack, routes, models, quota, storage, and providers.
- [x] Record typecheck/lint/test/smoke/build baselines.
- [x] Add unit tests for quota and pure logic.
- [x] Remove lint errors and dead controls.

### Phase B — Product honesty and UI polish

- [ ] Replace remaining hard-coded values (quota limit in `Plan`) with server data.
- [x] Add a real image error state (503/502) beside the upgrade modal, with retry when the
      server marks the failure `retryable` (2026-11-01).
- [x] **C-1** Fix chat providers (2026-11-02): current model defaults, 60 s timeout,
      3 bounded attempts, `retryable` in 502, rate-limit session-with-initial-message,
      session-required `/message`, slim `/all`, tests.
- [ ] **C-2** Rebuild the conversation surface (accessible session list, optimistic
      messages, rendered markdown, inline send error + retry, mock badge, textarea composer,
      suggested prompts, jump-to-latest, deep-linkable `?session=`).
- [ ] **C-3 (deferred)** Stream assistant replies with a stop button and a mock-free
      production path; requires the route to change from JSON to SSE.
- [x] Show the active provider/mock badge on the image studio when `mock: true` (2026-11-01);
      chat and background removal still need it.
- [x] Light/dark/system theme toggle in the navbar (2026-11-01).
- [ ] Keyboard and 320 px pass across all five surfaces; manual pass in both themes.
- [ ] Add `loading.tsx` / `error.tsx` boundaries per segment.

### Phase C — Reliability

- [x] Rate limiting on charged routes (Mongo fixed window, §11.2.1).
- [ ] Stripe event idempotency + `stripe_events` collection.
- [ ] Generate a request id and return it in error responses.
- [ ] Bounded provider timeouts exposed as stable error codes.
- [ ] Cursor pagination for image/background/conversation history.

### Phase D — Demo and portfolio

- [ ] `.env.example` matches every variable the code reads; README setup verified from a
  clean clone.
- [ ] README: honest status table, architecture, API, limits, screenshots.
- [ ] Record a 60–90 s walkthrough of the five-minute script.
- [ ] Add CI (typecheck, lint, test, build) on push.
- [ ] Confirm the deployed preview matches `main`.

### 13.1 Five-minute demo script

1. Sign in and land on the dashboard.
2. Read plan and remaining free generations.
3. Generate one image, open it, download it, find it in history.
4. Ask a chat question and see the reply persisted.
5. Upload an image in Background Studio, compare before/after, download the cutout.
6. Hit the free limit and see the upgrade modal.
7. Complete Stripe test checkout; confirm PRO only after the webhook.
8. Open Video and see the honest "not available" page.
9. Delete a conversation and confirm it disappears.

If a step is unavailable in the demo environment, say why instead of staging a fake.

---

## 14. Decision log

| Decision | Current direction | Revisit when |
|---|---|---|
| Database | MongoDB + Mongoose | Measured limitation or owner decision |
| API | Hono mounted at `/api` | Streaming or runtime requirement changes |
| Server state | TanStack Query (already present) | A demonstrated need for a different cache |
| Client state | Local state; no Zustand | Shared UI state spans distant components |
| Component base | shadcn `base-nova` on Base UI | A component cannot meet a11y/design needs |
| Storage | Local, S3-compatible (AWS/R2/B2), or ImageKit via one adapter | A CDN requirement the adapter cannot meet |
| Image provider | Cloudflare FLUX.1 schnell | Quality, cost, or latency no longer fit |
| Chat provider | Groq `openai/gpt-oss-120b` first, Gemini `gemini-3.6-flash` fallback (C-1) | Rate limits, price, or quality change |
| Chat transport | Request/response JSON until C-3; no fake stop button | Streaming is worth the SSE + abort work |
| Background provider | remove.bg `v1.0` default, Photoroom fallback via `BACKGROUND_PROVIDER` | Contract, quality, or cost changes |
| Video | Disabled, honest page | A verified provider + jobs + billing exist |
| Free quota | 5 shared successful requests | Product owner changes pricing |
| PRO quota | No cap in code; copy says "no free-tier cap" | A fair-use policy is enforced |
| Tests | Bun built-in runner | Team standardizes on another runner |
| Rate limits | Mongo fixed window, fail-open | Redis or an edge limiter is available |
| Theming | `next-themes`, `.dark` class, system default | Theme must be server-resolved per request |

---

## 15. Do / don't

### Do

- Read the Next.js docs shipped with the installed version before changing routing,
  caching, or proxy behaviour.
- Keep `src/proxy.ts` beside `src/app` — a root-level `proxy.ts` is silently ignored.
- Use semantic tokens and test light + dark.
- Keep `Idempotency-Key` on every charged mutation.
- Keep the ledger-backed quota path for every new charged feature.
- Return stable error codes and preserve prompts on failure.
- Add a `*.test.ts` next to pure logic and quota changes.
- Update this file when architecture, providers, or policy changes.

### Don't

- Don't add TanStack Query (already present) or a second cache.
- Don't add Zustand for server data.
- Don't store bytes/base64 or signed URLs in MongoDB.
- Don't trust client-supplied `userId`, plan, quota, or object keys.
- Don't expose secrets or private object keys.
- Don't mix Radix and Base UI primitives.
- Don't ship an untouched shadcn starter look or dead controls.
- Don't claim "unlimited", "4K", a video date, or a provider feature without proof.
- Don't run `bun run build` against real production secrets in a shared environment.
- Don't commit `.env.local`, `.data/`, or `.next/`.

---

## 16. Definition of done

- [ ] The requested behaviour works end to end, or the blocker is documented.
- [ ] Server authorization and ownership are enforced.
- [ ] Inputs are validated on the client and the server.
- [ ] Loading, empty, success, error, and quota states exist where relevant.
- [ ] Light and dark themes, desktop and 320 px mobile checked.
- [ ] Keyboard navigation and visible focus verified.
- [ ] No secret, private URL, or raw provider payload exposed.
- [ ] `typecheck`, `lint`, `test`, `smoke`, `build` pass; new lint/type errors are zero.
- [ ] README and this guide updated when behaviour or architecture changed.
- [ ] Report states what changed, what was tested, and what remains blocked.

**North star:** a recruiter can open Vision, understand it in 30 seconds, create
something, find it again, see the cost honestly, and trust that the files are private.
