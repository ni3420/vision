import { PLANS, type PlanId } from "@/lib/plans"

export type PlanAction =
  | { kind: "current"; label: string }
  | { kind: "checkout"; label: string; disabled: boolean }
  | { kind: "change"; label: string; disabled: boolean }
  | {
      kind: "portal"
      label: string
      disabled: boolean
      hint: string | null
    }

interface PlanActionInput {
  planId: PlanId
  currentPlan: PlanId
  isPaid: boolean
  purchasable: boolean
  canManageSubscription: boolean
}

const NO_SUBSCRIPTION_HINT =
  "Plan changes need an active Stripe subscription."

/**
 * Existing subscribers switch paid plans through the Stripe API so upgrades
 * work even though the default Billing Portal config disables plan changes.
 * Cancelling (moving to Free) still goes through the portal.
 */
export function planActionFor({
  planId,
  currentPlan,
  isPaid,
  purchasable,
  canManageSubscription,
}: PlanActionInput): PlanAction {
  if (planId === currentPlan) {
    return { kind: "current", label: "Current plan" }
  }

  const plan = PLANS[planId]

  if (!isPaid) {
    return {
      kind: "checkout",
      label: purchasable ? `Choose ${plan.name}` : "Not available yet",
      disabled: !purchasable,
    }
  }

  const label =
    planId === "FREE"
      ? "Downgrade to Free"
      : plan.priceMonthlyUsd > PLANS[currentPlan].priceMonthlyUsd
        ? `Upgrade to ${plan.name}`
        : `Switch to ${plan.name}`

  if (planId === "FREE") {
    return {
      kind: "portal",
      label,
      disabled: !canManageSubscription,
      hint: canManageSubscription ? null : NO_SUBSCRIPTION_HINT,
    }
  }

  if (canManageSubscription) {
    return { kind: "change", label, disabled: !purchasable }
  }

  // A paid plan without a Stripe subscription (manual grant) has nothing to
  // update, so the paid plan is bought with a fresh Checkout instead.
  return { kind: "checkout", label, disabled: !purchasable }
}
