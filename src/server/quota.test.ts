import { beforeEach, describe, expect, it, mock } from "bun:test";

interface FakeUser {
  plan: string;
  freeUsesCount: number;
  credits?: number;
  creditsResetAt?: Date | null;
  trialEndsAt?: Date | null;
  createdAt?: Date;
}

interface FakeLedger {
  _id: string;
  userId: string;
  kind: string;
  status: "reserved" | "settled" | "refunded";
  idempotencyKey: string;
}

type Filter = Record<string, unknown>;

const state = {
  users: new Map<string, FakeUser>(),
  ledgers: [] as FakeLedger[],
  duplicateNextKey: false,
};

function matches(user: FakeUser, query: Filter): boolean {
  if (query.plan && user.plan !== query.plan) return false;

  const freeFilter = query.freeUsesCount as
    | { $lt?: number; $gt?: number }
    | undefined;
  if (freeFilter?.$lt !== undefined && !(user.freeUsesCount < freeFilter.$lt)) {
    return false;
  }
  if (freeFilter?.$gt !== undefined && !(user.freeUsesCount > freeFilter.$gt)) {
    return false;
  }

  const creditFilter = query.credits as { $gt?: number } | undefined;
  if (creditFilter?.$gt !== undefined && !((user.credits ?? 0) > creditFilter.$gt)) {
    return false;
  }

  const or = query.$or as Filter[] | undefined;
  if (or) {
    const matched = or.some((condition) => {
      const resetFilter = condition.creditsResetAt as
        | Date
        | null
        | { $lte: Date }
        | undefined;
      if (resetFilter === null) return !user.creditsResetAt;
      if (resetFilter && resetFilter instanceof Date) {
        return (
          !!user.creditsResetAt &&
          new Date(user.creditsResetAt).getTime() === resetFilter.getTime()
        );
      }
      if (resetFilter && "$lte" in resetFilter) {
        return (
          !!user.creditsResetAt &&
          new Date(user.creditsResetAt).getTime() <=
            new Date(resetFilter.$lte).getTime()
        );
      }
      return false;
    });
    if (!matched) return false;
  }

  return true;
}

function applyUpdate(user: FakeUser, update: Filter) {
  const inc = update.$inc as Record<string, number> | undefined;
  if (inc) {
    for (const [key, value] of Object.entries(inc)) {
      const target = user as unknown as Record<string, number>;
      target[key] = (target[key] ?? 0) + value;
    }
  }

  const set = update.$set as Record<string, unknown> | undefined;
  if (set) {
    Object.assign(user, set);
  }
}

mock.module("@/models/user.models", () => ({
  User: {
    findOne: (query: { userId: string }) => ({
      select: () => ({
        lean: async () => {
          const user = state.users.get(query.userId);
          return user ? { ...user } : null;
        },
      }),
    }),
    findOneAndUpdate: async (query: Filter, update: Filter) => {
      const user = state.users.get(String(query.userId));
      if (!user || !matches(user, query)) return null;
      applyUpdate(user, update);
      return { ...user };
    },
    updateOne: async (query: Filter, update: Filter) => {
      const user = state.users.get(String(query.userId));
      if (!user) return { modifiedCount: 0 };
      if (
        (query.freeUsesCount as { $gt?: number } | undefined)?.$gt !== undefined &&
        user.freeUsesCount <= 0
      ) {
        return { modifiedCount: 0 };
      }
      if (!matches(user, query)) return { modifiedCount: 0 };
      applyUpdate(user, update);
      return { modifiedCount: 1 };
    },
  },
}));

mock.module("@/models/usage-ledger.models", () => ({
  UsageLedger: {
    create: async (doc: Omit<FakeLedger, "_id" | "status">) => {
      if (state.duplicateNextKey) {
        state.duplicateNextKey = false;
        const error = new Error("duplicate key") as Error & { code: number };
        error.code = 11000;
        throw error;
      }
      const _id = `ledger-${state.ledgers.length + 1}`;
      state.ledgers.push({ ...doc, _id, status: "reserved" });
      return { _id };
    },
    deleteOne: async ({ _id }: { _id: string }) => {
      state.ledgers = state.ledgers.filter((ledger) => ledger._id !== _id);
    },
    updateOne: async (
      { _id, status }: { _id: string; status: string },
      update: { $set: { status: FakeLedger["status"] } }
    ) => {
      const ledger = state.ledgers.find(
        (entry) => entry._id === _id && entry.status === status
      );
      if (ledger) ledger.status = update.$set.status;
    },
    findOneAndUpdate: async (
      { _id, status }: { _id: string; status: string },
      update: { $set: { status: FakeLedger["status"] } }
    ) => {
      const ledger = state.ledgers.find(
        (entry) => entry._id === _id && entry.status === status
      );
      if (!ledger) return null;
      ledger.status = update.$set.status;
      return { ...ledger };
    },
  },
}));

const {
  DuplicateRequestError,
  QuotaExceededError,
  QuotaUserMissingError,
  TrialExpiredError,
  refundQuota,
  reserveQuota,
  settleQuota,
} = await import("./quota");

beforeEach(() => {
  state.users.clear();
  state.ledgers = [];
  state.duplicateNextKey = false;
});

describe("reserveQuota · free trial", () => {
  it("charges a free user and records a ledger row", async () => {
    state.users.set("user-1", { plan: "FREE", freeUsesCount: 0 });

    const reservation = await reserveQuota({
      userId: "user-1",
      kind: "image",
    });

    expect(state.users.get("user-1")?.freeUsesCount).toBe(1);
    expect(reservation.counter).toBe("freeUsesCount");
    expect(reservation.ledgerId).toBeTruthy();
    expect(state.ledgers).toHaveLength(1);
  });

  it("records a ledger row even without an Idempotency-Key", async () => {
    state.users.set("user-1", { plan: "FREE", freeUsesCount: 0 });

    const reservation = await reserveQuota({
      userId: "user-1",
      kind: "background",
    });

    expect(reservation.ledgerId).toBe("ledger-1");
    expect(state.ledgers[0].idempotencyKey).toStartWith("auto:");
  });

  it("uses the caller-supplied Idempotency-Key", async () => {
    state.users.set("user-1", { plan: "FREE", freeUsesCount: 0 });

    await reserveQuota({
      userId: "user-1",
      kind: "image",
      idempotencyKey: "request-abc",
    });

    expect(state.ledgers[0].idempotencyKey).toBe("request-abc");
  });

  it("rejects a replayed Idempotency-Key", async () => {
    state.users.set("user-1", { plan: "FREE", freeUsesCount: 0 });
    state.duplicateNextKey = true;

    await expect(
      reserveQuota({
        userId: "user-1",
        kind: "image",
        idempotencyKey: "request-abc",
      })
    ).rejects.toBeInstanceOf(DuplicateRequestError);

    expect(state.users.get("user-1")?.freeUsesCount).toBe(0);
  });

  it("stops at the trial credit limit and removes the orphan ledger row", async () => {
    state.users.set("user-1", { plan: "FREE", freeUsesCount: 5 });

    await expect(
      reserveQuota({ userId: "user-1", kind: "image" })
    ).rejects.toBeInstanceOf(QuotaExceededError);

    expect(state.users.get("user-1")?.freeUsesCount).toBe(5);
    expect(state.ledgers).toHaveLength(0);
  });

  it("rejects generation after the trial window closes", async () => {
    state.users.set("user-1", {
      plan: "FREE",
      freeUsesCount: 0,
      trialEndsAt: new Date("2026-01-01T00:00:00.000Z"),
      createdAt: new Date("2025-12-25T00:00:00.000Z"),
    });

    await expect(
      reserveQuota({ userId: "user-1", kind: "image" })
    ).rejects.toBeInstanceOf(TrialExpiredError);

    expect(state.users.get("user-1")?.freeUsesCount).toBe(0);
    expect(state.ledgers).toHaveLength(0);
  });
});

describe("reserveQuota · paid plans", () => {
  it("spends one monthly credit", async () => {
    state.users.set("user-1", {
      plan: "BASIC",
      freeUsesCount: 5,
      credits: 10,
      creditsResetAt: new Date(Date.now() + 86_400_000),
    });

    const reservation = await reserveQuota({
      userId: "user-1",
      kind: "image",
    });

    expect(reservation.plan).toBe("BASIC");
    expect(reservation.counter).toBe("credits");
    expect(state.users.get("user-1")?.credits).toBe(9);
    expect(state.users.get("user-1")?.freeUsesCount).toBe(5);
    expect(state.ledgers).toHaveLength(1);
  });

  it("refills the allowance when the period has elapsed", async () => {
    state.users.set("user-1", {
      plan: "PRO",
      freeUsesCount: 0,
      credits: 0,
      creditsResetAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await reserveQuota({ userId: "user-1", kind: "conversation" });

    expect(state.users.get("user-1")?.credits).toBe(499);
    expect(state.users.get("user-1")?.creditsResetAt).toBeInstanceOf(Date);
  });

  it("rejects when paid credits are exhausted", async () => {
    state.users.set("user-1", {
      plan: "PRO",
      freeUsesCount: 0,
      credits: 0,
      creditsResetAt: new Date(Date.now() + 86_400_000),
    });

    await expect(
      reserveQuota({ userId: "user-1", kind: "image" })
    ).rejects.toBeInstanceOf(QuotaExceededError);

    expect(state.ledgers).toHaveLength(0);
  });

  it("fails when the user record is missing", async () => {
    await expect(
      reserveQuota({ userId: "ghost", kind: "image" })
    ).rejects.toBeInstanceOf(QuotaUserMissingError);
  });
});

describe("settleQuota / refundQuota", () => {
  it("settles the ledger without touching the counter", async () => {
    state.users.set("user-1", { plan: "FREE", freeUsesCount: 0 });
    const reservation = await reserveQuota({
      userId: "user-1",
      kind: "image",
    });

    await settleQuota(reservation);

    expect(state.ledgers[0].status).toBe("settled");
    expect(state.users.get("user-1")?.freeUsesCount).toBe(1);
  });

  it("refunds a failed free request exactly once", async () => {
    state.users.set("user-1", { plan: "FREE", freeUsesCount: 0 });
    const reservation = await reserveQuota({
      userId: "user-1",
      kind: "image",
    });

    await refundQuota(reservation);
    await refundQuota(reservation);

    expect(state.ledgers[0].status).toBe("refunded");
    expect(state.users.get("user-1")?.freeUsesCount).toBe(0);
  });

  it("returns a paid credit when the request fails", async () => {
    state.users.set("user-1", {
      plan: "BASIC",
      freeUsesCount: 0,
      credits: 5,
      creditsResetAt: new Date(Date.now() + 86_400_000),
    });
    const reservation = await reserveQuota({
      userId: "user-1",
      kind: "background",
    });

    await refundQuota(reservation);

    expect(state.users.get("user-1")?.credits).toBe(5);
    expect(state.ledgers[0].status).toBe("refunded");
  });
});
