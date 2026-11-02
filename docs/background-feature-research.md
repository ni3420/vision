# Replace music generation with an AI background feature

Checked 2026-11-02. Decision: remove music generation, add a **Background Studio** (subject cutout + optional AI-generated scene) built on the **Photoroom API**.

## Why Photoroom

- One API covers both background removal (`POST /v1/segment`) and AI-generated backgrounds (`POST /v2/edit` with `background.prompt`), plus shadows — exactly the two halves of "AI image background" for product and marketing photos.
- Synchronous binary response, so the existing `putObject` + B2/ImageKit pipeline works without a job queue.
- $20/month for 1,000 removals ($0.02/image); AI backgrounds on the Plus plan at $0.10/image. Free sandbox with 1,000 watermarked edits for development.
- Auth is a single `x-api-key` header; inputs are multipart (`imageFile`), max 30 MB; outputs PNG/JPEG.

## Tool comparison (verified 2026-11-02)

| Tool | Removal | Generate background | Price | Status | Fit |
|---|---|---|---|---|---|
| **Photoroom API** | `/v1/segment` | `/v2/edit` `background.prompt` | $0.02/img; $0.10/img with AI bg | Active, documented | **Best overall** |
| Cloudflare Images (BiRefNet) | Yes | No (transparent/white only) | Cloudflare Images plan (beta) | Open beta | Good if already on Cloudflare Images; removal only |
| Clipdrop | Yes | Yes (`replace-background`) | ~$0.144–0.50/img in credit packs | Active | Expensive per image |
| remove.bg | Yes | No | Free preview-only; paid API | **Sunsetting into Canva 2026-12-01** | Disqualified |
| Bria RMBG-2.0 via fal | Yes (guided) | No | $0.03/img | Active | Good removal-only fallback; licensed training data |
| Poof (poof.bg) | Yes (images + video) | No | $0.002/img; $0.45/min video | Active, small vendor | Cheapest cutouts; pair with FLUX + compositing |
| rembg (self-hosted) | Yes (BiRefNet, ISNet, U2Net) | No | $0 API + Python/ONNX compute | MIT, active | Zero per-image cost, needs its own service |
| Knockout (useknockout) | Yes (BiRefNet, ~200 ms) | Yes, `/replace-bg-ai` (preview) | $0.02/img; Plus $10/mo + 250; volume $0.003 | Active; AI endpoint in preview | Best fidelity design; AI endpoint not GA |
| Gemini Lyria / image edit | No matte | Scene edit only | Requires valid billing key | Key currently invalid | Not a matte tool |

## Feature scope (MVP)

1. Upload a product or portrait image (PNG/JPEG/WebP, ≤ 10 MB enforced by us).
2. Choose an output: **Transparent PNG** (segment) or **AI scene** (preset or custom prompt).
3. Server calls Photoroom, stores the result through `putObject`, records a `Background` document with provider/model, and charges one credit.
4. UI shows a before/after comparison, copy/download, and recent jobs.
5. Failure refunds the credit (existing quota guard behavior).

Presets for the AI scene: Studio white, Soft shadow, Marble counter, Linen table, Seasonal warm, Lifestyle loft. Custom prompt is appended to a fixed product-safety suffix.

## Implementation plan

**Provider adapter** `src/server/ai/background.ts`
- `generateBackground({ file, mode, prompt })` → `{ bytes, mime, provider: "photoroom", model: "segment-v1" | "edit-v2", mock }`.
- Mock mode returns the original image only in development, clearly flagged (`mock: true`), never in production.
- Env: `PHOTOROOM_API_KEY`.

**Model** `src/models/background.models.ts` — `userId`, `kind` (`cutout` | `scene`), `prompt`, `sourceKey`, `objectKey`, `provider`, `model`, `createdAt`.

**API** `src/features/background/server/route.ts`
- `GET /api/background/history`
- `POST /api/background/generate` (multipart or JSON with source object key) with `rateLimitGuard("background")` and `quotaGuard("background")`.

**UI**
- `src/app/(dashboard)/background-studio/page.tsx`
- `src/features/background/components/background-studio.tsx` (dropzone, preset grid, prompt, before/after)
- hooks: `use-generate-background`, `use-background-history`
- nav: replaces the Music entry in desktop and mobile sidebars; dashboard quick action becomes "Remove background".

**Shared changes**
- `UsageKind` and `AssetKind`: replace `"music"` with `"background"`.
- `RateLimitRoute` + limits: replace `music` with `background` (e.g. 10/min).
- Dashboard summary/distribution/usage chart: swap the music facet for backgrounds.
- Conversation quota copy: "images or backgrounds".
- Chat system prompt: images, backgrounds, marketing assets.
- `.env.example`: remove `TREBLO_API_KEY`, add `PHOTOROOM_API_KEY`.
- README / AGENTS / docs: update feature lists and status.

**Removal map for music** (37 references)
- Delete: `src/features/music/**`, `src/models/music.models.ts`, `src/server/ai/music.ts`, `src/app/(dashboard)/music-generator/page.tsx`.
- Edit: `src/app/api/[[...route]]/route.ts`, `src/server/ai/types.ts`, `src/base storage.ts` (`buildObjectKey` kind union), `src/models/asset.models.ts`, `src/models/usage-ledger.models.ts`, `src/server/rate-limit.ts` (+ test), `src/server/quota.test.ts`, dashboard `service.ts` / `summary.ts` / `summary.test.ts` / `distribution.ts` / `distribution.test.ts` / `usage-chart.tsx` / `dashboard-page.tsx` / `sidebar.tsx` / `mobile-sidebar.tsx`, `src/app/layout.tsx`, `src/features/conversation/lib/errors.ts`, `src/server/ai/chat.ts`, `scripts/smoke-adapters.ts`, `.env.example`, `README.md`, `AGENTS.md`, `package.json` if scripts mention music.
- Existing `Music` Mongo documents stay untouched (no destructive migration); only the code path stops reading/writing them.

## Free-trial economics (Photoroom is paid)

Photoroom's free sandbox (1,000 watermarked edits/month) is for development only — never for user output.

Design: route the **free tier to a cheap cutout engine**, and reserve Photoroom AI scenes for Pro or a single funded taste.

| Free-trial design | Cost per signup (5 uses) | Notes |
|---|---|---|
| 5 cutouts, Photoroom Basic | $0.10 | One vendor, clean output |
| 5 cutouts, Poof | $0 first 100/month, then $0.01 | 4 req/min free limit |
| 5 cutouts, self-hosted rembg | $0 | Needs a Python service |
| 1 AI scene (Photoroom) + 4 cutouts (Poof) | $0.10 | Best conversion taste |
| 1 watermarked AI scene | $0.10 provider cost | Watermark prevents reuse, not spend |

Implementation with the existing quota: keep `FREE_GENERATION_LIMIT`, add a per-kind counter (e.g. `trialAiSceneUsed` on `User`) so free AI scenes are once-per-account; select the provider by plan (`FREE` → Poof/rembg cutout, `PRO` → Photoroom scene); record provider cost on the usage ledger; keep rate limits, idempotency keys, and Clerk-only accounts to prevent trial farming.

## Verification plan

- Unit tests for the adapter (mock mode, provider error mapping), quota/refund, rate limit, and payload validation.
- Live check against Photoroom sandbox (watermarked output is expected there).
- Browser pass: upload → cutout → AI scene → history → download; check mobile layout, keyboard use, and error states.
- Gates: `tsc`, `eslint`, `bun test`, smoke, production build.

## rembg (self-hosted cutouts)

- MIT-licensed Python tool (3.11–3.13) on ONNX Runtime; runs as a library, CLI, HTTP server, or Docker container; models include BiRefNet, ISNet, U2Net.
- Removal only — it does not generate scenes, so it replaces Poof/Photoroom-segment, not the whole feature.
- Deployment cost: a small always-on container (CPU inference ~1–3 s per image) plus ops. Serverless Next/edge runtimes cannot host the model weights; a Vercel function is the wrong shape.
- Privacy upside: images never leave your infrastructure. Quality is close to commercial APIs on simple product edges; hair, glass, and translucent objects still favor dedicated providers, and there is no relighting or shadow.
- Node-only alternative: `@tugrul/rembg` (ONNX Runtime for Node) or `@bunnio/rembg-web` in the browser; same model-size and memory constraints apply.
- Licensing caution: rembg itself is MIT, but each model weight carries its own terms. Avoid BRIA RMBG-2.0 weights without a commercial license.

**Verdict:** keep rembg as the swappable local cutout engine for development or a privacy-sensitive/self-hosted deployment. Use Photoroom for the MVP scene feature.

## Knockout (useknockout)

- 26 endpoints on BiRefNet: cutouts, masks, PSD export, upscale, replacement, plus `/replace-bg-ai`.
- `/replace-bg-ai` takes a text prompt and **generates only the backdrop, then composites the cutout**, so product pixels are never regenerated — the strongest fidelity model among the options reviewed.
- Pricing: free 30 images/month; PAYG $0.02/image; Knockout Plus $10/month with 250 images; volume $0.003/image at 100k+/month; enterprise custom. MIT-licensed repo, self-hostable on Modal GPUs. Bearer auth, JPG/PNG/WebP/HEIC.
- Blocker: `/replace-bg-ai` is **in preview, not billed, and subject to a global daily cap**, and the GitHub pricing notes say it is not part of the free tier. That is not a production SLA.
- Latency claim is ~200 ms for cutouts on Modal L4; AI compositing latency is not published.

**Verdict:** strongest long-term architecture and by far the cheapest AI background, but the generative endpoint is preview-grade. Keep Knockout as the planned second provider; adopt it for production once `/replace-bg-ai` is generally available or self-hosted.

## Hybrid option (cheapest, preserves product pixels)

Poof removes the background ($0.002/image), the existing Cloudflare FLUX worker generates the scene, and a server-side compositor (e.g. `sharp`) places the original cutout on top. This never regenerates the product, which matches the project's product-fidelity principle, and costs roughly $0.01–0.02 per image instead of $0.10. Cost: a second integration, a compositing step, shadow/lighting work, and quality variance from the background model.

Use the hybrid only after the single-vendor Photoroom MVP ships; it trades engineering time for margin.

## Uncertainty

- Photoroom API-specific commercial terms were not quoted on the pages fetched; the consumer help article ties commercial use to paid plans. Review the Enterprise Services Agreement before launch.
- `/v2/edit` (AI backgrounds) is a Plus-plan feature at $0.10/image; confirm current plan limits before wiring billing.
- No async mode: generation must finish inside one request; Photoroom advertises sub-second removal, but AI scene edits can take longer, so server timeouts need measuring.

## Implementation status (2026-11-02)

Shipped the **cutout-only** MVP:

- Adapter: `src/server/ai/background.ts` calls `POST https://sdk.photoroom.com/v1/segment` with header `x-api-key` and multipart field `image_file`; expects a binary PNG, checks the PNG signature, and records dimensions with `sharp`. Timeout 60 s, 3 bounded attempts, `Retry-After` honoured. No live call was possible here (no key), so the contract is documentation- and stub-tested only.
- Mock: `AI_MODE=mock` or no key outside production returns a locally masked, visibly labelled PNG with `mock: true`. Production without a key returns `503 PROVIDER_NOT_CONFIGURED`.
- API: `POST /api/background` (rate limit 10/min + quota + multipart validation: PNG/JPEG/WebP, signature match, 10 MB) and `GET /api/background/history` (30 newest). Source and cutout are stored privately; metadata lives in the `backgrounds` collection.
- UI: `/background-studio` with upload, before/after comparison on a checkerboard, download, mock badge, quota/upgrade handling, and history.
- Music generation was removed and its quota/rate-limit/dashboard slots now belong to background removal.

Not shipped (still research): AI scene backgrounds (`/v2/edit`), the free-tier split across cheaper providers, and Photoroom billing integration.

## Provider update (2026-11-02): remove.bg

A live Photoroom probe (real key, 512×512 JPEG) returned **HTTP 402 — credits exhausted**, so no cutout could be produced. The adapter mapped it correctly (`PROVIDER_CALL_FAILED`, `retryable: false`), but the account could not serve the feature.

The working key in this workspace is remove.bg, so it is now the default provider:

- Contract (docs-verified at <https://www.remove.bg/api>): `POST https://api.remove.bg/v1.0/removebg`, header `X-Api-Key`, multipart `image_file`, `size` (`auto`, `preview`, `full`, `50MP`, …), `format=png`; binary PNG response; max input 12 MB; failures return `{ "errors": [{ "title", "detail", "code" }] }`.
- Cost model: **preview** is capped at 0.25 MP and covered by the free API allowance (50 calls/month); **full** runs up to 25 MP and consumes credits. Background Studio therefore exposes a Preview/Full selector, defaulting to Preview.
- Implementation: `src/server/ai/removebg.ts`; `src/server/ai/background.ts` dispatches remove.bg → Photoroom → configured-provider error. `BACKGROUND_PROVIDER` pins a provider explicitly.
- Unchanged: 10 MB upload cap, signature validation, private storage, quota/rate limits, history.
- Live preview verified 2026-11-02: a 512×512 JPEG produced a 500×500 RGBA PNG (65,939 bytes, 91.3% fully transparent, ~4.3 s, provider `removebg`/`removebg-v1`, `mock: false`). Full-resolution behaviour and its credit cost remain unmeasured.

Error-copy fix shipped alongside: provider failures now honour the server's `retryable` flag, so an exhausted-credit 402 shows the provider message without a Retry button that cannot succeed.
