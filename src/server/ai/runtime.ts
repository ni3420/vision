import type { EffectiveMode } from "./types";

export class ProviderNotConfiguredError extends Error {
  readonly code = "PROVIDER_NOT_CONFIGURED";
}

export class ProviderCallError extends Error {
  readonly code = "PROVIDER_CALL_FAILED";

  constructor(
    message: string,
    readonly provider: string,
    readonly retryable = false
  ) {
    super(message);
    this.name = "ProviderCallError";
  }
}

const PLACEHOLDER_MARKERS =
  /(placeholder|your[_-]|changeme|change[_-]me|dummy|sample|example|xxxx|todo|<|>)/i;

export function looksConfigured(value: string | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  if (trimmed.length < 16) return false;
  return !PLACEHOLDER_MARKERS.test(trimmed);
}

/**
 * auto  -> live when a real-looking key exists, otherwise mock outside production
 * live  -> always call the provider; throw ProviderNotConfiguredError if unset
 * mock  -> never call a provider (development/demo only)
 */
export function resolveMode(keys: (string | undefined)[]): EffectiveMode {
  const configured = process.env.AI_MODE?.trim().toLowerCase();

  if (configured === "mock") return "mock";
  if (configured === "live") return "live";
  if (keys.length > 0 && keys.every(looksConfigured)) return "live";

  return process.env.NODE_ENV === "production" ? "live" : "mock";
}

export function warnMock(scope: string) {
  console.warn(
    `[ai:${scope}] running in mock mode - set the provider key (or AI_MODE=live) to call a real model`
  );
}
