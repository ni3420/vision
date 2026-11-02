import { describe, expect, it } from "bun:test";
import { describeBackgroundError } from "./error-copy";

describe("describeBackgroundError", () => {
  it("shows the provider message and hides retry for exhausted credits", () => {
    const copy = describeBackgroundError({
      status: 502,
      code: "PROVIDER_CALL_FAILED",
      retryable: false,
      message: "remove.bg credits are exhausted for this account.",
    });

    expect(copy.retryable).toBe(false);
    expect(copy.message).toBe("remove.bg credits are exhausted for this account.");
    expect(copy.title).not.toContain("busy");
  });

  it("keeps transient provider failures retryable", () => {
    const copy = describeBackgroundError({
      status: 502,
      code: "PROVIDER_CALL_FAILED",
      retryable: true,
    });

    expect(copy.retryable).toBe(true);
    expect(copy.title).toContain("busy");
  });

  it("suggests REMOVE_BG_API_KEY when the provider is unconfigured", () => {
    const copy = describeBackgroundError({
      status: 503,
      code: "PROVIDER_NOT_CONFIGURED",
      message: "Background provider not configured",
    });

    expect(copy.retryable).toBe(false);
    expect(copy.message).toContain("REMOVE_BG_API_KEY");
  });
});
