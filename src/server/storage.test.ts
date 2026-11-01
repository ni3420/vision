import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "bun:test";
import {
  getObjectUrl,
  imagekitPublicUrl,
  putObject,
  signImageKitUrl,
  storageDriver,
} from "./storage";

const PRIVATE_KEY = "private_test_key";
const ENDPOINT = "https://ik.imagekit.io/vision";
const KEY = "users/user_1/image/2026/11/asset.jpg";

describe("imagekitPublicUrl", () => {
  it("joins the endpoint and object key", () => {
    expect(imagekitPublicUrl(KEY, ENDPOINT)).toBe(
      "https://ik.imagekit.io/vision/users/user_1/image/2026/11/asset.jpg"
    );
  });

  it("tolerates a trailing slash on the endpoint and a leading slash on the key", () => {
    expect(imagekitPublicUrl(`/${KEY}`, `${ENDPOINT}/`)).toBe(
      "https://ik.imagekit.io/vision/users/user_1/image/2026/11/asset.jpg"
    );
  });
});

describe("signImageKitUrl", () => {
  const now = new Date("2026-11-01T10:00:00Z");
  const expiry = Math.floor(now.getTime() / 1000) + 3600;

  it("adds ik-t and an ik-s HMAC of pathname + expiry", () => {
    const signed = new URL(
      signImageKitUrl(imagekitPublicUrl(KEY, ENDPOINT), PRIVATE_KEY, 3600, now)
    );

    const expected = createHmac("sha1", PRIVATE_KEY)
      .update(`/vision/${KEY}${expiry}`)
      .digest("hex");

    expect(signed.searchParams.get("ik-t")).toBe(String(expiry));
    expect(signed.searchParams.get("ik-s")).toBe(expected);
    expect(signed.pathname).toBe(`/vision/${KEY}`);
  });

  it("produces a different signature for a different path", () => {
    const first = new URL(
      signImageKitUrl(imagekitPublicUrl(KEY, ENDPOINT), PRIVATE_KEY, 3600, now)
    ).searchParams.get("ik-s");
    const second = new URL(
      signImageKitUrl(
        imagekitPublicUrl(KEY.replace("asset", "other"), ENDPOINT),
        PRIVATE_KEY,
        3600,
        now
      )
    ).searchParams.get("ik-s");

    expect(first).not.toBe(second);
  });

  it("keeps existing query parameters intact", () => {
    const signed = new URL(
      signImageKitUrl(
        `${imagekitPublicUrl(KEY, ENDPOINT)}?tr=w-512`,
        PRIVATE_KEY,
        3600,
        now
      )
    );

    expect(signed.searchParams.get("tr")).toBe("w-512");
    expect(signed.searchParams.get("ik-s")).toHaveLength(40);
  });
});

describe("ImageKit upload", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.IMAGEKIT_PRIVATE_KEY;
    delete process.env.IMAGEKIT_URL_ENDPOINT;
    delete process.env.IMAGEKIT_PRIVATE_FILES;
    delete process.env.STORAGE_DRIVER;
  });

  function useEnv(extra: Record<string, string> = {}) {
    process.env.IMAGEKIT_PRIVATE_KEY = PRIVATE_KEY;
    process.env.IMAGEKIT_URL_ENDPOINT = `${ENDPOINT}/`;
    process.env.STORAGE_DRIVER = "imagekit";
    Object.assign(process.env, extra);
  }

  function stubUpload(payload: unknown, status = 200) {
    const calls: { url: string; init: RequestInit }[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify(payload), {
        status,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;
    return calls;
  }

  it("uploads to the ImageKit endpoint with folder and file name", async () => {
    useEnv();
    const calls = stubUpload({
      url: `${ENDPOINT}/${KEY}`,
      filePath: `/${KEY}`,
    });

    const stored = await putObject(KEY, Buffer.from("image-bytes"), "image/jpeg");

    expect(stored).toEqual({ key: KEY, url: `${ENDPOINT}/${KEY}` });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://upload.imagekit.io/api/v1/files/upload");

    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from(`${PRIVATE_KEY}:`).toString("base64")}`
    );

    const form = calls[0].init.body as FormData;
    expect(form.get("folder")).toBe("/users/user_1/image/2026/11");
    expect(form.get("fileName")).toBe("asset.jpg");
    expect(form.get("useUniqueFileName")).toBe("false");
    expect(form.get("isPrivateFile")).toBeNull();
  });

  it("marks uploads private and omits the durable URL when configured", async () => {
    useEnv({ IMAGEKIT_PRIVATE_FILES: "true" });
    stubUpload({ url: `${ENDPOINT}/${KEY}` });

    const stored = await putObject(KEY, Buffer.from("bytes"), "image/jpeg");

    expect(stored.url).toBeUndefined();
  });

  it("throws a storage error when ImageKit rejects the upload", async () => {
    useEnv();
    stubUpload({ message: "not allowed" }, 401);

    await expect(
      putObject(KEY, Buffer.from("bytes"), "image/jpeg")
    ).rejects.toMatchObject({ code: "STORAGE_WRITE_FAILED", driver: "imagekit" });
  });

  it("returns the stored durable URL for public files", async () => {
    useEnv();

    const url = await getObjectUrl(KEY, `${ENDPOINT}/${KEY}`);

    expect(url).toBe(`${ENDPOINT}/${KEY}`);
  });

  it("signs the URL for private files", async () => {
    useEnv({ IMAGEKIT_PRIVATE_FILES: "true" });

    const url = new URL(await getObjectUrl(KEY, `${ENDPOINT}/${KEY}`));

    expect(url.searchParams.get("ik-s")).toHaveLength(40);
    expect(url.searchParams.get("ik-t")).toBeTruthy();
  });

  it("detects the driver from ImageKit credentials", () => {
    process.env.IMAGEKIT_PRIVATE_KEY = PRIVATE_KEY;
    process.env.IMAGEKIT_URL_ENDPOINT = ENDPOINT;

    expect(storageDriver()).toBe("imagekit");
  });
});
