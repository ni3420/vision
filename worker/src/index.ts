/**
 * Cloudflare Worker that generates images with FLUX.2 [klein] 4B.
 *
 * Accepts JSON (the Next.js adapter) and multipart/form-data (manual testing or
 * image-to-image). FLUX.2 klein runs a fixed 4-step schedule, so it has no
 * `steps` field: sizing comes from `width`/`height` or `aspectRatio`.
 */
const MODEL = "@cf/black-forest-labs/flux-2-klein-4b";

const MAX_PROMPT_LENGTH = 2048;
const MAX_INPUT_IMAGE_BYTES = 10 * 1024 * 1024;
const MIN_SIDE = 64;
const MAX_SIDE = 1536;
const DEFAULT_SIDE = 1024;
const DEFAULT_GUIDANCE = 3.5;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const ASPECT_SIZES: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1024, height: 576 },
  "9:16": { width: 576, height: 1024 },
  "4:3": { width: 1024, height: 768 },
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

interface AiBinding {
  run(model: string, inputs: unknown): Promise<unknown>;
}

export interface Env {
  "Image-AI"?: AiBinding;
  AI?: AiBinding;
  IMAGE_API_TOKEN?: string;
  WORKER_API_KEY?: string;
}

interface GenerationInput {
  prompt: string;
  width: number;
  height: number;
  guidance: number;
  seed?: number;
  image?: { bytes: ArrayBuffer; type: string; name: string };
}

type Failure = { message: string; status: number };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function fail(status: number, error: string, message: string, requestId: string): Response {
  return json({ error, message, requestId }, status);
}

function expectedToken(env: Env): string | undefined {
  return (env.IMAGE_API_TOKEN ?? env.WORKER_API_KEY)?.trim() || undefined;
}

// Length-independent comparison so a wrong token cannot be timed character by character.
function safeEqual(a: string, b: string): boolean {
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

function authenticate(request: Request, env: Env): Failure | null {
  const expected = expectedToken(env);
  if (!expected) {
    return {
      status: 503,
      message: "Authentication is not configured. Set the IMAGE_API_TOKEN secret.",
    };
  }

  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return { status: 401, message: "Use Authorization: Bearer <token>." };
  }
  if (!safeEqual(token, expected)) {
    return { status: 401, message: "Invalid authentication token." };
  }
  return null;
}

function parseInteger(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : undefined;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
  }
  return undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isSide(value: number): boolean {
  return value >= MIN_SIDE && value <= MAX_SIDE;
}

function parsePrompt(value: unknown): string | Failure {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { status: 400, message: "prompt is required." };
  }
  const prompt = value.trim();
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { status: 400, message: `prompt must be ${MAX_PROMPT_LENGTH} characters or fewer.` };
  }
  return prompt;
}

function parseSeed(value: unknown): number | string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const seed = parseInteger(value);
  if (seed === undefined || seed < 0) {
    return "seed must be a non-negative integer.";
  }
  return seed;
}

function parseGuidance(value: unknown): number | string {
  if (value === undefined || value === null || value === "") return DEFAULT_GUIDANCE;
  const guidance = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(guidance)) return "guidance must be a number.";
  return clamp(guidance, 0, 20);
}

function resolveSize(
  widthValue: unknown,
  heightValue: unknown,
  ratioValue: unknown
): { width: number; height: number } | Failure {
  const width = parseInteger(widthValue);
  const height = parseInteger(heightValue);

  if (width !== undefined || height !== undefined) {
    const finalWidth = width ?? height ?? DEFAULT_SIDE;
    const finalHeight = height ?? width ?? DEFAULT_SIDE;
    if (!isSide(finalWidth) || !isSide(finalHeight)) {
      return {
        status: 400,
        message: `width and height must be between ${MIN_SIDE} and ${MAX_SIDE}.`,
      };
    }
    return { width: finalWidth, height: finalHeight };
  }

  if (ratioValue !== undefined && ratioValue !== null && ratioValue !== "") {
    const ratio = typeof ratioValue === "string" ? ratioValue : String(ratioValue);
    const sizes = ASPECT_SIZES[ratio];
    if (!sizes) {
      return { status: 400, message: "aspectRatio must be one of 1:1, 16:9, 9:16, 4:3." };
    }
    return sizes;
  }

  return { width: DEFAULT_SIDE, height: DEFAULT_SIDE };
}

function isFailure(value: unknown): value is Failure {
  return typeof value === "object" && value !== null && "status" in value && "message" in value;
}

async function readInputImage(value: unknown): Promise<GenerationInput["image"] | Failure> {
  if (!(value instanceof Blob)) return undefined;
  if (value.size <= 0) return { status: 400, message: "The uploaded image is empty." };
  if (value.size > MAX_INPUT_IMAGE_BYTES) {
    return { status: 400, message: "The uploaded image must be 10 MB or smaller." };
  }
  if (!ALLOWED_IMAGE_TYPES.has(value.type)) {
    return { status: 415, message: "Only JPEG, PNG, and WebP images are supported." };
  }
  return { bytes: await value.arrayBuffer(), type: value.type, name: "input-image" };
}

async function parseBody(
  request: Request,
  contentType: string
): Promise<GenerationInput | Failure> {
  const source = contentType.includes("multipart/form-data")
    ? await request.formData()
    : await request.json().catch(() => null);

  if (!source || typeof source !== "object") {
    return { status: 400, message: "Body must be JSON or multipart/form-data." };
  }

  const read = (key: string): unknown =>
    source instanceof FormData ? source.get(key) : (source as Record<string, unknown>)[key];

  const prompt = parsePrompt(read("prompt"));
  if (isFailure(prompt)) return prompt;

  const size = resolveSize(read("width"), read("height"), read("aspectRatio") ?? read("aspect_ratio"));
  if (isFailure(size)) return size;

  const guidance = parseGuidance(read("guidance"));
  if (typeof guidance === "string") return { status: 400, message: guidance };

  const seed = parseSeed(read("seed"));
  if (typeof seed === "string") return { status: 400, message: seed };

  const image = await readInputImage(read("image"));
  if (isFailure(image)) return image;

  return { prompt, ...size, guidance, seed, image };
}

function buildModelRequest(input: GenerationInput): Request {
  const form = new FormData();
  form.append("prompt", input.prompt);
  form.append("width", String(input.width));
  form.append("height", String(input.height));
  form.append("guidance", String(input.guidance));
  if (input.seed !== undefined) form.append("seed", String(input.seed));
  if (input.image) {
    const blob = new Blob([input.image.bytes], { type: input.image.type });
    form.append("input_image_0", blob, input.image.name);
  }
  return new Request("https://workers-ai.internal", { method: "POST", body: form });
}

function sniffType(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF") return "image/webp";
  return "image/png";
}

async function toBytes(result: unknown): Promise<Uint8Array | null> {
  if (result instanceof ReadableStream) {
    return new Uint8Array(await new Response(result).arrayBuffer());
  }
  if (result instanceof ArrayBuffer) return new Uint8Array(result);
  if (result instanceof Uint8Array) return result;
  if (result && typeof result === "object") {
    const image = (result as { image?: unknown }).image;
    if (typeof image === "string" && image.length > 0) {
      const base64 = image.replace(/^data:image\/[a-z+]+;base64,/i, "");
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes;
    }
  }
  return null;
}

async function generate(request: Request, env: Env, requestId: string): Promise<Response> {
  const denied = authenticate(request, env);
  if (denied) {
    return fail(denied.status, "Unauthorized", denied.message, requestId);
  }

  const ai = env["Image-AI"] ?? env.AI;
  if (!ai || typeof ai.run !== "function") {
    return fail(
      503,
      "Workers AI is not configured",
      "Add an AI binding named Image-AI to the Worker.",
      requestId
    );
  }

  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.includes("application/json") && !contentType.includes("multipart/form-data")) {
    return fail(415, "Unsupported content type", "Use application/json.", requestId);
  }

  let input: GenerationInput | Failure;
  try {
    input = await parseBody(request, contentType);
  } catch {
    return fail(400, "Invalid body", "The request body could not be parsed.", requestId);
  }
  if (isFailure(input)) {
    return fail(input.status, "Invalid request", input.message, requestId);
  }

  let result: unknown;
  try {
    const modelRequest = buildModelRequest(input);
    const modelContentType = modelRequest.headers.get("content-type");
    if (!modelRequest.body || !modelContentType) {
      throw new Error("Failed to serialize the model request.");
    }
    result = await ai.run(MODEL, {
      multipart: { body: modelRequest.body, contentType: modelContentType },
    });
  } catch (error) {
    console.error(JSON.stringify({ requestId, error: "Image generation failed", message: String(error) }));
    return fail(502, "Image generation failed", "The model call failed.", requestId);
  }

  const bytes = await toBytes(result);
  if (!bytes || bytes.length === 0) {
    return fail(502, "Empty AI response", "The model returned no image data.", requestId);
  }

  // TS 5.9 types Uint8Array<ArrayBufferLike>; the runtime accepts it as a body.
  return new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": sniffType(bytes),
      "Content-Length": String(bytes.length),
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
      "X-Image-Size": `${input.width}x${input.height}`,
    },
  });
}

const handler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        model: MODEL,
        configured: Boolean(expectedToken(env)),
        binding: env["Image-AI"] ? "Image-AI" : env.AI ? "AI" : null,
        requestId,
      });
    }

    if (url.pathname !== "/" && url.pathname !== "/generate") {
      return fail(404, "Not found", "Use POST /generate.", requestId);
    }

    if (request.method !== "POST") {
      return fail(405, "Method not allowed", "Use POST.", requestId);
    }

    return generate(request, env, requestId);
  },
};

export default handler;
