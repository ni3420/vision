import { afterEach, describe, expect, it } from "bun:test";
import { looksConfigured, resolveMode } from "./runtime";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("looksConfigured", () => {
  it("rejects empty, short, and placeholder-looking keys", () => {
    expect(looksConfigured(undefined)).toBe(false);
    expect(looksConfigured("   ")).toBe(false);
    expect(looksConfigured("short")).toBe(false);
    expect(looksConfigured("your_api_key_here")).toBe(false);
    expect(looksConfigured("changeme-1234567890")).toBe(false);
  });

  it("accepts a realistic key", () => {
    expect(looksConfigured("sk-live-0123456789abcdef")).toBe(true);
  });
});

describe("resolveMode", () => {
  it("honours AI_MODE=mock even when keys exist", () => {
    process.env.AI_MODE = "mock";
    expect(resolveMode(["sk-live-0123456789abcdef"])).toBe("mock");
  });

  it("honours AI_MODE=live without keys", () => {
    process.env.AI_MODE = "live";
    expect(resolveMode([])).toBe("live");
  });

  it("goes live in auto mode when every key looks configured", () => {
    process.env.AI_MODE = "auto";
    expect(
      resolveMode(["sk-live-0123456789abcdef", "gsk-0123456789abcdef"])
    ).toBe("live");
  });

  it("stays in mock mode outside production when a key is missing", () => {
    process.env.AI_MODE = "auto";
    process.env = { ...process.env, NODE_ENV: "test" };
    expect(resolveMode(["sk-live-0123456789abcdef", undefined])).toBe("mock");
  });

  it("never silently mocks in production", () => {
    process.env.AI_MODE = "auto";
    process.env = { ...process.env, NODE_ENV: "production" };
    expect(resolveMode([])).toBe("live");
  });
});
