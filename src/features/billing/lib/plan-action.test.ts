import { describe, expect, it } from "bun:test"

import { planActionFor } from "./plan-action"

const base = {
  purchasable: true,
  canManageSubscription: true,
}

describe("planActionFor", () => {
  it("marks the current plan without an action", () => {
    expect(
      planActionFor({
        ...base,
        planId: "BASIC",
        currentPlan: "BASIC",
        isPaid: true,
      })
    ).toEqual({ kind: "current", label: "Current plan" })
  })

  it("marks Free as the current plan for a free user", () => {
    expect(
      planActionFor({
        ...base,
        planId: "FREE",
        currentPlan: "FREE",
        isPaid: false,
      })
    ).toEqual({ kind: "current", label: "Current plan" })
  })

  it("offers checkout for a free user", () => {
    expect(
      planActionFor({
        ...base,
        planId: "PRO",
        currentPlan: "FREE",
        isPaid: false,
      })
    ).toEqual({ kind: "checkout", label: "Choose Pro", disabled: false })
  })

  it("disables checkout when the price is missing", () => {
    const action = planActionFor({
      planId: "BASIC",
      currentPlan: "FREE",
      isPaid: false,
      purchasable: false,
      canManageSubscription: false,
    })

    expect(action).toEqual({
      kind: "checkout",
      label: "Not available yet",
      disabled: true,
    })
  })

  it("routes a subscriber's downgrade to Free through the portal", () => {
    expect(
      planActionFor({
        ...base,
        planId: "FREE",
        currentPlan: "PRO",
        isPaid: true,
      })
    ).toEqual({
      kind: "portal",
      label: "Downgrade to Free",
      disabled: false,
      hint: null,
    })
  })

  it("labels a higher paid plan as an upgrade", () => {
    const action = planActionFor({
      ...base,
      planId: "PRO",
      currentPlan: "BASIC",
      isPaid: true,
    })

    expect(action.kind).toBe("portal")
    expect(action.label).toBe("Upgrade to Pro")
  })

  it("labels a lower paid plan as a switch", () => {
    const action = planActionFor({
      ...base,
      planId: "BASIC",
      currentPlan: "PRO",
      isPaid: true,
    })

    expect(action.kind).toBe("portal")
    expect(action.label).toBe("Switch to Basic")
  })

  it("explains why plan changes are unavailable without a subscription", () => {
    const action = planActionFor({
      planId: "PRO",
      currentPlan: "BASIC",
      isPaid: true,
      purchasable: true,
      canManageSubscription: false,
    })

    if (action.kind !== "portal") throw new Error(`expected portal, got ${action.kind}`)
    expect(action.disabled).toBe(true)
    expect(action.hint).toMatch(/subscription/i)
  })
})
