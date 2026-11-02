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

  it("labels a higher paid plan as an upgrade handled by the API", () => {
    const action = planActionFor({
      ...base,
      planId: "PRO",
      currentPlan: "BASIC",
      isPaid: true,
    })

    expect(action).toEqual({
      kind: "change",
      label: "Upgrade to Pro",
      disabled: false,
    })
  })

  it("labels a lower paid plan as a switch handled by the API", () => {
    const action = planActionFor({
      ...base,
      planId: "BASIC",
      currentPlan: "PRO",
      isPaid: true,
    })

    expect(action).toEqual({
      kind: "change",
      label: "Switch to Basic",
      disabled: false,
    })
  })

  it("disables a plan change when the price is missing", () => {
    const action = planActionFor({
      planId: "PRO",
      currentPlan: "BASIC",
      isPaid: true,
      purchasable: false,
      canManageSubscription: true,
    })

    expect(action).toEqual({
      kind: "change",
      label: "Upgrade to Pro",
      disabled: true,
    })
  })

  it("buys a paid plan with Checkout when no subscription exists", () => {
    const action = planActionFor({
      planId: "PRO",
      currentPlan: "BASIC",
      isPaid: true,
      purchasable: true,
      canManageSubscription: false,
    })

    expect(action).toEqual({
      kind: "checkout",
      label: "Upgrade to Pro",
      disabled: false,
    })
  })

  it("keeps the Free downgrade in the portal when there is no subscription", () => {
    const action = planActionFor({
      planId: "FREE",
      currentPlan: "PRO",
      isPaid: true,
      purchasable: true,
      canManageSubscription: false,
    })

    if (action.kind !== "portal") throw new Error(`expected portal, got ${action.kind}`)
    expect(action.disabled).toBe(true)
    expect(action.hint).toMatch(/subscription/i)
  })
})
