import { randomUUID } from "node:crypto";

import { entitlementsFor } from "@/lib/entitlements";
import { monthlyCreditsFor, normalizePlan, type PlanId } from "@/lib/plans";
import { User } from "@/models/user.models";
import { UsageLedger, type UsageKind } from "@/models/usage-ledger.models";

export type QuotaKind = UsageKind;

const CREDIT_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export class QuotaExceededError extends Error {
  readonly code = "QUOTA_EXCEEDED";

  constructor() {
    super("Credit balance is empty");
    this.name = "QuotaExceededError";
  }
}

export class TrialExpiredError extends Error {
  readonly code = "TRIAL_EXPIRED";

  constructor() {
    super("Free trial has ended");
    this.name = "TrialExpiredError";
  }
}

export class QuotaUserMissingError extends Error {
  readonly code = "USER_NOT_INITIALIZED";

  constructor() {
    super("User record has not been initialized");
    this.name = "QuotaUserMissingError";
  }
}

export class DuplicateRequestError extends Error {
  readonly code = "DUPLICATE_REQUEST";

  constructor() {
    super("This request was already submitted");
    this.name = "DuplicateRequestError";
  }
}

type ChargedCounter = "freeUsesCount" | "credits" | "none";

export interface QuotaReservation {
  userId: string;
  kind: QuotaKind;
  plan: PlanId;
  ledgerId: string | null;
  counter: ChargedCounter;
}

export interface ReserveQuotaOptions {
  userId: string;
  kind: QuotaKind;
  idempotencyKey?: string;
  reason?: string;
}

export function nextCreditsResetAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + CREDIT_PERIOD_MS);
}

/**
 * Paid allowances refill lazily on the first request after the period ends,
 * so a missed invoice webhook cannot lock a paying customer out.
 */
export async function refillPaidCreditsIfDue(
  userId: string,
  plan: PlanId,
  now: Date = new Date()
) {
  if (plan === "FREE") return;
  const allowance = monthlyCreditsFor(plan);
  if (allowance === null) return;

  await User.updateOne(
    {
      userId,
      plan,
      $or: [{ creditsResetAt: { $lte: now } }, { creditsResetAt: null }],
    },
    { $set: { credits: allowance, creditsResetAt: nextCreditsResetAt(now) } }
  );
}

async function reserveLedger(options: ReserveQuotaOptions): Promise<string> {
  try {
    const ledger = await UsageLedger.create({
      userId: options.userId,
      kind: options.kind,
      status: "reserved",
      idempotencyKey:
        options.idempotencyKey?.trim() || `auto:${randomUUID()}`,
      reason: options.reason,
    });
    return String(ledger._id);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new DuplicateRequestError();
    }
    throw error;
  }
}

export async function reserveQuota(
  options: ReserveQuotaOptions
): Promise<QuotaReservation> {
  const user = await User.findOne({ userId: options.userId })
    .select(
      "plan freeUsesCount credits creditsResetAt trialEndsAt createdAt"
    )
    .lean<{
      plan?: string;
      freeUsesCount?: number;
      credits?: number;
      creditsResetAt?: Date | null;
      trialEndsAt?: Date | null;
      createdAt?: Date;
    } | null>();

  if (!user) throw new QuotaUserMissingError();

  const plan = normalizePlan(user.plan);

  if (plan === "FREE") {
    const entitlements = entitlementsFor(user);
    if (entitlements.trialExpired) throw new TrialExpiredError();

    const ledgerId = await reserveLedger(options);
    const charged = await User.findOneAndUpdate(
      {
        userId: options.userId,
        plan: "FREE",
        freeUsesCount: { $lt: entitlements.limit },
      },
      { $inc: { freeUsesCount: 1 } },
      { new: true }
    );

    if (!charged) {
      await UsageLedger.deleteOne({ _id: ledgerId });
      throw new QuotaExceededError();
    }

    return {
      userId: options.userId,
      kind: options.kind,
      plan,
      ledgerId,
      counter: "freeUsesCount",
    };
  }

  await refillPaidCreditsIfDue(options.userId, plan);

  const ledgerId = await reserveLedger(options);
  const charged = await User.findOneAndUpdate(
    { userId: options.userId, plan, credits: { $gt: 0 } },
    { $inc: { credits: -1 } },
    { new: true }
  );

  if (!charged) {
    await UsageLedger.deleteOne({ _id: ledgerId });
    throw new QuotaExceededError();
  }

  return {
    userId: options.userId,
    kind: options.kind,
    plan,
    ledgerId,
    counter: "credits",
  };
}

export async function settleQuota(reservation: QuotaReservation) {
  if (!reservation.ledgerId) return;
  await UsageLedger.updateOne(
    { _id: reservation.ledgerId, status: "reserved" },
    { $set: { status: "settled" } }
  );
}

export async function refundQuota(reservation: QuotaReservation) {
  if (!reservation.ledgerId) return;

  const released = await UsageLedger.findOneAndUpdate(
    { _id: reservation.ledgerId, status: "reserved" },
    { $set: { status: "refunded" } },
    { new: false }
  );

  if (!released) return;

  if (reservation.counter === "freeUsesCount") {
    await User.updateOne(
      { userId: reservation.userId, freeUsesCount: { $gt: 0 } },
      { $inc: { freeUsesCount: -1 } }
    );
    return;
  }

  if (reservation.counter === "credits") {
    await User.updateOne(
      { userId: reservation.userId },
      { $inc: { credits: 1 } }
    );
  }
}

export async function runWithQuota<T>(
  options: ReserveQuotaOptions,
  work: (reservation: QuotaReservation) => Promise<T>
): Promise<{ value: T; reservation: QuotaReservation }> {
  const reservation = await reserveQuota(options);

  try {
    const value = await work(reservation);
    await settleQuota(reservation);
    return { value, reservation };
  } catch (error) {
    await refundQuota(reservation);
    throw error;
  }
}
