import sharp from "sharp";
import {
  ProviderCallError,
  ProviderNotConfiguredError,
  looksConfigured,
  resolveMode,
  warnMock,
} from "./runtime";
import { fetchWithRetry, isRetryableStatus, type FetchLike } from "./retry";
import type { ImageGenerationRequest, ImageGenerationResult } from "./types";

const CF_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const CF_FALLBACK_MODEL = "flux-2-klein-4b";
const TIMEOUT_MS = 60_000;

// A fresh AbortSignal per attempt, so a timed-out attempt cannot poison the retry.
const fetchWithTimeout: FetchLike = (input, init) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });

function isAllowedEndpoint(value: string): boolean {
  if (value.startsWith("https://")) return true;
  if (process.env.NODE_ENV === "production") return false;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(value);
}

function cloudflareEndpoint(): string {
  const explicit = process.env.CLOUDFARE_URL?.trim();
  if (explicit && isAllowedEndpoint(explicit)) return explicit;

  const account =
    process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ??
    process.env.CLOUDFARE_ACCOUNT_ID?.trim();

  if (!account) {
    throw new ProviderNotConfiguredError(
      "Image provider not configured: set CLOUDFARE_URL or CLOUDFLARE_ACCOUNT_ID"
    );
  }

  return `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${CF_MODEL}`;
}

function cloudflareToken(): string {
  const token =
    process.env.CLOUDFARE_API_KEY?.trim() ??
    process.env.CLOUDFLARE_API_TOKEN?.trim();

  if (!token || !looksConfigured(token)) {
    throw new ProviderNotConfiguredError(
      "Image provider not configured: set CLOUDFARE_API_KEY"
    );
  }

  return token;
}

function pickBase64(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const result =
    root.result && typeof root.result === "object"
      ? (root.result as Record<string, unknown>)
      : undefined;

  const candidates: unknown[] = [
    result?.image,
    root.image,
    Array.isArray(result?.images) ? result.images[0] : undefined,
    Array.isArray(root.images) ? root.images[0] : undefined,
    Array.isArray(root.data)
      ? (root.data[0] as Record<string, unknown> | undefined)?.b64_json
      : undefined,
    Array.isArray(root.artifacts)
      ? (root.artifacts[0] as Record<string, unknown> | undefined)?.base64
      : undefined,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 64) {
      return candidate.replace(/^data:image\/[a-z+]+;base64,/i, "");
    }
  }

  return null;
}

async function callCloudflare(
  prompt: string,
  width: number,
  height: number
): Promise<Buffer> {
  const endpoint = cloudflareEndpoint();
  const token = cloudflareToken();

  const form = new FormData();
  form.append("prompt", prompt);
  form.append("width", String(width));
  form.append("height", String(height));

  let response: Response;
  try {
    response = await fetchWithRetry(endpoint, {
      method: "POST",
      headers: {
        // fetch sets the multipart boundary; never set Content-Type by hand.
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }, { fetchImpl: fetchWithTimeout });
  } catch (error) {
    throw new ProviderCallError(
      `Cloudflare image request failed: ${(error as Error).message}`,
      "cloudflare",
      true
    );
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new ProviderCallError(
      `Cloudflare image request failed (${response.status}): ${detail}`,
      "cloudflare",
      isRetryableStatus(response.status)
    );
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = await response.json();
    const base64 = pickBase64(payload);
    if (!base64) {
      throw new ProviderCallError(
        "Cloudflare image response did not contain image data",
        "cloudflare",
        true
      );
    }
    return Buffer.from(base64, "base64");
  }

  if (contentType.startsWith("image/") || contentType === "application/octet-stream") {
    return Buffer.from(await response.arrayBuffer());
  }

  const raw = Buffer.from(await response.arrayBuffer());
  if (raw.subarray(0, 4).toString("hex") === "ffd8ffe0" || raw.subarray(0, 3).toString("hex") === "ffd8ff") {
    return raw;
  }

  throw new ProviderCallError(
    `Cloudflare image response had unexpected content type "${contentType}"`,
    "cloudflare",
    true
  );
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapPrompt(prompt: string, width = 34, maxLines = 4) {
  const words = prompt.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > width) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`;
    }
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current.trim());
  return lines;
}

async function renderMockImage(
  prompt: string,
  width: number,
  height: number
): Promise<Buffer> {
  const hue = [...prompt].reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
  const lines = wrapPrompt(prompt);
  const fontSize = Math.max(18, Math.round(Math.min(width, height) / 18));
  const textBlock = lines
    .map(
      (line, index) =>
        `<text x="50%" y="${72 + index * (fontSize + 10)}" fill="rgba(255,255,255,0.92)" font-family="sans-serif" font-size="${fontSize}" text-anchor="middle">${escapeXml(line)}</text>`
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue}, 65%, 16%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 70) % 360}, 60%, 34%)"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="${width * 0.78}" cy="${height * 0.26}" r="${Math.min(width, height) * 0.24}" fill="rgba(255,255,255,0.08)"/>
  <circle cx="${width * 0.2}" cy="${height * 0.8}" r="${Math.min(width, height) * 0.3}" fill="rgba(255,255,255,0.05)"/>
  <text x="50%" y="${Math.max(28, height * 0.18)}" fill="rgba(255,255,255,0.6)" font-family="sans-serif" font-size="${Math.max(12, Math.round(fontSize * 0.5))}" letter-spacing="4" text-anchor="middle">LOCAL MOCK PREVIEW</text>
  ${textBlock}
  <text x="50%" y="${height - 18}" fill="rgba(255,255,255,0.45)" font-family="sans-serif" font-size="${Math.max(11, Math.round(fontSize * 0.42))}" text-anchor="middle">${width}x${height} - no image provider key configured</text>
</svg>`;

  try {
    return await sharp(Buffer.from(svg))
      .resize(width, height, { fit: "cover" })
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 22, g: 24, b: 42 },
      },
    })
      .jpeg({ quality: 88 })
      .toBuffer();
  }
}

export async function generateImage(
  request: ImageGenerationRequest
): Promise<ImageGenerationResult> {
  const mode = resolveMode([
    process.env.CLOUDFARE_API_KEY ?? process.env.CLOUDFLARE_API_TOKEN,
  ]);

  if (mode === "mock") {
    warnMock("image");
    const bytes = await renderMockImage(
      request.prompt,
      request.width,
      request.height
    );
    return {
      bytes,
      mime: "image/jpeg",
      width: request.width,
      height: request.height,
      provider: "local",
      model: "mock-preview",
      mock: true,
    };
  }

  const raw = await callCloudflare(request.prompt, request.width, request.height);

  const normalized = await sharp(raw)
    .resize(request.width, request.height, { fit: "cover", position: "centre" })
    .jpeg({ quality: 88 })
    .toBuffer();

  return {
    bytes: normalized,
    mime: "image/jpeg",
    width: request.width,
    height: request.height,
    provider: "cloudflare",
    model: CF_FALLBACK_MODEL,
    mock: false,
  };
}
