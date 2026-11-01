import { getAuth } from "@clerk/hono";
import { createMiddleware } from "hono/factory";
import {
  RATE_LIMITS,
  consumeRateLimit,
  type RateLimitRoute,
} from "@/server/rate-limit";

export const rateLimitGuard = (route: RateLimitRoute) =>
  createMiddleware(async (c, next) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json(
        { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
        401
      );
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
      return next();
    }

    c.header("X-RateLimit-Limit", String(result.limit));
    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header(
      "X-RateLimit-Reset",
      String(Math.ceil(result.resetAt.getTime() / 1000))
    );

    if (!result.allowed) {
      c.header("Retry-After", String(result.retryAfterSec));
      return c.json(
        {
          success: false,
          code: "RATE_LIMITED",
          error: `Too many requests. Try again in ${result.retryAfterSec}s.`,
        },
        429
      );
    }

    await next();
  });
