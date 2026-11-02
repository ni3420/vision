# Music provider research

Checked 2026-11-02. Purpose: choose the generation provider behind the music feature.

## Current state in this repo

- `src/server/ai/music.ts` integrates **Treblo (Melodia v3)**: `POST /v1/generations/v3` → poll `/v1/generations/status/{id}` → download audio.
- `TREBLO_API_KEY` is **not set** in `.env.local` (checked by presence only), so `generateMusic` runs in mock mode and returns a synthesized WAV.
- The route (`src/features/music/server/route.ts`) expects bytes + mime, stores them through `putObject`, and records `provider`/`model` in Mongo. Any provider adapter must return those bytes; URL-only providers need a download step.

## Compared options

| | MusicAPI (musicapi.ai) | MyPaattu (mypaattu.com) | Treblo (current adapter) |
|---|---|---|---|
| Entry price | $19/mo Starter, 1,300 credits | ₹799/mo Studio (API access) | $11/mo Starter, 20,000 credits |
| Cost per generation | 20 credits, flat across models | 1 API credit per success | 100 credits (≈200 songs/Starter) |
| Free tier | 75 credits (≈3 songs) | 3 songs/day, no API | Free trial |
| Models | Sonic: `sonic-v3-5`, `sonic-v4`, `sonic-v4-5`, `sonic-v4-5-plus`, `sonic-v5`, `sonic-v5-5`, `sonic-v6`, `sonic-v6-wild`, `sonic-v6-mini` (verified from API validation); Producer; Udio / Lyria / ElevenLabs listed on pricing | One in-house model | Melodia v3 |
| Async flow | `POST /api/v1/sonic/create` → `GET /api/v1/sonic/task/{id}` or webhook; poll 15–25 s | `POST /api/v1/generate` → `GET /api/v1/status/{jobId}`; webhooks | Start → poll status → fetch result |
| Output | WAV, MIDI; download | WAV + stems (site); API response format not published | `song_paths[0]` or `audio_url` |
| Commercial rights | "full commercial rights" stated | Paid plans include commercial use | All tiers per third-party review |
| Limits | 1 request / 3 s | Rate-limited per key; Studio 60 songs/day | Not published |
| Docs quality | Full public docs site + GitHub examples | Tutorial page only; response fields, credits, rate limits not stated | Public docs, fetch returns 403 to bots |

## Cost per 100 songs (approx.)

- **MusicAPI**: 2,000 credits → Growth $99 / 8,700 credits covers 435 songs ≈ $22.8 per 100.
- **Treblo**: 10,000 credits → Starter $11 covers 200 songs ≈ $5.5 per 100.
- **MyPaattu**: ₹799/mo at a 60-song/day cap; per-song credit allowance for the API is not documented.

## Gemini / Lyria (same key as chat)

- Lyria 3.5 is a **stable** music model in the Gemini API: `POST https://generativelanguage.googleapis.com/v1beta/interactions` with `{"model":"lyria-3.5","input":"..."}`; audio returns in `output_audio` as MP3/WAV.
- Other IDs: `lyria-3-clip-preview` (short clips), `lyria-3-pro-preview`, `lyria-realtime-exp`.
- Access is a **paid preview** per Google's announcement, so the project needs a billing-enabled Google AI project.
- The current `GEMINI_API_KEY` in `.env.local` is rejected by the API (`400 API_KEY_INVALID`) and does not match the standard AI Studio key shape (`AIza…`), so Gemini chat fallback and Lyria are both non-functional right now.
- Fit: one key could cover chat + music and avoid another vendor; short assets can use the clip model, which matches the 5–60 s UI better than full-song providers.

## Fit against this project

Requirements: prompt → audio bytes → private storage, per-generation quota ledger, background/instrumental tracks for marketing assets, commercial use for end users, predictable cost.

- **MusicAPI** is the best production fit: documented REST + webhooks, model choice, explicit commercial rights, and a per-song price we can map to credits. Highest cost per song.
- **MyPaattu** is the cheapest and India-focused (Tamil, Malayalam, Hindi, Telugu, Kannada, English) but its API docs omit response schema, credit allowance, and rate limits, and resale-to-users terms are not explicit. Suitable only if Indian-language vocal songs become a product goal.
- **Treblo** is already wired and cheapest per song, but its docs are not fetchable and the provider is less proven; it stays the fallback if cost dominates.

## Recommendation

Use **MusicAPI** as the primary provider, keep Treblo behind the same adapter interface as a cheaper fallback, and do not integrate MyPaattu unless Indian-language songs are a requirement. Before implementing, confirm with the provider: current model identifiers, 20-credit flat pricing, whether instrumental mode exists, and maximum duration (our UI allows 5–60 s, providers generate full songs).

## Live checks (2026-11-02)

- `POST https://api.musicapi.ai/api/v1/sonic/create` responds with a JSON validation error naming the allowed models when `mv` is missing.
- The same call with an invalid key returns `401 {"type":"unauthorized","error":"Your MusicAPI API key is incorrect"}`, so auth is enforced and the endpoint is live.
- No MusicAPI key is configured in `.env.local` (checked by presence only), and `src/server/ai/music.ts` has no MusicAPI adapter, so the app cannot generate through it yet.

## Uncertainty

- Pricing and model lists change; all figures above are from the pages checked on 2026-11-02.
- MyPaattu API credit allowance and output schema are **not stated** publicly.
- Treblo docs returned HTTP 403 on fetch; its contract was verified only through search snippets and the existing adapter.
