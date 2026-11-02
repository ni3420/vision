import { describe, expect, it } from "bun:test"

import { entitlementsFor, trialEndFor } from "./entitlements"
import {
  FREE_TRIAL_CREDITS,
  normalizePlan,
  planDefinition,
  planPriceLabel,
  PLANS,
  isPaidPlan,
} from "./plans"

const NOW = new Date("2026-11-02T12:00:00.000Z")

describe("plan catalog", () => {
  it("exposes free, basic, and pro", () => {
    expect(Object.keys(PLANS)).toEqual(["FREE", "BASIC", "PRO"])
    expect(PLANS.BASIC.monthlyCredits).toBe(100)
    expect(PLANS.PRO.monthlyCredits).toBe(500)
  })

  it("normalizes unknown plans to FREE", () => {
    expect(normalizePlan("PRO")).toBe("PRO")
    expect(normalizePlan("BASIC")).toBe("BASIC")
    expect(normalizePlan("enterprise")).toBe("FREE")
    expect(normalizePlan(null)).toBe("FREE")
  })

  it("knows which plans are paid", () => {
    expect(isPaidPlan("BASIC")).toBe(true)
    expect(isPaidPlan("PRO")).toBe(true)
    expect(isPaidPlan("FREE")).toBe(false)
  })

  it("formats plan prices", () => {
    expect(planPriceLabel("FREE")).toBe("$0")
    expect(planPriceLabel("BASIC")).toBe(`$${PLANS.BASIC.priceMonthlyUsd} / month`)
    expect(planDefinition(undefined).id).toBe("FREE")
  })
})

describe("free trial entitlements", () => {
  it("derives the trial end from createdAt when not stored", () => {
    const end = trialEndFor({
      plan: "FREE",
      createdAt: "2026-11-01T12:00:00.000Z",
    })

    expect(end?.toISOString()).toBe("2026-11-08T12:00:00.000Z")
  })

  it("counts remaining free credits inside the trial", () => {
    const entitlements = entitlementsFor(
      {
        plan: "FREE",
        freeUsesCount: 2,
        trialEndsAt: "2026-11-09T12:00:00.000Z",
      },
      NOW
    )

    expect(entitlements.limit).toBe(FREE_TRIAL_CREDITS)
    expect(entitlements.remaining).toBe(FREE_TRIAL_CREDITS - 2)
    expect(entitlements.trialExpired).toBe(false)
    expect(entitlements.trialDaysLeft).toBe(7)
    expect(entitlements.canGenerate).toBe(true)
  })

  it("blocks generation once the trial window has passed", () => {
    const entitlements = entitlementsFor(
      {
        plan: "FREE",
        freeUsesCount: 1,
        trialEndsAt: "2026-11-01T12:00:00.000Z",
      },
      NOW
    )

    expect(entitlements.trialExpired).toBe(true)
    expect(entitlements.trialDaysLeft).toBe(0)
    expect(entitlements.remaining).toBe(FREE_TRIAL_CREDITS - 1)
    expect(entitlements.canGenerate).toBe(false)
  })

  it("blocks generation when the trial credits are spent", () => {
    const entitlements = entitlementsFor(
      {
        plan: "FREE",
        freeUsesCount: FREE_TRIAL_CREDITS,
        trialEndsAt: "2026-11-09T12:00:00.000Z",
      },
      NOW
    )

    expect(entitlements.remaining).toBe(0)
    expect(entitlements.canGenerate).toBe(false)
  })
})

describe("paid plan entitlements", () => {
  it("reports monthly credits", () => {
    const entitlements = entitlementsFor(
      {
        plan: "BASIC",
        credits: 42,
        creditsResetAt: "2026-12-02T12:00:00.000Z",
      },
      NOW
    )

    expect(entitlements.isPaid).toBe(true)
    expect(entitlements.isTrial).toBe(false)
    expect(entitlements.limit).toBe(100)
    expect(entitlements.remaining).toBe(42)
    expect(entitlements.used).toBe(58)
    expect(entitlements.canGenerate).toBe(true)
  })

  it("shows a fresh allowance once the reset date passes", () => {
    const entitlements = entitlementsFor(
      {
        plan: "PRO",
        credits: 0,
        creditsResetAt: "2026-11-01T12:00:00.000Z",
      },
      NOW
    )

    expect(entitlements.remaining).toBe(500)
    expect(entitlements.used).toBe(0)
    expect(entitlements.canGenerate).toBe(true)
  })

  it("blocks generation when paid credits are exhausted", () => {
    const entitlements = entitlementsFor(
      {
        plan: "PRO",
        credits: 0,
        creditsResetAt: "2026-12-02T12:00:00.000Z",
      },
      NOW
    )

    expect(entitlements.remaining).toBe(0)
    expect(entitlements.canGenerate).toBe(false)
  })

  it("ignores trial fields for paid plans", () => {
    const entitlements = entitlementsFor(
      {
        plan: "BASIC",
        credits: 5,
        trialEndsAt: "2020-01-01T00:00:00.000Z",
      },
      NOW
    )

    expect(entitlements.trialExpired).toBe(false)
    expect(entitlements.trialEndsAt).toBeNull()
  })
})
