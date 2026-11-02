import { describe, expect, it } from "bun:test";
import {
  formatTime,
  groupSessionDate,
  groupSessions,
  relativeTime,
  startOfDay,
  titleFromMessage,
} from "./format";

const NOW = new Date("2026-11-02T15:00:00");

describe("titleFromMessage", () => {
  it("collapses whitespace and keeps short messages whole", () => {
    expect(titleFromMessage("  Give me\n three   captions ")).toBe("Give me three captions");
  });

  it("truncates long messages with an ellipsis", () => {
    const title = titleFromMessage("x".repeat(100), 20);

    expect(title).toHaveLength(20);
    expect(title.endsWith("…")).toBe(true);
  });

  it("falls back for blank input", () => {
    expect(titleFromMessage("   ")).toBe("New conversation");
  });
});

describe("relativeTime", () => {
  it("shows minutes, hours, and yesterday", () => {
    expect(relativeTime(new Date("2026-11-02T14:59:30"), NOW)).toBe("just now");
    expect(relativeTime(new Date("2026-11-02T14:35:00"), NOW)).toBe("25m ago");
    expect(relativeTime(new Date("2026-11-02T12:00:00"), NOW)).toBe("3h ago");
    expect(relativeTime(new Date("2026-11-01T23:00:00"), NOW)).toBe("Yesterday");
  });

  it("uses days inside a week and a date beyond it", () => {
    expect(relativeTime(new Date("2026-10-30T12:00:00"), NOW)).toBe("3d ago");
    expect(relativeTime(new Date("2026-10-20T12:00:00"), NOW)).toMatch(/Oct/);
  });
});

describe("groupSessionDate", () => {
  it("buckets by calendar day", () => {
    expect(groupSessionDate(new Date("2026-11-02T00:05:00"), NOW)).toBe("Today");
    expect(groupSessionDate(new Date("2026-11-01T23:55:00"), NOW)).toBe("Yesterday");
    expect(groupSessionDate(new Date("2026-10-28T10:00:00"), NOW)).toBe("Previous 7 days");
    expect(groupSessionDate(new Date("2026-10-01T10:00:00"), NOW)).toBe("Earlier");
  });
});

describe("groupSessions", () => {
  it("returns only populated groups in display order", () => {
    const grouped = groupSessions(
      [
        { id: "a", updatedAt: new Date("2026-10-01T10:00:00") },
        { id: "b", updatedAt: new Date("2026-11-02T10:00:00") },
        { id: "c", updatedAt: new Date("2026-11-01T10:00:00") },
      ],
      NOW
    );

    expect(grouped.map((bucket) => bucket.group)).toEqual(["Today", "Yesterday", "Earlier"]);
    expect(grouped[0].items.map((item) => item.id)).toEqual(["b"]);
  });
});

describe("startOfDay and formatTime", () => {
  it("zeroes the clock", () => {
    expect(startOfDay(new Date("2026-11-02T15:42:11")).getHours()).toBe(0);
  });

  it("formats a localized time", () => {
    expect(formatTime(new Date("2026-11-02T14:41:00"))).toMatch(/\d{1,2}:\d{2}/);
  });
});
