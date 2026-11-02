import { describe, expect, it } from "bun:test";
import { describeGenerationError } from "./error-copy";

describe("describeGenerationError", () => {
  it("maps quota exhaustion to a non-retryable upgrade hint", () => {
    const copy = describeGenerationError({
      status: 403,
      code: "QUOTA_EXCEEDED",
      message: "Free generation limit reached",
    });

    expect(copy.title).toBe("You're out of credits");
    expect(copy.retryable).toBe(false);
  });

  it("keeps the server's wait time for rate limiting", () => {
    const copy = describeGenerationError({
      status: 429,
      code: "RATE_LIMITED",
      message: "Too many requests. Try again in 42s.",
    });

    expect(copy.title).toBe("Generating too quickly");
    expect(copy.message).toBe("Too many requests. Try again in 42s.");
    expect(copy.retryable).toBe(true);
  });

  it("marks provider failures retryable and says the credit was safe", () => {
    const copy = describeGenerationError({
      status: 502,
      code: "PROVIDER_CALL_FAILED",
      retryable: true,
    });

    expect(copy.title).toBe("The image service is busy");
    expect(copy.message).toContain("credit was not used");
    expect(copy.retryable).toBe(true);
  });

  it("offers a retry when storage fails after generation", () => {
    const copy = describeGenerationError({
      status: 502,
      code: "STORAGE_WRITE_FAILED",
      retryable: true,
    });

    expect(copy.title).toBe("Your image could not be saved");
    expect(copy.retryable).toBe(true);
  });

  it("does not offer a retry for a missing provider key", () => {
    const copy = describeGenerationError({
      status: 503,
      code: "PROVIDER_NOT_CONFIGURED",
    });

    expect(copy.title).toBe("Image service not configured");
    expect(copy.retryable).toBe(false);
  });

  it("does not offer a retry for a missing storage driver", () => {
    const copy = describeGenerationError({
      status: 503,
      code: "STORAGE_NOT_CONFIGURED",
    });

    expect(copy.retryable).toBe(false);
  });

  it("surfaces validation messages without a retry", () => {
    const copy = describeGenerationError({
      status: 400,
      code: "INVALID_DIMENSIONS",
      message: "Dimensions must be between 64 and 1536 pixels per side",
    });

    expect(copy.title).toBe("Check your settings");
    expect(copy.message).toContain("64 and 1536");
    expect(copy.retryable).toBe(false);
  });

  it("treats a dropped connection as retryable", () => {
    const copy = describeGenerationError({ code: "NETWORK_ERROR" });

    expect(copy.title).toBe("Couldn't reach the server");
    expect(copy.retryable).toBe(true);
  });

  it("falls back to a generic retryable error for unknown 5xx responses", () => {
    const copy = describeGenerationError({ status: 500 });

    expect(copy.title).toBe("Generation failed");
    expect(copy.retryable).toBe(true);
  });

  it("does not retry an unknown 4xx response", () => {
    const copy = describeGenerationError({ status: 400, message: "Bad request" });

    expect(copy.message).toBe("Bad request");
    expect(copy.retryable).toBe(false);
  });
});
