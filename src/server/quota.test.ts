import { beforeEach, describe, expect, it, mock } from "bun:test";

interface FakeUser {
  plan?: string;
  freeUsesCount: number;
}

interface FakeLedger {
  _id: string;
  userId: string;
  kind: string;
  status: "reserved" | "settled" | "refunded";
  idempotencyKey: string;
}

const state = {
  users: new Map<string, FakeUser>(),
  ledgers: [] as FakeLedger[],
  duplicateNextKey: false,
};

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
    findOneAndUpdate: async (
      query: { userId: string },
      update: { $inc: { freeUsesCount: number } }
    ) => {
      const user = state.users.get(query.userId);
      if (!user || user.plan === "PRO" || user.freeUsesCount >= 5) return null;
      user.freeUsesCount += update.$inc.freeUsesCount;
      return { ...user };
    },
    updateOne: async (
      query: { userId: string },
      update: { $inc: { freeUsesCount: number } }
    ) => {
      const user = state.users.get(query.userId);
      if (!user || user.freeUsesCount <= 0) return { modifiedCount: 0 };
      user.freeUsesCount += update.$inc.freeUsesCount;
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
  FREE_GENERATION_LIMIT,
  refundQuota,
  reserveQuota,
  settleQuota,
} = await import("./quota");

beforeEach(() => {
  state.users.clear();
  state.ledgers = [];
  state.duplicateNextKey = false;
});

describe("reserveQuota", () => {
  it("charges a free user and records a ledger row", async () => {
    state.users.set("user-1", { plan: "FREE", freeUsesCount: 0 });

    const reservation = await reserveQuota({
      userId: "user-1",
      kind: "image",
    });

    expect(state.users.get("user-1")?.freeUsesCount).toBe(1);
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

  it("stops at the free limit and removes the orphan ledger row", async () => {
    state.users.set("user-1", {
      plan: "FREE",
      freeUsesCount: FREE_GENERATION_LIMIT,
    });

    await expect(
      reserveQuota({ userId: "user-1", kind: "image" })
    ).rejects.toBeInstanceOf(QuotaExceededError);

    expect(state.users.get("user-1")?.freeUsesCount).toBe(FREE_GENERATION_LIMIT);
    expect(state.ledgers).toHaveLength(0);
  });

  it("does not charge PRO users and returns no ledger", async () => {
    state.users.set("user-1", { plan: "PRO", freeUsesCount: 4 });

    const reservation = await reserveQuota({
      userId: "user-1",
      kind: "image",
    });

    expect(reservation.ledgerId).toBeNull();
    expect(state.users.get("user-1")?.freeUsesCount).toBe(4);
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

  it("refunds a failed request exactly once", async () => {
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
});
