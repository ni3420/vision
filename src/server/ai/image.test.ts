import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import sharp from "sharp";
import { generateImage } from "./image";
import { ProviderCallError } from "./runtime";

const KEY = "cf_test_key_0123456789abcdef";
const TOUCHED_ENV = [
  "AI_MODE",
  "CLOUDFARE_URL",
  "CLOUDFARE_API_KEY",
  "CLOUDFARE_ACCOUNT_ID",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
] as const;

const originalFetch = globalThis.fetch;
const originalEnv = Object.fromEntries(TOUCHED_ENV.map((key) => [key, process.env[key]]));

const SOURCE_PNG = await sharp({
  create: { width: 8, height: 8, channels: 3, background: "#3366ff" },
})
  .png()
  .toBuffer();

const pngResponse = () =>
  new Response(SOURCE_PNG as unknown as BodyInit, {
    status: 200,
    headers: { "content-type": "image/png" },
  });

interface RecordedCall {
  url: string;
  init: RequestInit;
}

let calls: RecordedCall[] = [];

function stubFetch(respond: () => Response) {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return respond();
  }) as typeof fetch;
}

beforeEach(() => {
  calls = [];
  process.env.AI_MODE = "live";
  process.env.CLOUDFARE_URL = "https://worker.example/generate";
  process.env.CLOUDFARE_API_KEY = KEY;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of TOUCHED_ENV) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("generateImage against a Cloudflare Worker", () => {
  test("posts multipart prompt and size with a bearer token", async () => {
    stubFetch(pngResponse);

    const result = await generateImage({ prompt: "a red fox", width: 512, height: 300 });

    expect(result).toMatchObject({
      provider: "cloudflare",
      model: "flux-2-klein-4b",
      mock: false,
      mime: "image/jpeg",
      width: 512,
      height: 300,
    });
    expect(result.bytes.subarray(0, 3).toString("hex")).toBe("ffd8ff");

    expect(calls).toHaveLength(1);
    const [{ url, init }] = calls;
    const headers = init.headers as Record<string, string>;

    expect(url).toBe("https://worker.example/generate");
    expect(init.method).toBe("POST");
    expect(headers.Authorization).toBe(`Bearer ${KEY}`);
    expect(headers["Content-Type"]).toBeUndefined();

    const body = init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("prompt")).toBe("a red fox");
    expect(body.get("width")).toBe("512");
    expect(body.get("height")).toBe("300");
  });

  test("marks a permanent provider error as not retryable", async () => {
    stubFetch(() => new Response("bad prompt", { status: 400 }));

    const error = await generateImage({ prompt: "a red fox", width: 512, height: 512 }).catch(
      (thrown: unknown) => thrown
    );

    expect(error).toBeInstanceOf(ProviderCallError);
    expect((error as ProviderCallError).retryable).toBe(false);
    expect(calls).toHaveLength(1);
  });

  test("retries a transient provider error and reports it as retryable", async () => {
    stubFetch(() => new Response("busy", { status: 503 }));

    const error = await generateImage({ prompt: "a red fox", width: 512, height: 512 }).catch(
      (thrown: unknown) => thrown
    );

    expect(error).toBeInstanceOf(ProviderCallError);
    expect((error as ProviderCallError).retryable).toBe(true);
    expect(calls).toHaveLength(3);
  });

  test("falls back to the account endpoint when no worker URL is set", async () => {
    delete process.env.CLOUDFARE_URL;
    delete process.env.CLOUDFARE_API_KEY;
    process.env.CLOUDFLARE_ACCOUNT_ID = "account123";
    process.env.CLOUDFLARE_API_TOKEN = KEY;
    stubFetch(pngResponse);

    await generateImage({ prompt: "a red fox", width: 512, height: 512 });

    expect(calls[0].url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/account123/ai/run/@cf/black-forest-labs/flux-2-klein-4b"
    );
  });
});
