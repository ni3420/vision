import { randomUUID } from "node:crypto";
import { User } from "@/models/user.models";
import { UsageLedger, type UsageKind } from "@/models/usage-ledger.models";

export const FREE_GENERATION_LIMIT = 5;

export type QuotaKind = UsageKind;

export class QuotaExceededError extends Error {
  readonly code = "QUOTA_EXCEEDED";

  constructor() {
    super("Free generation limit reached");
    this.name = "QuotaExceededError";
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

export interface QuotaReservation {
  userId: string;
  kind: QuotaKind;
  plan: "FREE" | "PRO";
  ledgerId: string | null;
}

export interface ReserveQuotaOptions {
  userId: string;
  kind: QuotaKind;
  idempotencyKey?: string;
  reason?: string;
}

export async function reserveQuota(
  options: ReserveQuotaOptions
): Promise<QuotaReservation> {
  const user = await User.findOne({ userId: options.userId })
    .select("plan freeUsesCount")
    .lean<{ plan?: string; freeUsesCount?: number } | null>();

  if (!user) throw new QuotaUserMissingError();

  const plan = user.plan === "PRO" ? "PRO" : "FREE";
  if (plan === "PRO") {
    return { userId: options.userId, kind: options.kind, plan, ledgerId: null };
  }

  // Every charge gets a ledger row so refunds and audits work even when the
  // caller does not supply an Idempotency-Key.
  let ledgerId: string;
  try {
    const ledger = await UsageLedger.create({
      userId: options.userId,
      kind: options.kind,
      status: "reserved",
      idempotencyKey:
        options.idempotencyKey?.trim() || `auto:${randomUUID()}`,
      reason: options.reason,
    });
    ledgerId = String(ledger._id);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new DuplicateRequestError();
    }
    throw error;
  }

  const charged = await User.findOneAndUpdate(
    {
      userId: options.userId,
      plan: { $ne: "PRO" },
      freeUsesCount: { $lt: FREE_GENERATION_LIMIT },
    },
    { $inc: { freeUsesCount: 1 } },
    { new: true }
  );

  if (!charged) {
    await UsageLedger.deleteOne({ _id: ledgerId });
    throw new QuotaExceededError();
  }

  return { userId: options.userId, kind: options.kind, plan, ledgerId };
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

  await User.updateOne(
    { userId: reservation.userId, freeUsesCount: { $gt: 0 } },
    { $inc: { freeUsesCount: -1 } }
  );
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
