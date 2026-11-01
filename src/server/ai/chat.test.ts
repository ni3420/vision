import { describe, expect, it } from "bun:test";
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GROQ_MODEL,
  chatErrorStatus,
  isRetryableChatError,
} from "./chat";

describe("chat model defaults", () => {
  it("does not fall back to retired model IDs", () => {
    expect(DEFAULT_GROQ_MODEL).toBe("openai/gpt-oss-120b");
    expect(DEFAULT_GEMINI_MODEL).toBe("gemini-3.6-flash");
  });
});

describe("chatErrorStatus", () => {
  it("reads an SDK status", () => {
    expect(chatErrorStatus({ status: 429 })).toBe(429);
  });

  it("reads a response status", () => {
    expect(chatErrorStatus({ response: { status: 503 } })).toBe(503);
  });

  it("ignores non-numeric or missing statuses", () => {
    expect(chatErrorStatus(new Error("offline"))).toBeUndefined();
    expect(chatErrorStatus({ status: "INVALID_ARGUMENT" })).toBeUndefined();
    expect(chatErrorStatus(null)).toBeUndefined();
  });
});

describe("isRetryableChatError", () => {
  it("retries transient statuses", () => {
    for (const status of [408, 429, 500, 502, 503, 504]) {
      expect(isRetryableChatError({ status })).toBe(true);
    }
  });

  it("does not retry permanent statuses", () => {
    for (const status of [400, 401, 403, 404, 422]) {
      expect(isRetryableChatError({ status })).toBe(false);
    }
  });

  it("treats a status-less failure as a retryable network error", () => {
    expect(isRetryableChatError(new Error("ECONNRESET"))).toBe(true);
    expect(isRetryableChatError({ name: "APIConnectionTimeoutError" })).toBe(true);
  });
});
