import sharp from "sharp";
import {
  ProviderCallError,
  ProviderNotConfiguredError,
  looksConfigured,
} from "./runtime";
import { fetchWithRetry, isRetryableStatus, type FetchLike } from "./retry";
import type { BackgroundRemovalRequest, BackgroundRemovalResult } from "./types";

const REMOVE_BG_URL = "https://api.remove.bg/v1.0/removebg";
const REMOVE_BG_MODEL = "removebg-v1";
const TIMEOUT_MS = 60_000;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// A fresh AbortSignal per attempt, so a timed-out attempt cannot poison the retry.
const fetchWithTimeout: FetchLike = (input, init) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });

function removeBgKey(): string {
  const key = process.env.REMOVE_BG_API_KEY?.trim();

  if (!key || !looksConfigured(key)) {
    throw new ProviderNotConfiguredError(
      "Background provider not configured: set REMOVE_BG_API_KEY"
    );
  }

  return key;
}

/** remove.bg reports failures as `{ errors: [{ title, detail }] }`. */
async function readErrorDetail(response: Response): Promise<string> {
  const text = (await response.text().catch(() => "")).slice(0, 600);

  try {
    const parsed = JSON.parse(text) as {
      errors?: { title?: string; detail?: string }[];
    };
    const first = parsed.errors?.[0];
    const message = [first?.title, first?.detail].filter(Boolean).join(": ");
    if (message) return message.slice(0, 300);
  } catch {
    // Not JSON: fall back to the raw body.
  }

  return text.slice(0, 300);
}

export async function callRemoveBg(
  request: BackgroundRemovalRequest
): Promise<BackgroundRemovalResult> {
  // Resolve the key before the request so a missing key surfaces as
  // PROVIDER_NOT_CONFIGURED (503), not a provider call failure.
  const key = removeBgKey();
  const size = request.quality === "full" ? "full" : "preview";

  const form = new FormData();
  form.append(
    "image_file",
    new Blob([new Uint8Array(request.bytes)], { type: request.mime }),
    request.filename
  );
  form.append("size", size);
  // Force a transparent PNG regardless of the input format.
  form.append("format", "png");
  form.append("type", "auto");

  let response: Response;
  try {
    response = await fetchWithRetry(
      REMOVE_BG_URL,
      {
        method: "POST",
        // fetch sets the multipart boundary; never set Content-Type by hand.
        headers: { "X-Api-Key": key },
        body: form,
      },
      { fetchImpl: fetchWithTimeout, attempts: 3 }
    );
  } catch (error) {
    throw new ProviderCallError(
      `remove.bg request failed: ${(error as Error).message}`,
      "removebg",
      true
    );
  }

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    const message =
      response.status === 401 || response.status === 403
        ? "remove.bg rejected the API key. Check REMOVE_BG_API_KEY."
        : response.status === 402
          ? size === "full"
            ? "remove.bg credits are exhausted for this account."
            : "The free remove.bg preview allowance for this month is used up. Switch to full resolution with credits, or try again next month."
          : response.status === 429
            ? "remove.bg is rate limiting this key. Try again in a moment."
            : response.status === 400 && detail
              ? `remove.bg rejected the image: ${detail}`
              : `remove.bg request failed (${response.status}): ${detail}`;

    throw new ProviderCallError(
      message,
      "removebg",
      isRetryableStatus(response.status)
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new ProviderCallError(
      `remove.bg returned an unexpected content type "${contentType}"`,
      "removebg",
      true
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new ProviderCallError(
      "remove.bg did not return a PNG cutout",
      "removebg",
      true
    );
  }

  const meta = await sharp(bytes)
    .metadata()
    .catch(() => null);

  return {
    bytes,
    mime: "image/png",
    width: meta?.width,
    height: meta?.height,
    provider: "removebg",
    model: REMOVE_BG_MODEL,
    mock: false,
  };
}
