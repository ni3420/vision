import { describe, expect, it } from "bun:test";
import { ConversationApiError, describeChatError } from "./errors";

describe("describeChatError", () => {
  it("treats a missing status as a retryable network failure", () => {
    const copy = describeChatError({});

    expect(copy.retryable).toBe(true);
    expect(copy.title).toMatch(/reach the server/i);
  });

  it("maps quota exhaustion to an upgrade hint without a retry", () => {
    const copy = describeChatError({ status: 403, code: "QUOTA_EXCEEDED" });

    expect(copy.retryable).toBe(false);
    expect(copy.message).toMatch(/upgrade/i);
  });

  it("includes the wait time for rate limiting", () => {
    const copy = describeChatError({ status: 429, retryAfterSec: 12 });

    expect(copy.retryable).toBe(true);
    expect(copy.message).toContain("12s");
  });

  it("names the environment variables for an unconfigured provider", () => {
    const copy = describeChatError({ status: 503, code: "PROVIDER_NOT_CONFIGURED" });

    expect(copy.retryable).toBe(false);
    expect(copy.message).toContain("GROQ_API_KEY");
    expect(copy.message).toContain("GEMINI_API_KEY");
  });

  it("honours the server's retryable flag for provider failures", () => {
    expect(
      describeChatError({ status: 502, code: "PROVIDER_CALL_FAILED", retryable: false }).retryable
    ).toBe(false);
    expect(describeChatError({ status: 502, code: "PROVIDER_CALL_FAILED" }).retryable).toBe(true);
  });

  it("does not offer a retry for duplicate submissions", () => {
    const copy = describeChatError({ status: 409, code: "DUPLICATE_REQUEST" });

    expect(copy.retryable).toBe(false);
    expect(copy.title).toMatch(/already sent/i);
  });

  it("explains a missing conversation or uninitialized account", () => {
    expect(describeChatError({ status: 404, code: "SESSION_NOT_FOUND" }).retryable).toBe(false);
    expect(
      describeChatError({ status: 404, code: "USER_NOT_INITIALIZED" }).message
    ).toMatch(/refresh/i);
  });

  it("keeps a short validation detail for 400s", () => {
    const copy = describeChatError({ status: 400, detail: "Message content cannot be empty" });

    expect(copy.retryable).toBe(false);
    expect(copy.message).toBe("Message content cannot be empty");
  });
});

describe("ConversationApiError", () => {
  it("derives its message and retryability from the copy", () => {
    const error = new ConversationApiError({ status: 429, retryAfterSec: 5 });

    expect(error.retryable).toBe(true);
    expect(error.status).toBe(429);
    expect(error.message).toContain("5s");
  });
});
