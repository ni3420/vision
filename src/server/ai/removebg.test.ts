import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import sharp from "sharp";
import { removeBackground } from "./background";
import { ProviderCallError, ProviderNotConfiguredError } from "./runtime";

const KEY = "removebg_test_key_0123456789";
const TOUCHED_ENV = [
  "AI_MODE",
  "BACKGROUND_PROVIDER",
  "REMOVE_BG_API_KEY",
  "PHOTOROOM_API_KEY",
] as const;

const originalFetch = globalThis.fetch;
const originalEnv = Object.fromEntries(
  TOUCHED_ENV.map((key) => [key, process.env[key]])
);

const SOURCE_PNG = await sharp({
  create: { width: 64, height: 64, channels: 3, background: "#3366ff" },
})
  .png()
  .toBuffer();

const CUTOUT_PNG = await sharp({
  create: {
    width: 64,
    height: 64,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .png()
  .toBuffer();

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

function okCutout() {
  return new Response(CUTOUT_PNG as unknown as BodyInit, {
    status: 200,
    headers: { "content-type": "image/png" },
  });
}

function request(quality?: "preview" | "full") {
  return {
    bytes: SOURCE_PNG,
    mime: "image/png",
    filename: "source.png",
    quality,
  };
}

beforeEach(() => {
  calls = [];
  process.env.AI_MODE = "live";
  process.env.BACKGROUND_PROVIDER = "removebg";
  process.env.REMOVE_BG_API_KEY = KEY;
  delete process.env.PHOTOROOM_API_KEY;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of TOUCHED_ENV) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("removeBackground with remove.bg", () => {
  test("posts the image as multipart with the X-Api-Key header", async () => {
    stubFetch(okCutout);

    const result = await removeBackground(request());

    expect(result).toMatchObject({
      provider: "removebg",
      model: "removebg-v1",
      mock: false,
      mime: "image/png",
      width: 64,
      height: 64,
    });
    expect(result.bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

    expect(calls).toHaveLength(1);
    const [{ url, init }] = calls;
    expect(url).toBe("https://api.remove.bg/v1.0/removebg");
    expect((init.headers as Record<string, string>)["X-Api-Key"]).toBe(KEY);

    const form = init.body as FormData;
    expect(form.get("image_file")).toBeInstanceOf(Blob);
    expect(form.get("format")).toBe("png");
    expect(form.get("size")).toBe("preview");
  });

  test("requests full resolution when asked", async () => {
    stubFetch(okCutout);

    await removeBackground(request("full"));

    const form = calls[0].init.body as FormData;
    expect(form.get("size")).toBe("full");
  });

  test("explains that the free preview allowance is spent", async () => {
    stubFetch(
      () =>
        new Response(
          JSON.stringify({ errors: [{ title: "Payment required" }] }),
          { status: 402, headers: { "content-type": "application/json" } }
        )
    );

    const error = await removeBackground(request("preview")).catch((e) => e);

    expect(error).toBeInstanceOf(ProviderCallError);
    expect(error.retryable).toBe(false);
    expect(error.message).toContain("free remove.bg preview allowance");
    expect(calls).toHaveLength(1);
  });

  test("explains exhausted credits for full resolution", async () => {
    stubFetch(() => new Response("{}", { status: 402 }));

    const error = await removeBackground(request("full")).catch((e) => e);

    expect(error).toBeInstanceOf(ProviderCallError);
    expect(error.retryable).toBe(false);
    expect(error.message).toContain("credits are exhausted");
  });

  test("surfaces remove.bg's JSON error detail on a rejected image", async () => {
    stubFetch(
      () =>
        new Response(
          JSON.stringify({
            errors: [
              { title: "Invalid image", detail: "The image is corrupted." },
            ],
          }),
          { status: 400, headers: { "content-type": "application/json" } }
        )
    );

    const error = await removeBackground(request()).catch((e) => e);

    expect(error).toBeInstanceOf(ProviderCallError);
    expect(error.retryable).toBe(false);
    expect(error.message).toContain("Invalid image: The image is corrupted.");
  });

  test("rejects a non-PNG response", async () => {
    stubFetch(
      () =>
        new Response(Buffer.from("not-a-png"), {
          status: 200,
          headers: { "content-type": "image/png" },
        })
    );

    await expect(removeBackground(request())).rejects.toBeInstanceOf(
      ProviderCallError
    );
  });

  test("fails loudly when live mode has no key", async () => {
    delete process.env.REMOVE_BG_API_KEY;

    await expect(removeBackground(request())).rejects.toBeInstanceOf(
      ProviderNotConfiguredError
    );
    expect(calls).toHaveLength(0);
  });

  test("wins over Photoroom when no provider is pinned", async () => {
    delete process.env.BACKGROUND_PROVIDER;
    process.env.PHOTOROOM_API_KEY = "photoroom_test_key_0123456789";
    stubFetch(okCutout);

    const result = await removeBackground(request());

    expect(result.provider).toBe("removebg");
    expect(calls[0].url).toBe("https://api.remove.bg/v1.0/removebg");
  });
});
