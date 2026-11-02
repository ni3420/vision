import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import sharp from "sharp";
import { removeBackground } from "./background";
import { ProviderCallError, ProviderNotConfiguredError } from "./runtime";

const KEY = "photoroom_test_key_0123456789";
const TOUCHED_ENV = ["AI_MODE", "PHOTOROOM_API_KEY"] as const;

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

beforeEach(() => {
  calls = [];
  process.env.AI_MODE = "live";
  process.env.PHOTOROOM_API_KEY = KEY;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of TOUCHED_ENV) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("removeBackground with Photoroom", () => {
  test("posts the image as multipart with the x-api-key header", async () => {
    stubFetch(
      () =>
        new Response(CUTOUT_PNG as unknown as BodyInit, {
          status: 200,
          headers: { "content-type": "image/png" },
        })
    );

    const result = await removeBackground({
      bytes: SOURCE_PNG,
      mime: "image/png",
      filename: "source.png",
    });

    expect(result).toMatchObject({
      provider: "photoroom",
      model: "segment-v1",
      mock: false,
      mime: "image/png",
      width: 64,
      height: 64,
    });
    expect(result.bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

    expect(calls).toHaveLength(1);
    const [{ url, init }] = calls;
    expect(url).toBe("https://sdk.photoroom.com/v1/segment");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe(KEY);

    const form = init.body as FormData;
    expect(form.get("image_file")).toBeInstanceOf(Blob);
  });

  test("does not retry an authentication failure", async () => {
    stubFetch(
      () => new Response("invalid key", { status: 401 })
    );

    await expect(
      removeBackground({
        bytes: SOURCE_PNG,
        mime: "image/png",
        filename: "source.png",
      })
    ).rejects.toMatchObject({
      code: "PROVIDER_CALL_FAILED",
      retryable: false,
    });

    expect(calls).toHaveLength(1);
  });

  test("rejects a non-PNG response", async () => {
    stubFetch(
      () =>
        new Response(Buffer.from("not-a-png"), {
          status: 200,
          headers: { "content-type": "image/jpeg" },
        })
    );

    await expect(
      removeBackground({
        bytes: SOURCE_PNG,
        mime: "image/png",
        filename: "source.png",
      })
    ).rejects.toBeInstanceOf(ProviderCallError);
  });

  test("fails loudly when live mode has no key", async () => {
    delete process.env.PHOTOROOM_API_KEY;

    await expect(
      removeBackground({
        bytes: SOURCE_PNG,
        mime: "image/png",
        filename: "source.png",
      })
    ).rejects.toBeInstanceOf(ProviderNotConfiguredError);
    expect(calls).toHaveLength(0);
  });
});

describe("removeBackground mock mode", () => {
  test("returns a labelled PNG with an alpha channel", async () => {
    process.env.AI_MODE = "mock";

    const result = await removeBackground({
      bytes: SOURCE_PNG,
      mime: "image/png",
      filename: "source.png",
    });

    expect(result.mock).toBe(true);
    expect(result.provider).toBe("local");
    expect(result.mime).toBe("image/png");
    // PNG IHDR byte 25 is the colour type; 6 means RGBA.
    expect(result.bytes[25]).toBe(6);
    expect(calls).toHaveLength(0);

    const meta = await sharp(result.bytes).metadata();
    expect(meta.hasAlpha).toBe(true);
  });
});
