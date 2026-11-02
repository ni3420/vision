import { describe, expect, it } from "bun:test";
import {
  buildSnapshot,
  buildWeeklySeries,
  startOfUtcDay,
  utcDateKey,
} from "./summary";

describe("startOfUtcDay / utcDateKey", () => {
  it("truncates to UTC midnight", () => {
    const value = startOfUtcDay(new Date("2026-11-01T23:59:59.999Z"));
    expect(value.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("formats the UTC date key", () => {
    expect(utcDateKey(new Date("2026-11-01T23:59:59.999Z"))).toBe("2026-11-01");
  });
});

describe("buildWeeklySeries", () => {
  const now = new Date("2026-11-01T12:00:00.000Z");

  it("returns exactly seven days ending today", () => {
    const series = buildWeeklySeries({}, now);

    expect(series).toHaveLength(7);
    expect(series[0].date).toBe("2026-10-26");
    expect(series[6].date).toBe("2026-11-01");
    expect(series[6].day).toBe("Sun");
  });

  it("fills missing buckets with zero", () => {
    const series = buildWeeklySeries({ image: { "2026-11-01": 3 } }, now);

    expect(series[6].image).toBe(3);
    expect(series[6].chat).toBe(0);
    expect(series[6].background).toBe(0);
    expect(series[0].image).toBe(0);
  });
});

describe("buildSnapshot", () => {
  const counts = {
    images: { total: 2, buckets: {} },
    backgrounds: { total: 1, buckets: {} },
    conversations: { total: 3, buckets: {} },
  };
  const now = new Date("2026-11-01T12:00:00.000Z");

  it("reports the remaining free trial credits", () => {
    const snapshot = buildSnapshot({
      user: {
        plan: "FREE",
        freeUsesCount: 2,
        trialEndsAt: new Date("2026-11-05T12:00:00.000Z"),
      },
      ...counts,
      now,
    });

    expect(snapshot.user).toMatchObject({
      plan: "FREE",
      limit: 5,
      remaining: 3,
      used: 2,
      trialExpired: false,
      trialDaysLeft: 4,
      canGenerate: true,
    });
    expect(snapshot.counts.total).toBe(6);
  });

  it("never reports negative remaining usage", () => {
    const snapshot = buildSnapshot({
      user: { plan: "FREE", freeUsesCount: 9 },
      ...counts,
      now,
    });

    expect(snapshot.user.remaining).toBe(0);
  });

  it("flags an expired trial", () => {
    const snapshot = buildSnapshot({
      user: {
        plan: "FREE",
        freeUsesCount: 0,
        trialEndsAt: new Date("2026-10-01T12:00:00.000Z"),
      },
      ...counts,
      now,
    });

    expect(snapshot.user.trialExpired).toBe(true);
    expect(snapshot.user.canGenerate).toBe(false);
  });

  it("reports paid plan credits", () => {
    const snapshot = buildSnapshot({
      user: {
        plan: "BASIC",
        credits: 40,
        creditsResetAt: new Date("2026-12-01T12:00:00.000Z"),
      },
      ...counts,
      now,
    });

    expect(snapshot.user.plan).toBe("BASIC");
    expect(snapshot.user.isPaid).toBe(true);
    expect(snapshot.user.limit).toBe(100);
    expect(snapshot.user.remaining).toBe(40);
  });

  it("treats an unknown plan as FREE", () => {
    const snapshot = buildSnapshot({
      user: { plan: undefined },
      ...counts,
      now,
    });

    expect(snapshot.user.plan).toBe("FREE");
  });
});
