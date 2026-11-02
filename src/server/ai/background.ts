import sharp from "sharp";
import {
  ProviderCallError,
  ProviderNotConfiguredError,
  looksConfigured,
  resolveMode,
  warnMock,
} from "./runtime";
import { fetchWithRetry, isRetryableStatus, type FetchLike } from "./retry";
import type { BackgroundRemovalRequest, BackgroundRemovalResult } from "./types";

const PHOTOROOM_SEGMENT_URL = "https://sdk.photoroom.com/v1/segment";
const PHOTOROOM_MODEL = "segment-v1";
const TIMEOUT_MS = 60_000;
const MOCK_MAX_DIMENSION = 1536;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// A fresh AbortSignal per attempt, so a timed-out attempt cannot poison the retry.
const fetchWithTimeout: FetchLike = (input, init) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });

function photoroomKey(): string {
  const key = process.env.PHOTOROOM_API_KEY?.trim();

  if (!key || !looksConfigured(key)) {
    throw new ProviderNotConfiguredError(
      "Background provider not configured: set PHOTOROOM_API_KEY"
    );
  }

  return key;
}

/** Photoroom returns a binary PNG cutout with a transparent background. */
async function callPhotoroom(
  request: BackgroundRemovalRequest
): Promise<BackgroundRemovalResult> {
  // Resolve the key before the request so a missing key surfaces as
  // PROVIDER_NOT_CONFIGURED (503), not a provider call failure.
  const key = photoroomKey();

  const form = new FormData();
  form.append(
    "image_file",
    new Blob([new Uint8Array(request.bytes)], { type: request.mime }),
    request.filename
  );

  let response: Response;
  try {
    response = await fetchWithRetry(
      PHOTOROOM_SEGMENT_URL,
      {
        method: "POST",
        // fetch sets the multipart boundary; never set Content-Type by hand.
        headers: { "x-api-key": key },
        body: form,
      },
      { fetchImpl: fetchWithTimeout, attempts: 3 }
    );
  } catch (error) {
    throw new ProviderCallError(
      `Photoroom request failed: ${(error as Error).message}`,
      "photoroom",
      true
    );
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    const message =
      response.status === 401 || response.status === 403
        ? "Photoroom rejected the API key. Check PHOTOROOM_API_KEY."
        : response.status === 402
          ? "Photoroom credits are exhausted for this account."
          : response.status === 413
            ? "Photoroom rejected the image because it is too large."
            : `Photoroom request failed (${response.status}): ${detail}`;

    throw new ProviderCallError(
      message,
      "photoroom",
      isRetryableStatus(response.status)
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new ProviderCallError(
      `Photoroom returned an unexpected content type "${contentType}"`,
      "photoroom",
      true
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new ProviderCallError(
      "Photoroom did not return a PNG cutout",
      "photoroom",
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
    provider: "photoroom",
    model: PHOTOROOM_MODEL,
    mock: false,
  };
}

/**
 * Development placeholder: keeps the subject's central area and drops the rest
 * to transparent pixels. Clearly labelled in the image and flagged `mock: true`.
 */
async function renderMockCutout(
  request: BackgroundRemovalRequest
): Promise<BackgroundRemovalResult> {
  const meta = await sharp(request.bytes)
    .metadata()
    .catch(() => null);

  const sourceWidth = meta?.width ?? 512;
  const sourceHeight = meta?.height ?? 512;
  const scale = Math.min(
    1,
    MOCK_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight)
  );
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const insetX = Math.round(width * 0.12);
  const insetY = Math.round(height * 0.12);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect x="${insetX}" y="${insetY}" width="${width - insetX * 2}" height="${height - insetY * 2}" rx="${Math.round(Math.min(width, height) * 0.08)}" fill="#fff"/>
    </svg>`
  );
  const label = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect x="0" y="${height - 52}" width="${width}" height="52" fill="rgba(15,23,42,0.72)"/>
      <text x="50%" y="${height - 22}" fill="#fff" font-family="sans-serif" font-size="16" font-weight="600" text-anchor="middle">LOCAL MOCK CUTOUT</text>
    </svg>`
  );

  try {
    const bytes = await sharp(request.bytes)
      .rotate()
      .resize(width, height, { fit: "inside" })
      .composite([{ input: label }])
      .ensureAlpha()
      .composite([{ input: mask, blend: "dest-in" }])
      .png()
      .toBuffer();

    return {
      bytes,
      mime: "image/png",
      width,
      height,
      provider: "local",
      model: "mock-cutout",
      mock: true,
    };
  } catch {
    const bytes = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: label }])
      .png()
      .toBuffer();

    return {
      bytes,
      mime: "image/png",
      width: 512,
      height: 512,
      provider: "local",
      model: "mock-cutout",
      mock: true,
    };
  }
}

export async function removeBackground(
  request: BackgroundRemovalRequest
): Promise<BackgroundRemovalResult> {
  const mode = resolveMode([process.env.PHOTOROOM_API_KEY]);

  if (mode === "mock") {
    warnMock("background");
    return renderMockCutout(request);
  }

  return callPhotoroom(request);
}
