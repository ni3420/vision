import { describe, expect, it } from "bun:test";
import {
  backoffDelay,
  fetchWithRetry,
  isRetryableStatus,
  parseRetryAfter,
} from "./retry";

const init: RequestInit = { method: "GET" };

function response(status: number, headers: Record<string, string> = {}) {
  return new Response(status === 204 ? null : "body", {
    status,
    headers,
  });
}

describe("isRetryableStatus", () => {
  it("retries transient statuses only", () => {
    for (const status of [408, 429, 500, 502, 503, 504]) {
      expect(isRetryableStatus(status)).toBe(true);
    }
    for (const status of [400, 401, 403, 404, 422]) {
      expect(isRetryableStatus(status)).toBe(false);
    }
  });
});

describe("parseRetryAfter", () => {
  it("reads seconds", () => {
    expect(parseRetryAfter("2")).toBe(2000);
  });

  it("reads an HTTP date relative to now", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(parseRetryAfter("Thu, 01 Jan 2026 00:00:05 GMT", now)).toBe(5000);
  });

  it("ignores missing or malformed values", () => {
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter("soon")).toBeNull();
  });
});

describe("backoffDelay", () => {
  it("grows exponentially and respects the cap", () => {
    expect(backoffDelay(1, 250, 2000)).toBeGreaterThanOrEqual(250);
    expect(backoffDelay(1, 250, 2000)).toBeLessThan(500);
    expect(backoffDelay(10, 250, 2000)).toBe(2000);
  });
});

describe("fetchWithRetry", () => {
  it("returns a successful first response without sleeping", async () => {
    const sleeps: number[] = [];
    const calls: number[] = [];

    const result = await fetchWithRetry(
      "https://example.test",
      init,
      {
        fetchImpl: async () => {
          calls.push(1);
          return response(200);
        },
        sleep: async (ms) => {
          sleeps.push(ms);
        },
      }
    );

    expect(result.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(sleeps).toHaveLength(0);
  });

  it("retries a network error and then succeeds", async () => {
    let attempts = 0;
    const sleeps: number[] = [];

    const result = await fetchWithRetry("https://example.test", init, {
      fetchImpl: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("ECONNRESET");
        return response(200);
      },
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    expect(result.status).toBe(200);
    expect(attempts).toBe(2);
    expect(sleeps).toHaveLength(1);
  });

  it("retries a 503 and returns the next response", async () => {
    let attempts = 0;

    const result = await fetchWithRetry("https://example.test", init, {
      fetchImpl: async () => {
        attempts += 1;
        return attempts === 1 ? response(503) : response(200);
      },
      sleep: async () => undefined,
    });

    expect(result.status).toBe(200);
    expect(attempts).toBe(2);
  });

  it("does not retry a 400", async () => {
    let attempts = 0;

    const result = await fetchWithRetry("https://example.test", init, {
      fetchImpl: async () => {
        attempts += 1;
        return response(400);
      },
      sleep: async () => undefined,
    });

    expect(result.status).toBe(400);
    expect(attempts).toBe(1);
  });

  it("honours Retry-After from the provider", async () => {
    const sleeps: number[] = [];
    let attempts = 0;

    await fetchWithRetry("https://example.test", init, {
      fetchImpl: async () => {
        attempts += 1;
        return attempts === 1
          ? response(429, { "retry-after": "1" })
          : response(200);
      },
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    expect(sleeps).toEqual([1000]);
  });

  it("gives up after the attempt budget and returns the last response", async () => {
    let attempts = 0;

    const result = await fetchWithRetry("https://example.test", init, {
      attempts: 3,
      fetchImpl: async () => {
        attempts += 1;
        return response(503);
      },
      sleep: async () => undefined,
    });

    expect(attempts).toBe(3);
    expect(result.status).toBe(503);
  });

  it("rethrows the last network error when every attempt fails", async () => {
    let attempts = 0;

    await expect(
      fetchWithRetry("https://example.test", init, {
        attempts: 2,
        fetchImpl: async () => {
          attempts += 1;
          throw new Error("offline");
        },
        sleep: async () => undefined,
      })
    ).rejects.toThrow("offline");

    expect(attempts).toBe(2);
  });
});
