import { getAuth } from "@clerk/hono";
import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import {
  DuplicateRequestError,
  QuotaExceededError,
  QuotaUserMissingError,
  refundQuota,
  reserveQuota,
  settleQuota,
  type QuotaKind,
} from "@/server/quota";

export function quotaErrorResponse(c: Context, error: unknown) {
  if (error instanceof QuotaExceededError) {
    return c.json(
      {
        success: false,
        code: "QUOTA_EXCEEDED",
        error:
          "Free generation limit reached. Upgrade to Pro for unlimited generations.",
      },
      403
    );
  }

  if (error instanceof QuotaUserMissingError) {
    return c.json(
      {
        success: false,
        code: "USER_NOT_INITIALIZED",
        error: "User configuration framework context not initialized",
      },
      404
    );
  }

  if (error instanceof DuplicateRequestError) {
    return c.json(
      {
        success: false,
        code: "DUPLICATE_REQUEST",
        error: "This request was already submitted",
      },
      409
    );
  }

  console.error("Quota reservation failed:", error);
  return c.json(
    { success: false, code: "QUOTA_ERROR", error: "Failed to reserve generation quota" },
    500
  );
}

export const quotaGuard = (kind: QuotaKind) =>
  createMiddleware(async (c, next) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json(
        { success: false, code: "UNAUTHORIZED", error: "Unauthorized access vector" },
        401
      );
    }

    let reservation;

    try {
      reservation = await reserveQuota({
        userId: auth.userId,
        kind,
        idempotencyKey: c.req.header("idempotency-key")?.trim() || undefined,
      });
    } catch (error) {
      return quotaErrorResponse(c, error);
    }

    try {
      await next();
    } catch (error) {
      await refundQuota(reservation);
      throw error;
    }

    if (c.res.status >= 400) {
      await refundQuota(reservation);
    } else {
      await settleQuota(reservation);
    }
  });
