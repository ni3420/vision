import { RateLimitHit } from "@/models/rate-limit.models";

export type RateLimitRoute = "image" | "background" | "conversation";

export interface RateLimitPolicy {
  limit: number;
  windowMs: number;
}

/**
 * Per-user request budgets. These protect provider spend and database work, so
 * they apply to PRO as well as FREE accounts.
 */
export const RATE_LIMITS: Record<RateLimitRoute, RateLimitPolicy> = {
  image: { limit: 10, windowMs: 60_000 },
  background: { limit: 10, windowMs: 60_000 },
  conversation: { limit: 30, windowMs: 60_000 },
};

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSec: number;
}

export interface ConsumeRateLimitOptions extends RateLimitPolicy {
  userId: string;
  route: RateLimitRoute;
  now?: Date;
}

export function windowStartFor(now: Date, windowMs: number): number {
  return Math.floor(now.getTime() / windowMs) * windowMs;
}

export function rateLimitKey(
  userId: string,
  route: RateLimitRoute,
  windowStartMs: number
): string {
  return `${userId}:${route}:${windowStartMs}`;
}

function isDuplicateKey(error: unknown) {
  return (error as { code?: number }).code === 11000;
}

export async function consumeRateLimit(
  options: ConsumeRateLimitOptions
): Promise<RateLimitResult> {
  const now = options.now ?? new Date();
  const windowStartMs = windowStartFor(now, options.windowMs);
  const resetAt = new Date(windowStartMs + options.windowMs);
  const key = rateLimitKey(options.userId, options.route, windowStartMs);

  const hit = await increment(key, new Date(windowStartMs), resetAt);
  const used = hit?.count ?? 0;

  return {
    allowed: used <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - used),
    resetAt,
    retryAfterSec: Math.max(
      1,
      Math.ceil((resetAt.getTime() - now.getTime()) / 1000)
    ),
  };
}

async function increment(key: string, windowStart: Date, expiresAt: Date) {
  const update = {
    $inc: { count: 1 },
    $setOnInsert: { windowStart, expiresAt },
  };

  try {
    return await RateLimitHit.findOneAndUpdate({ _id: key }, update, {
      upsert: true,
      new: true,
    }).lean<{ count: number }>();
  } catch (error) {
    // Two concurrent first-hits of the same window can both attempt the upsert.
    if (!isDuplicateKey(error)) throw error;
    return await RateLimitHit.findOneAndUpdate({ _id: key }, update, {
      upsert: true,
      new: true,
    }).lean<{ count: number }>();
  }
}
