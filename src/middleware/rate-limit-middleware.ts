import { getAuth } from "@clerk/hono";
import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import {
  RATE_LIMITS,
  consumeRateLimit,
  type RateLimitRoute,
} from "@/server/rate-limit";

type RateLimitRejection =
  | {
      allowed: false;
      status: 401;
      body: { success: false; code: "UNAUTHORIZED"; error: string };
    }
  | {
      allowed: false;
      status: 429;
      body: { success: false; code: "RATE_LIMITED"; error: string };
    };

export type RateLimitCheck = { allowed: true } | RateLimitRejection;

/**
 * Consume one window slot for the caller. Returns a typed rejection the caller
 * can turn into `c.json(body, status)`, keeping the route's response types intact.
 */
export async function checkRateLimit(
  c: Context,
  route: RateLimitRoute
): Promise<RateLimitCheck> {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return {
      allowed: false,
      status: 401,
      body: {
        success: false,
        code: "UNAUTHORIZED",
        error: "Unauthorized access vector",
      },
    };
  }

  let result;
  try {
    result = await consumeRateLimit({
      userId: auth.userId,
      route,
      ...RATE_LIMITS[route],
    });
  } catch (error) {
    // Fail open: a limiter outage must not take down generation entirely.
    console.error(`Rate limit check failed for ${route}:`, error);
    return { allowed: true };
  }

  c.header("X-RateLimit-Limit", String(result.limit));
  c.header("X-RateLimit-Remaining", String(result.remaining));
  c.header("X-RateLimit-Reset", String(Math.ceil(result.resetAt.getTime() / 1000)));

  if (!result.allowed) {
    c.header("Retry-After", String(result.retryAfterSec));
    return {
      allowed: false,
      status: 429,
      body: {
        success: false,
        code: "RATE_LIMITED",
        error: `Too many requests. Try again in ${result.retryAfterSec}s.`,
      },
    };
  }

  return { allowed: true };
}

export const rateLimitGuard = (route: RateLimitRoute) =>
  createMiddleware(async (c, next) => {
    const check = await checkRateLimit(c, route);
    if (!check.allowed) return c.json(check.body, check.status);
    await next();
  });
