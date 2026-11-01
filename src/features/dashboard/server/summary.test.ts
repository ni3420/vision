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
    expect(series[6].music).toBe(0);
    expect(series[0].image).toBe(0);
  });
});

describe("buildSnapshot", () => {
  const counts = {
    images: { total: 2, buckets: {} },
    music: { total: 1, buckets: {} },
    conversations: { total: 3, buckets: {} },
  };

  it("reports remaining free generations", () => {
    const snapshot = buildSnapshot({
      plan: "FREE",
      freeUsesCount: 2,
      ...counts,
      now: new Date("2026-11-01T12:00:00.000Z"),
    });

    expect(snapshot.user).toEqual({
      plan: "FREE",
      freeUsesCount: 2,
      limit: 5,
      remaining: 3,
    });
    expect(snapshot.counts.total).toBe(6);
  });

  it("never reports negative remaining usage", () => {
    const snapshot = buildSnapshot({
      plan: "FREE",
      freeUsesCount: 9,
      ...counts,
      now: new Date("2026-11-01T12:00:00.000Z"),
    });

    expect(snapshot.user.remaining).toBe(0);
  });

  it("marks PRO accounts as uncapped", () => {
    const snapshot = buildSnapshot({
      plan: "PRO",
      freeUsesCount: 9,
      ...counts,
      now: new Date("2026-11-01T12:00:00.000Z"),
    });

    expect(snapshot.user.plan).toBe("PRO");
    expect(snapshot.user.remaining).toBeNull();
  });

  it("treats an unknown plan as FREE", () => {
    const snapshot = buildSnapshot({
      plan: undefined,
      ...counts,
      now: new Date("2026-11-01T12:00:00.000Z"),
    });

    expect(snapshot.user.plan).toBe("FREE");
  });
});
