import {
  ProviderCallError,
  ProviderNotConfiguredError,
  looksConfigured,
  resolveMode,
  warnMock,
} from "./runtime";
import type { MusicGenerationRequest, MusicGenerationResult } from "./types";

const TREBLO_BASE_URL = "https://api.treblo.com/v1/generations";
const TREBLO_MODEL = "treblo-v3";
const POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 5000;
const MOCK_MAX_SECONDS = 20;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function trebloRequest(path: string, init: RequestInit) {
  const key = process.env.TREBLO_API_KEY as string;
  const response = await fetch(`${TREBLO_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new ProviderCallError(
      `Treblo request ${path} failed (${response.status}): ${detail}`,
      "treblo"
    );
  }

  return response;
}

async function generateWithTreblo(
  request: MusicGenerationRequest
): Promise<MusicGenerationResult> {
  const startResponse = await trebloRequest("/v3", {
    method: "POST",
    body: JSON.stringify({ prompt: request.prompt }),
  });

  const started = (await startResponse.json()) as Record<string, unknown>;
  const taskId = started.task_id ?? started.id;

  if (typeof taskId !== "string" || !taskId) {
    throw new ProviderCallError(
      "Treblo did not return a generation task id",
      "treblo"
    );
  }

  let completed = false;

  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    await sleep(POLL_INTERVAL_MS);

    const statusResponse = await trebloRequest(`/status/${taskId}`, {
      method: "GET",
    });
    const raw = await statusResponse.text();
    let status = raw.trim().toUpperCase().replace(/^"|"$/g, "");

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        status = String(
          (parsed as Record<string, unknown>).status ?? status
        )
          .trim()
          .toUpperCase();
      }
    } catch {
      // Plain-text status responses are expected by the Treblo API.
    }

    if (status === "SUCCESS" || status === "COMPLETED") {
      completed = true;
      break;
    }
    if (status === "FAILED" || status === "FAILURE" || status === "ERROR") {
      throw new ProviderCallError("Treblo reported a failed generation", "treblo");
    }
  }

  if (!completed) {
    throw new ProviderCallError("Treblo generation timed out", "treblo");
  }

  const resultResponse = await trebloRequest(`/${taskId}`, { method: "GET" });
  const result = (await resultResponse.json()) as Record<string, unknown>;
  const songPaths = Array.isArray(result.song_paths) ? result.song_paths : [];
  const audioUrl =
    (typeof songPaths[0] === "string" ? songPaths[0] : undefined) ??
    (typeof result.audio_url === "string" ? result.audio_url : undefined);

  if (!audioUrl) {
    throw new ProviderCallError(
      "Treblo did not return an audio file path",
      "treblo"
    );
  }

  const audioResponse = await fetch(audioUrl, {
    signal: AbortSignal.timeout(60_000),
  });

  if (!audioResponse.ok) {
    throw new ProviderCallError(
      `Failed to download generated audio (${audioResponse.status})`,
      "treblo"
    );
  }

  const mime = audioResponse.headers.get("content-type") ?? "audio/mpeg";

  return {
    bytes: Buffer.from(await audioResponse.arrayBuffer()),
    mime: mime.startsWith("audio/") ? mime.split(";")[0] : "audio/mpeg",
    durationSec: request.durationSec,
    provider: "treblo",
    model: TREBLO_MODEL,
    mock: false,
  };
}

function writeWavHeader(
  dataLength: number,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
) {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

function synthesizeMockTrack(prompt: string, durationSec: number): Buffer {
  const sampleRate = 22_050;
  const seconds = Math.max(2, Math.min(durationSec, MOCK_MAX_SECONDS));
  const totalSamples = Math.floor(sampleRate * seconds);
  const seed = [...prompt].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const root = 110 * Math.pow(2, (seed % 12) / 12);
  const ratios = [1, 1.25, 1.5, 2];

  const samples = Buffer.alloc(totalSamples * 2);
  const fadeSamples = Math.floor(sampleRate * 0.4);

  for (let index = 0; index < totalSamples; index += 1) {
    const time = index / sampleRate;
    const beat = Math.floor(time * 2) % ratios.length;
    const freq = root * ratios[beat];
    const envelope =
      Math.min(1, index / fadeSamples) *
      Math.min(1, (totalSamples - index) / fadeSamples) *
      0.32;

    const wave =
      Math.sin(2 * Math.PI * freq * time) * 0.6 +
      Math.sin(2 * Math.PI * freq * 2 * time) * 0.2 +
      Math.sin(2 * Math.PI * freq * 0.5 * time) * 0.2;

    samples.writeInt16LE(
      Math.round(wave * envelope * 32767),
      index * 2
    );
  }

  return Buffer.concat([
    writeWavHeader(samples.length, sampleRate, 1, 16),
    samples,
  ]);
}

export async function generateMusic(
  request: MusicGenerationRequest
): Promise<MusicGenerationResult> {
  const mode = resolveMode([process.env.TREBLO_API_KEY]);

  if (mode === "mock") {
    warnMock("music");
    const seconds = Math.max(2, Math.min(request.durationSec, MOCK_MAX_SECONDS));
    return {
      bytes: synthesizeMockTrack(request.prompt, seconds),
      mime: "audio/wav",
      durationSec: seconds,
      provider: "local",
      model: "mock-tone",
      mock: true,
    };
  }

  if (!looksConfigured(process.env.TREBLO_API_KEY)) {
    throw new ProviderNotConfiguredError(
      "Music provider not configured: set TREBLO_API_KEY"
    );
  }

  return generateWithTreblo(request);
}
