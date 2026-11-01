import { describe, expect, test } from "bun:test";
import worker, { type Env } from "./index";

const TOKEN = "test-token";
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    IMAGE_API_TOKEN: TOKEN,
    "Image-AI": { run: async () => ({ image: Buffer.from(PNG_BYTES).toString("base64") }) },
    ...overrides,
  };
}

function postJson(body: unknown, token: string | null = TOKEN): Request {
  return new Request("https://worker.test/generate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function postForm(fields: Record<string, string>, token = TOKEN): Request {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return new Request("https://worker.test/generate", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

interface MultipartInput {
  body: ReadableStream;
  contentType: string;
}

async function captureMultipart(inputs: unknown): Promise<FormData> {
  const { body, contentType } = (inputs as { multipart: MultipartInput }).multipart;
  return new Request("https://workers-ai.internal", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  }).formData();
}

describe("image worker", () => {
  test("health reports model, secret and binding", async () => {
    const response = await worker.fetch(new Request("https://worker.test/health"), makeEnv());
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.model).toBe("@cf/black-forest-labs/flux-2-klein-4b");
    expect(payload.configured).toBe(true);
    expect(payload.binding).toBe("Image-AI");
  });

  test("answers CORS preflight", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/generate", { method: "OPTIONS" }),
      makeEnv()
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  test("rejects a missing or wrong bearer token", async () => {
    const missing = await worker.fetch(postJson({ prompt: "a cat" }, null), makeEnv());
    const wrong = await worker.fetch(postJson({ prompt: "a cat" }, "nope"), makeEnv());

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
  });

  test("fails closed when no secret is configured", async () => {
    const response = await worker.fetch(
      postJson({ prompt: "a cat" }),
      makeEnv({ IMAGE_API_TOKEN: undefined })
    );

    expect(response.status).toBe(503);
  });

  test("accepts WORKER_API_KEY as an alias for the secret", async () => {
    const response = await worker.fetch(
      postJson({ prompt: "a cat" }),
      makeEnv({ IMAGE_API_TOKEN: undefined, WORKER_API_KEY: TOKEN })
    );

    expect(response.status).toBe(200);
  });

  test("accepts the plain AI binding name too", async () => {
    const response = await worker.fetch(
      postJson({ prompt: "a cat" }),
      makeEnv({
        "Image-AI": undefined,
        AI: { run: async () => ({ image: Buffer.from(PNG_BYTES).toString("base64") }) },
      })
    );

    expect(response.status).toBe(200);
  });

  test("forwards prompt, size and guidance to the model", async () => {
    let form: FormData | undefined;
    const env = makeEnv({
      "Image-AI": {
        run: async (_model, inputs) => {
          form = await captureMultipart(inputs);
          return { image: Buffer.from(PNG_BYTES).toString("base64") };
        },
      },
    });

    const response = await worker.fetch(
      postJson({ prompt: "  neon skyline  ", width: 512, height: 300 }),
      env
    );

    expect(response.status).toBe(200);
    expect(form?.get("prompt")).toBe("neon skyline");
    expect(form?.get("width")).toBe("512");
    expect(form?.get("height")).toBe("300");
    expect(form?.get("guidance")).toBe("3.5");
    expect(form?.get("steps")).toBeNull();
  });

  test("returns raw PNG bytes with the sniffed content type", async () => {
    const response = await worker.fetch(postJson({ prompt: "a cat" }), makeEnv());
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-image-size")).toBe("1024x1024");
    expect(Array.from(bytes)).toEqual(Array.from(PNG_BYTES));
  });

  test("maps aspectRatio to model dimensions", async () => {
    let form: FormData | undefined;
    const env = makeEnv({
      "Image-AI": {
        run: async (_model, inputs) => {
          form = await captureMultipart(inputs);
          return { image: Buffer.from(PNG_BYTES).toString("base64") };
        },
      },
    });

    await worker.fetch(postJson({ prompt: "a cat", aspectRatio: "16:9" }), env);

    expect(form?.get("width")).toBe("1024");
    expect(form?.get("height")).toBe("576");
  });

  test("passes a seed through to the model", async () => {
    let form: FormData | undefined;
    const env = makeEnv({
      "Image-AI": {
        run: async (_model, inputs) => {
          form = await captureMultipart(inputs);
          return { image: Buffer.from(PNG_BYTES).toString("base64") };
        },
      },
    });

    await worker.fetch(postJson({ prompt: "a cat", seed: 42 }), env);

    expect(form?.get("seed")).toBe("42");
  });

  test("accepts multipart/form-data as well as JSON", async () => {
    let form: FormData | undefined;
    const env = makeEnv({
      "Image-AI": {
        run: async (_model, inputs) => {
          form = await captureMultipart(inputs);
          return { image: Buffer.from(PNG_BYTES).toString("base64") };
        },
      },
    });

    const response = await worker.fetch(
      postForm({ prompt: "a dog", aspect_ratio: "9:16" }),
      env
    );

    expect(response.status).toBe(200);
    expect(form?.get("prompt")).toBe("a dog");
    expect(form?.get("height")).toBe("1024");
  });

  test("rejects a missing prompt and out-of-range sizes", async () => {
    const empty = await worker.fetch(postJson({ prompt: "  " }), makeEnv());
    const tooBig = await worker.fetch(postJson({ prompt: "a cat", width: 4096 }), makeEnv());
    const badSeed = await worker.fetch(postJson({ prompt: "a cat", seed: -1 }), makeEnv());

    expect(empty.status).toBe(400);
    expect(tooBig.status).toBe(400);
    expect(badSeed.status).toBe(400);
  });

  test("rejects an unsupported content type", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/generate", {
        method: "POST",
        headers: { "content-type": "text/plain", authorization: `Bearer ${TOKEN}` },
        body: "prompt=a cat",
      }),
      makeEnv()
    );

    expect(response.status).toBe(415);
  });

  test("returns 502 when the model throws or returns nothing", async () => {
    const thrown = await worker.fetch(
      postJson({ prompt: "a cat" }),
      makeEnv({
        "Image-AI": {
          run: async () => {
            throw new Error("upstream unavailable");
          },
        },
      })
    );
    const empty = await worker.fetch(
      postJson({ prompt: "a cat" }),
      makeEnv({ "Image-AI": { run: async () => ({}) } })
    );

    expect(thrown.status).toBe(502);
    expect(empty.status).toBe(502);
  });

  test("returns 404 for unknown paths and 405 for GET on /generate", async () => {
    const notFound = await worker.fetch(new Request("https://worker.test/nope"), makeEnv());
    const wrongMethod = await worker.fetch(
      new Request("https://worker.test/generate"),
      makeEnv()
    );

    expect(notFound.status).toBe(404);
    expect(wrongMethod.status).toBe(405);
  });
});
