import { beforeEach, describe, expect, it, mock } from "bun:test";

interface FakeHit {
  _id: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
}

const state = {
  rows: new Map<string, FakeHit>(),
  duplicateOnce: false,
  userId: "user-1" as string | null,
};

mock.module("@clerk/hono", () => ({
  getAuth: () => (state.userId ? { userId: state.userId } : null),
}));

interface UpsertUpdate {
  $inc: { count: number };
  $setOnInsert: { windowStart: Date; expiresAt: Date };
}

mock.module("@/models/rate-limit.models", () => ({
  RateLimitHit: {
    findOneAndUpdate: (filter: { _id: string }, update: UpsertUpdate) => ({
      lean: async () => {
        if (state.duplicateOnce) {
          state.duplicateOnce = false;
          const error = new Error("duplicate key") as Error & { code: number };
          error.code = 11000;
          throw error;
        }

        const existing = state.rows.get(filter._id);
        if (existing) {
          existing.count += update.$inc.count;
          return { ...existing };
        }

        const created: FakeHit = {
          _id: filter._id,
          count: update.$inc.count,
          ...update.$setOnInsert,
        };
        state.rows.set(filter._id, created);
        return { ...created };
      },
    }),
  },
}));

const { RATE_LIMITS, consumeRateLimit, rateLimitKey, windowStartFor } =
  await import("./rate-limit");
const { rateLimitGuard } = await import("@/middleware/rate-limit-middleware");
const { Hono } = await import("hono");

const imagePolicy = RATE_LIMITS.image;

/** Consume once at a fixed instant; `offsetSec` is relative to window start. */
function consumeAt(
  offsetSec: number,
  overrides: Partial<{ userId: string; route: "image" | "background" }> = {}
) {
  return consumeRateLimit({
    userId: overrides.userId ?? "user-1",
    route: overrides.route ?? "image",
    limit: imagePolicy.limit,
    windowMs: imagePolicy.windowMs,
    now: new Date(offsetSec * 1000),
  });
}

beforeEach(() => {
  state.rows.clear();
  state.duplicateOnce = false;
  state.userId = "user-1";
});

describe("windowStartFor", () => {
  it("floors to the start of the window", () => {
    expect(windowStartFor(new Date(61_500), 60_000)).toBe(60_000);
    expect(windowStartFor(new Date(120_000), 60_000)).toBe(120_000);
  });

  it("builds a stable key per user, route and window", () => {
    expect(rateLimitKey("user-1", "image", 60_000)).toBe(
      "user-1:image:60000"
    );
  });
});

describe("consumeRateLimit", () => {
  it("allows requests up to the limit and denies the next one", async () => {
    for (let i = 0; i < imagePolicy.limit; i += 1) {
      const result = await consumeAt(0);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(imagePolicy.limit - i - 1);
    }

    const denied = await consumeAt(0);
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
  });

  it("reports the retry delay until the window ends", async () => {
    const result = await consumeAt(15);
    expect(result.retryAfterSec).toBe(45);
    expect(result.resetAt.getTime()).toBe(60_000);
  });

  it("starts a fresh budget in the next window", async () => {
    for (let i = 0; i < imagePolicy.limit; i += 1) {
      await consumeAt(0);
    }
    expect((await consumeAt(0)).allowed).toBe(false);

    const next = await consumeAt(60);
    expect(next.allowed).toBe(true);
    expect(next.remaining).toBe(imagePolicy.limit - 1);
  });

  it("keeps budgets separate per user and per route", async () => {
    for (let i = 0; i < imagePolicy.limit; i += 1) {
      await consumeAt(0, { userId: "user-1" });
    }

    const otherUser = await consumeAt(0, { userId: "user-2" });
    const otherRoute = await consumeAt(0, { userId: "user-1", route: "background" });

    expect(otherUser.allowed).toBe(true);
    expect(otherRoute.allowed).toBe(true);
  });

  it("survives a concurrent upsert collision on the first hit", async () => {
    state.duplicateOnce = true;

    const result = await consumeAt(0);

    expect(result.allowed).toBe(true);
    expect(state.rows.size).toBe(1);
    expect([...state.rows.values()][0].count).toBe(1);
  });

  it("sets the TTL to the end of the window", async () => {
    await consumeAt(0);
    const [row] = [...state.rows.values()];
    expect(row.expiresAt.getTime()).toBe(60_000);
    expect(row.windowStart.getTime()).toBe(0);
  });
});

describe("rateLimitGuard", () => {
  const app = new Hono().post(
    "/",
    rateLimitGuard("image"),
    (c) => c.json({ success: true }, 200)
  );

  it("rejects an unauthenticated request", async () => {
    state.userId = null;

    const response = await app.request("/", { method: "POST" });

    expect(response.status).toBe(401);
  });

  it("adds rate-limit headers and returns 429 with Retry-After when exhausted", async () => {
    for (let i = 0; i < imagePolicy.limit; i += 1) {
      const allowed = await app.request("/", { method: "POST" });
      expect(allowed.status).toBe(200);
      expect(allowed.headers.get("X-RateLimit-Limit")).toBe(
        String(imagePolicy.limit)
      );
    }

    const denied = await app.request("/", { method: "POST" });

    expect(denied.status).toBe(429);
    expect(denied.headers.get("Retry-After")).toBeTruthy();
    expect(denied.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(await denied.json()).toMatchObject({
      success: false,
      code: "RATE_LIMITED",
    });
  });
});
