const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export type FetchLike = (
  input: string | URL,
  init: RequestInit
) => Promise<Response>;

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS.has(status);
}

export interface RetryOptions {
  /** Total attempts, including the first one. */
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (info: {
    attempt: number;
    delayMs: number;
    status?: number;
    error?: unknown;
  }) => void;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function backoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  const exponential = baseDelayMs * 2 ** Math.max(0, attempt - 1);
  const jitter = Math.floor(Math.random() * Math.min(250, baseDelayMs));
  return Math.min(exponential + jitter, maxDelayMs);
}

export function parseRetryAfter(value: string | null, now = Date.now()): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - now);
}

/**
 * `fetch` with bounded retries for network errors and transient HTTP statuses.
 * A 4xx other than 408/429 is returned immediately — retrying it only burns time.
 */
export async function fetchWithRetry(
  input: string | URL,
  init: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const {
    attempts = 3,
    baseDelayMs = 250,
    maxDelayMs = 2000,
    fetchImpl = (input, init) => fetch(input, init),
    sleep = wait,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(input, init);

      if (attempt >= attempts || !isRetryableStatus(response.status)) {
        return response;
      }

      const delayMs = Math.min(
        parseRetryAfter(response.headers.get("retry-after")) ??
          backoffDelay(attempt, baseDelayMs, maxDelayMs),
        maxDelayMs
      );

      if (response.body) {
        await response.body.cancel().catch(() => undefined);
      }
      onRetry?.({ attempt, status: response.status, delayMs });
      await sleep(delayMs);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) throw error;

      const delayMs = backoffDelay(attempt, baseDelayMs, maxDelayMs);
      onRetry?.({ attempt, delayMs, error });
      await sleep(delayMs);
    }
  }

  throw lastError ?? new Error("fetchWithRetry exhausted without a response");
}
