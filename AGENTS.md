# AGENTS.md — Vision

> Single source of truth for humans and AI agents working on this repository.
> Read this file completely before changing code. `CLAUDE.md` points here.
>
> Last verified: 2026-11-01 · commit `233c928` · branch `master` (tracks `origin/main`)

---

## 0. Agent contract

1. Inspect the repository before editing. Never assume the README is accurate; this file wins.
2. Next.js here is **16.2.10** with breaking changes. Read the relevant guide in
   `node_modules/next/dist/docs/` before writing routing, layout, or caching code.
3. For design or spec-level changes: update this file first, show the UI (preview/screenshot)
   second, edit code third. Only touch the surface the request names.
4. Do not deploy, do not spend paid provider credits, do not create external accounts,
   and do not paste secrets into chat or logs.
5. Never invent a provider endpoint, model name, price, or quota. Verify against the
   provider's current docs and record the source in the decision log.
6. No fake success states, no dead buttons presented as working features, no TODO buttons.

---

## 1. Mission and internship target

Vision is a multi-modal AI creation workspace: **image, chat, music, and later video**.
The goal is not "more models"; it is one coherent product a recruiter can evaluate in five
minutes: sign up, create something, see history, hit the free limit, upgrade, and keep creating.

**Target state (internship-ready):** a deployed app with working generation paths, honest
free-tier limits, real error/empty/loading states, a clean README with screenshots, and a
repeatable 5-minute demo. Video is explicitly out of scope until a paid provider is configured.

Success means: a stranger can complete the demo script in §11.1 without hitting a bug or a
misleading claim.

---

## 2. Current state (verified on the commit above)

### 2.1 Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.10 (App Router, Turbopack, `src/app`) |
| UI | React 19.2.4, Tailwind v4, `@base-ui/react`, shadcn-style primitives, lucide icons |
| API | Hono 4 mounted at `/api` via `hono/vercel` (`src/app/api/[[...route]]/route.ts`) |
| Auth | Clerk v7 (`@clerk/nextjs`, `@clerk/hono`); Clerk `userId` is the Mongo key |
| DB | MongoDB via Mongoose 9 (`src/db/db.ts`, `src/models/*`) |
| Data client | TanStack Query + Hono typed `hc` client (`src/lib/client.ts`) |
| Payments | Stripe Checkout + webhook (`src/features/Subscription/server/route.ts`) |
| AI | Provider adapters in `src/server/ai/` (Cloudflare image, Groq/Gemini chat, Treblo music, local mock mode) |
| Storage | `src/server/storage.ts` (S3/R2 driver, local dev driver); `Asset` + `UsageLedger` models |
| Package manager | Bun (`bun.lock`); scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `smoke` |
| Local database | `docker compose up -d` → `mongo:7` on `127.0.0.1:27017`, volume `mongo-data`, `DB_URL=mongodb://127.0.0.1:27017/vision` |

### 2.2 Feature status

| Area | Route | Status | Reality |
|---|---|---|---|
| Dashboard | `/` | Works | Analytics console reading 4 queries; image rows now carry `createdAt` |
| Image studio | `/image-generator` | Works (mock-capable) | Cloudflare JSON parsed and normalized with sharp; bytes in object storage; 1–2 images per request |
| Video studio | `/video-generator` | Placeholder | No provider and no free API; page states that plainly and links to images. Nav shows a "Soon" badge; no release dates |
| Conversation | `/conversation` | Works (mock-capable) | Groq → Gemini fallback; history capped at 12 turns; no streaming |
| Music studio | `/music-generator` | Works (mock-capable) | Treblo polling; bytes in object storage; local WAV mock |
| Billing | `/api/stripe` | Works | Checkout + 3 webhook events; no idempotency (D8); no customer portal |
| Auth sync | `/api/auth` | Works | `UserSync` in the dashboard layout creates/reads the Mongo user on every protected page |
| Assets | `/api/assets/:key` | Works | Private objects, ownership-prefixed keys, presigned/S3 or local dev driver |

### 2.3 Defect register (do not "discover" these twice)

Fixed on 2026-11-01:

- **D1 — nested document shell.** `(dashboard)/layout.tsx` now renders only the dashboard shell;
  `<html>/<body>` exist only in `src/app/layout.tsx`.
- **D2 — invalid model name.** `src/gemini/*` deleted. Chat lives in `src/server/ai/chat.ts`:
  Groq `llama-3.3-70b-versatile` (verified in Groq's production model list), Gemini
  `gemini-2.5-flash` fallback, override with `GROQ_MODEL` / `GEMINI_MODEL`.
- **D3 — wrong image response type.** `src/server/ai/image.ts` parses Cloudflare's JSON
  (`result.image` and compatible shapes) as well as raw binary responses.
- **D4 — unbounded Mongo documents.** `src/models/image.models.ts` deleted. Bytes go to
  `src/server/storage.ts`; Mongo stores `Asset` metadata only. Caps: 64–1536px per side,
  1–2 images per request.
- **D5 — quota not transactional.** `src/server/quota.ts` reserves atomically before the
  provider call, settles on success, and refunds on 4xx/5xx or a thrown error.
- **D6 — chat counted per message.** One unit per successful request across all modalities,
  including a session's initial message; an empty session creation is free.
- **D11 — image chart never counts images.** Image responses are objects with `id`, `url`,
  `width`, `height`, `prompt`, `provider`, `model`, and `createdAt`.
- **D9 — misleading README.** Rewritten 2026-11-01: real stack (Cloudflare/Groq/Gemini/Treblo),
  real routes, current tree, env table, mock-mode rules, honest limitations. The live-demo and
  OpenAI claims are gone; the deployment URL is marked as possibly lagging the default branch.
- **D10 — stale product claims.** Video page rewritten 2026-11-01: states that no provider is
  configured, removes "4K", motion controls, GPU priority, and the past Q3 2026 date, and links
  to the image generator.

Still open:

- **D7 — no rate limits.** No per-user or per-IP limits on generation, upload, auth, or webhook.
- **D8 — no webhook idempotency.** `src/features/Subscription/server/route.ts:85` applies events
  without recording event IDs; duplicate deliveries are harmless for `plan: "PRO"` but unsafe
  once credits/periods exist.
- **D12 — dev-only origin in production config.** `next.config.ts:6` hardcodes an ngrok host.

Gates after the 2026-11-01 fixes: `tsc --noEmit` clean, `bun run build` succeeds, and lint is
**26 problems (15 errors, 11 warnings)** — all pre-existing. Compare counts, never expect zero.

---

## 3. Target architecture

### 3.1 Shape

```text
Browser (Next.js App Router)
  ├── (dashboard) pages: composer + result canvas + history
  ├── TanStack Query hooks (features/*/api)
  └── Hono typed client (src/lib/client.ts)
            |
            v
Hono API at /api  (Node runtime, force-dynamic)
  ├── clerkMiddleware → auth context
  ├── DB() connection guard
  ├── quota.reserve() → provider call → quota.settle()/refund()
  ├── provider adapters (server-only)
  └── Mongo: users, conversations, assets, jobs
            |
            v
Providers: Cloudflare (image), Groq (chat), Treblo (music)
Storage: R2/S3 for bytes; Mongo stores metadata + object keys
```

Rules:
- The browser never calls a provider directly and never sees a provider key.
- Every provider call goes through an adapter with timeout, retry policy, and error mapping.
- Long operations (video, batch) must become jobs, not a single request lifecycle.

### 3.2 Folder contract

Keep feature slices; do not flatten them into `components/` and `lib/`.

```text
src/
  app/(dashboard)/<page>/page.tsx        thin page: layout + feature component
  app/api/[[...route]]/route.ts          Hono mount only (no business logic)
  features/<feature>/
    api/                                 TanStack Query hooks
    components/                          client UI for this feature
    server/route.ts                      Hono sub-router
    schema.ts                            Zod request contracts
  server/                                shared server-only infrastructure (new)
    ai/provider.ts                       adapter interfaces
    ai/cloudflare-image.ts
    ai/groq-chat.ts
    ai/treblo-music.ts
    quota.ts                             atomic reserve/settle/refund
    storage.ts                           presign/put/delete (R2 or S3)
  models/                                Mongoose schemas
  lib/                                   client, stripe, utils
  middleware/                            Hono middleware
```

Rules:
- One feature per pull request. Shared code moves to `src/server/*` only when a second
  feature needs it.
- `route.ts` files validate, authorize, check quota, call a service, and map errors. No prompts,
  no provider URLs, no retry loops inline.
- Zod schemas are the source of truth for request types; infer, do not duplicate.

### 3.3 API surface

| Method + path | Purpose | Auth |
|---|---|---|
| `POST /api/auth` | Create/read Mongo user | Clerk |
| `GET /api/auth/current` | Current user + quota | Clerk |
| `POST /api/image` | Generate 1–4 images | Clerk + quota |
| `GET /api/image/history` | Paginated image metadata | Clerk |
| `POST /api/conversation/session` | Create session + first reply | Clerk + quota |
| `POST /api/conversation/message` | Append message + reply | Clerk + quota |
| `GET /api/conversation/all` | List sessions (paginate) | Clerk |
| `GET /api/conversation/:sessionId` | Session messages | Clerk |
| `DELETE /api/conversation/:sessionId` | Delete session | Clerk |
| `POST /api/music/generate` | Start music generation | Clerk + quota |
| `GET /api/music/history` | List tracks | Clerk |
| `POST /api/stripe` | Create checkout session | Clerk |
| `POST /api/stripe/webhook` | Stripe events | Stripe signature only |
| `POST /api/assets/upload-url` | Presigned upload (future) | Clerk |
| `POST /api/video/generate` | Future, PRO only | Clerk + paid credit |

Response envelope: `{ success: true, data }` or `{ success: false, error: { code, message } }`.
Use stable machine codes (`QUOTA_EXCEEDED`, `PROVIDER_TIMEOUT`, `INVALID_INPUT`) and plain,
human-readable messages.

### 3.4 Data model

```text
users:        userId (unique), email, name, plan (FREE|PRO), freeUsesCount,
              stripeCustomerId, createdAt
conversations: userId, sessionId (unique), messages[{role, content, createdAt}], timestamps
assets:       userId, kind (IMAGE|MUSIC|VIDEO), objectKey, mime, bytes, width, height,
              durationSec, prompt, provider, model, visibility, createdAt, deletedAt
jobs:         userId, kind, status (QUEUED|RUNNING|SUCCEEDED|FAILED), providerTaskId,
              input, errorCode, creditsReserved, timestamps
usage_ledger: userId, kind, amount (+/-), reason, idempotencyKey (unique), createdAt
```

Rules:
- Bytes live in object storage, never in Mongo. Mongo stores keys and metadata.
- Index `userId` on every user-owned collection; index `sessionId` uniquely.
- Use integer credits, not floats. Ledger entries are append-only.
- Never trust an owner ID from the request. Derive it from Clerk.

---

## 4. Provider decisions (free-first)

### 4.1 Chosen providers

| Modality | Primary | Free allowance | Fallback | Why |
|---|---|---|---|---|
| Image | Cloudflare Workers AI `flux-1-schnell` | 10,000 neurons/day ≈ 520 images at 1024² | Pollinations `flux.1-schnell` (one-time grant) | Already wired; zero retention; ~$0.0002/image after free |
| Chat | Groq (`https://api.groq.com/openai/v1`) | ~30 RPM, 1,000 RPD, 8K TPM, 200K TPD | Cloudflare text models | Free, fast, no training on inputs; OpenAI-compatible |
| Music | Treblo (existing) | Trial, then $11/mo ≈ 200 songs | Stability Stable Audio (25 one-time credits ≈ 3 tracks) | Already integrated; ~$0.055/song |
| Video | None | — | Pollinations `wan-2.2-fast` (~$0.05/5s, paid) when PRO | No free video API exists |

**Gemini rule:** the free tier lets Google use prompts/outputs to improve products. Use it only
for local development with synthetic data. Do not route real user prompts through it. If chat
quality requires Gemini in production, use the paid tier and record the decision here.

**Do not use:** OpenRouter free (50 RPD without $10 lifetime), Hugging Face free (zero monthly
credits), Together FLUX free (expired promo), ModelScope Wan (API inference disabled),
Pollinations video/music (paid-only), Gemini free image (paid-only).

### 4.2 Adapter contract

Implemented in `src/server/ai/` (`types.ts`, `runtime.ts`, `image.ts`, `chat.ts`, `music.ts`):

```ts
generateImage(input: { prompt; width; height }): Promise<{
  bytes: Buffer; mime; width; height; provider; model; mock;
}>;

generateChatReply(history: ChatMessage[], message: string): Promise<{
  text; provider; model; mock;
}>;

generateMusic(input: { prompt; durationSec }): Promise<{
  bytes: Buffer; mime; durationSec; provider; model; mock;
}>;
```

Mode resolution (`resolveMode`) is per modality: `AI_MODE=mock` forces mocks, `AI_MODE=live`
always calls the provider and fails loudly when unconfigured, and `auto` uses a live provider
when the key looks real, otherwise mocks outside production. A mock result sets `mock: true`
in the HTTP response so the UI can label it; production never falls back to mock silently.

Adapters own: timeouts (image 60s, music polling 20×5s), provider error → stable error code
mapping, and output normalization (sharp resize to the requested dimensions).

### 4.3 Cost and quota math

- Cloudflare: 4.80 neurons per 512×512 tile. 1024×1024 = 4 tiles = 19.2 neurons.
  `10,000 / 19.2 ≈ 520` free images/day; paid `19.2 × $0.011/1000 ≈ $0.00021`/image.
- Groq: free within rate limits; budget 20 messages/user/day.
- Treblo: ~$0.055/song; one free track per FREE user.
- Worst-case cost of a FREE signup: 5 images ($0) + 20 messages ($0) + 1 song (~$0.055).
- Video, if added: ~$0.05 per 5s clip; never free.

### 4.4 Environment variables

Names only; never commit values. Add a tracked `.env.example` with placeholders.

```text
DB_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_APP_URL

AI_MODE                       # auto | live | mock
CLOUDFARE_URL                 # legacy full Workers AI URL (supported)
CLOUDFARE_API_KEY             # legacy token name (supported)
CLOUDFLARE_ACCOUNT_ID         # preferred; builds the flux-1-schnell URL
CLOUDFLARE_API_TOKEN          # preferred token name
GROQ_API_KEY
GROQ_MODEL                    # default llama-3.3-70b-versatile
GEMINI_API_KEY                # fallback chat provider (dev/synthetic data only)
GEMINI_MODEL                  # default gemini-2.5-flash
TREBLO_API_KEY

STORAGE_DRIVER                # local | s3
LOCAL_STORAGE_DIR             # default <cwd>/.data/uploads
S3_BUCKET
S3_REGION
S3_ENDPOINT
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
S3_FORCE_PATH_STYLE

STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
```

`.env.example` tracks every name with empty values.

---

## 5. Quota and billing rules

1. FREE = **5 successful requests total** across image, chat, and music. One unit is one image
   request (regardless of the 1–2 image count), one assistant reply, or one music track.
   Creating an empty chat session is free.
2. Reserve the unit **before** the provider call with an atomic Mongo update
   (`findOneAndUpdate({ userId, plan: { $ne: "PRO" }, freeUsesCount: { $lt: 5 } }, { $inc: ... })`).
   If no document matches, return 403 `QUOTA_EXCEEDED`. Implemented in `src/server/quota.ts`.
3. Settle on success. Refund when the handler returns >= 400 or throws (`quotaGuard`) or when
   the wrapped work throws (`runWithQuota`). `UsageLedger` records `reserved`/`settled`/`refunded`.
4. Accept an optional `Idempotency-Key` header on generation routes; a unique sparse index on
   `UsageLedger.idempotencyKey` prevents a second charge. A replayed key returns 409
   `DUPLICATE_REQUEST` (the client generates one key per user action). Returning the cached
   result is still a P1 improvement.
5. PRO is a fair-use cap (for example 200 generations/month), not "unlimited". Never display
   "Unlimited" unless the provider contract supports it.
6. Show the remaining count before the user runs an expensive action.

---

## 6. Asset storage rules

- Image/audio bytes live in R2/S3 (`STORAGE_DRIVER=s3`) or `.data/uploads` in development.
  Mongo stores `Asset` metadata only: `objectKey`, MIME, byte size, dimensions/duration,
  provider, model, prompt, and timestamps.
- Generate opaque keys (`users/<userId>/<kind>/<yyyy>/<mm>/<uuid>.<ext>`); never use user
  filenames as paths. `isOwnedKey` rejects traversal and cross-user prefixes.
- S3 objects are served through short-lived presigned URLs; the local driver serves
  `/api/assets/:key` behind Clerk auth. Objects stay private by default.
- Keep data URLs only for in-flight previews in the browser; never persist them.
- Caps stay in force until model/provider limits justify more: 64–1536px per side and 1–2
  images per request (`src/features/image/schema.ts`).

---

## 7. UI/UX direction and references

### 7.1 What to borrow

| Reference | Borrow | Do not copy |
|---|---|---|
| [Krea](https://www.krea.ai/) | One composer + model/quality selector; results on a canvas; recent work visible | Model marketplace sprawl, branding, copy |
| [Photoroom](https://www.photoroom.com/) | Upload → remove background → scene → batch; before/after; product-identity warning | Its exact layouts or marketing text |
| [Ideogram](https://ideogram.ai/) | Style presets, aspect ratios, typography emphasis; remix from a result | Its brand assets |
| [Canva](https://www.canva.com/ai-image-generator/) | Platform size presets and export flows; editable text, not pixel text | Full editor scope |
| [Leonardo](https://leonardo.ai/) | Collapsible advanced controls (seed, references, count); asset library | Its gallery density |
| [Adobe Firefly](https://www.adobe.com/products/firefly.html) | Cost shown before running; provenance/credits transparency | Enterprise-only controls |
| [Runway](https://runwayml.com/) | Job status, retry, project context | Video scope before image/chat are solid |

### 7.2 Current design tokens

Keep the existing system: indigo primary (`oklch(0.49 0.22 260)`), `--radius: 0.75rem`,
light/dark via `.dark`, cards with `rounded-3xl`, sidebar 64 (`w-64`) + 16 (`h-16`) header,
Tailwind v4 tokens in `src/app/globals.css`. Prefer tokens over hardcoded slate/indigo classes;
the dashboard currently mixes both.

### 7.3 Copy rules

Plain language only. Replace jargon before adding features:

| Current | Use |
|---|---|
| "Unauthorized access vector" | "Please sign in to continue." |
| "Exceeded structural trial provisioning allocation boundaries…" | "You've used all 5 free generations. Upgrade to keep creating." |
| "Neural Image Studio" / "Generate Studio" | "Image studio" / "Create" |
| "execution frames" / "render history" | "generations" / "History" |
| "Engine Status: Operational" | Remove unless backed by a real health check |

No claim may exceed the configured provider. If video is not configured, say "Not available yet".

### 7.4 Required states

Every generation surface needs: idle with example prompt, loading with progress text,
success with preview + metadata + download, failure with retry and a stable error message,
quota-reached with upgrade CTA, empty history, and unauthenticated redirect.
Keyboard focus must be visible; images need alt text; controls need labels.

---

## 8. Decision log

| ID | Decision | Why | Revisit when |
|---|---|---|---|
| A1 | Clerk for auth; Clerk `userId` is the DB key | Already integrated; works inside Hono | Never, unless migrating providers |
| A2 | MongoDB + Mongoose | Existing data layer; no migration budget | Document size or query needs outgrow it |
| A3 | Hono mounted at `/api` with typed `hc` client | Shared types, single mount point | Adding streaming or edge-only routes |
| A4 | Feature-slice folders | Keeps each modality isolated | A slice exceeds ~15 files |
| A5 | Free-first provider routing (Cloudflare/Groq/Treblo) | Zero/low cost for first use; no data training | Paid tier or quality complaints |
| A6 | 5 free generations, shared across modalities | Simple, predictable cost cap | Metrics show it blocks activation |
| A7 | No video until a paid provider is configured | No free video API exists | PRO revenue or a sponsor key |
| A8 | Assets move to object storage before public launch | Mongo 16 MB document cap | Never; this is a blocker |

---

## 9. Gates and verification

Run before and after every change:

```bash
node node_modules/typescript/bin/tsc --noEmit   # PASS (verified 2026-11-01)
bun run lint                                     # FAIL baseline: 38 problems (26 errors, 12 warnings)
bun run build                                    # requires .env.local; run before demos
bun run dev -- -p 3001                           # port 3000 is usually the Forma dev server
```

- No test framework exists. When adding one, use Vitest and test server handlers with mocked
  providers; add a smoke script that calls one endpoint per modality.
- Verify the page is actually Vision: check `<title>Vision</title>` before concluding anything.
- Protected routes return 404 to curl without `Accept: text/html`; check redirects in a browser.
- `bun run build` printing `ƒ Proxy (Middleware)` proves `src/proxy.ts` compiled.
- Runtime verification is the only "test" until Vitest lands: start the dev server, exercise
  the golden path, and read the server log.

---

## 10. Maintenance routine

**Every change**
- One feature slice; run all gates; update the status table in §2 if behavior changed.
- Add or update the decision log when a provider, quota, or storage choice changes.
- Never commit `.env*`. Rotate any key that appears in a log or screenshot.

**Weekly**
- Check provider pricing/limits and model IDs (Cloudflare, Groq, Treblo, Stripe API version).
- Review Cloudflare neuron usage, Groq rate-limit errors, Treblo failures, Stripe failed payments.
- Check Mongo document sizes for `conversations` and `images`; prune test data.
- Run `bun outdated` mentally: do not upgrade Next/Clerk/Stripe mid-demo week.

**Monthly**
- Refresh screenshots and the demo recording.
- Review free-tier abuse (signups per IP, generation spikes) and tighten limits.
- Re-read this file and delete rules that no longer match the code.

---

## 11. Internship-ready checklist (do in this order)

### P0 — blocking (target: today)

1. ~~Fix D1~~ — done 2026-11-01.
2. ~~Fix D2~~ — done 2026-11-01: Groq adapter (`llama-3.3-70b-versatile`) with Gemini fallback.
3. ~~Fix D3~~ — done 2026-11-01: Cloudflare JSON parsing + sharp normalization.
4. ~~Fix D4~~ — done 2026-11-01: bytes in storage, metadata in Mongo, size/count caps.
5. ~~Fix D5/D6~~ — done 2026-11-01: atomic reserve/settle/refund with `UsageLedger`.
6. ~~Remove D9/D10~~ — done 2026-11-01: README rewritten against the real stack; video page is
   an honest unavailable state with a "Soon" nav badge.
7. ~~Add `.env.example`~~ — done 2026-11-01.
8. ~~Fix D11~~ — done 2026-11-01: image responses are metadata objects.
9. **Add metadata** — real description, Open Graph image, favicon, page titles per route.
10. **Demo dry run** — complete §11.1 twice, once in a private window. Blocked until Clerk,
    MongoDB, and Stripe are configured with real values (§11.2).

### P1 — same day if time allows

- Rate limit generation, upload, and auth routes per user/IP.
- Stripe webhook: store event IDs, ignore duplicates, handle `invoice.payment_failed`.
- Add an error boundary and a global toast for provider failures.
- Remove the ngrok origin from `next.config.ts`; configure it via env if still needed.
- Check mobile: sidebar sheet, image form, conversation composer.

### 11.1 Demo script (5 minutes)

1. Sign up with a fresh account; land on the dashboard and read the quota.
2. Generate 2 images from one prompt; show the result, metadata, and history.
3. Ask one chat question; show the reply and that the quota decreased.
4. Generate one music track; play it from history.
5. Exhaust the 5th generation; show the upgrade CTA and the blocked action.
6. Open Stripe test checkout, complete payment, show the webhook flipping the plan to PRO.
7. Delete a conversation; show it disappearing from history.

### 11.2 Demo prerequisites (current blockers)

The application code is ready; the demo needs real infrastructure values in `.env.local`:

1. **Clerk** — a real publishable and secret key. With placeholders, `src/proxy.ts` cannot
   authenticate and no protected route renders or returns data.
2. **MongoDB** — a reachable `DB_URL`. Signup sync, quota reservation, assets, and history all
   depend on it. `mongodb://127.0.0.1:27017/vision` works with a local `mongod` or container.
3. **Stripe (test mode)** — secret key, PRO price ID, and `stripe listen` forwarding to
   `/api/stripe/webhook` for step 6 of §11.1.
4. **AI providers (optional for a first pass)** — with placeholders, `AI_MODE=auto` runs local
   mocks and the UI labels results "Local mock preview". Set real provider keys (and optionally
   `AI_MODE=live`) for genuine model output.

Verify without those keys: `bun run typecheck`, `bun run lint`, `bun run build`, `bun run smoke`.

### 11.3 Portfolio assets

- README: architecture diagram, screenshots of each surface, setup, env table, API list,
  cost table, known limitations, roadmap.
- 60–90 second Loom of §11.1.
- One-page cost/latency note using measured numbers, not estimates.
- Screenshot of the free-limit and upgrade flow (proves billing works).

---

## 12. Roadmap after today

| Phase | Scope |
|---|---|
| 1 | ~~Storage + asset metadata + signed URLs~~ (done 2026-11-01); pagination; Vitest + CI |
| 2 | Image editing (crop/rotate/inpaint only with a verified model); prompt presets |
| 3 | Product Studio (upload → background → scene) with before/after |
| 4 | Music upgrade path (paid Treblo or Stability); video behind PRO only |
| 5 | Public portfolio launch: custom domain, analytics, error monitoring, legal pages |

Do not start a later phase while a P0 item in §11 is open.

---

## 13. Open questions

1. Storage: R2 (same vendor as image) or S3 (existing habits)? Default to R2.
2. Chat: Groq free vs paid Gemini for quality? Decide with 10 real prompts, not vibes.
3. Music: keep Treblo (cheap) or switch to Stability (licensed-data story)? Decide before launch.
4. Deploy target: Vercel (current demo) or a container host using `output: "standalone"`?
5. Video: keep the honest placeholder or hide the nav item until a provider exists?

---

## 14. Do / don't

**Do**
- Read the relevant `node_modules/next/dist/docs/` page before touching routing or layouts.
- Put authorization and quota checks on the server, every time.
- Return stable error codes and log a correlation ID.
- Keep prompts and provider configs out of components.
- Prefer small, reviewable commits with a one-line subject.

**Don't**
- Don't store bytes in Mongo, trust client owner IDs, or expose provider keys.
- Don't add a dependency without a stated reason and a removal path.
- Don't "fix" the 38 lint problems as part of an unrelated change.
- Don't ship a control that the configured provider cannot support.
- Don't claim "unlimited", "4K", or a release date that the code does not deliver.
